
import React, { useState, useEffect } from 'react';
import { Habit } from '../types';
import { storageService } from '../services/storageService';
import { FlameIcon, PulseIcon, ChevronRightIcon, PlusIcon } from './icons';
import BreathingExercise from './BreathingExercise';

// Mock data for heatmap as we don't have real historical data in this MVP version
const generateMockHistory = (habitId: string) => {
    const days = 90;
    const history = [];
    const now = new Date();
    for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(now.getDate() - (days - 1 - i));
        // Random completion based on habitId hashish logic
        const isCompleted = (habitId.charCodeAt(0) + i) % 3 === 0; 
        history.push({ date: date.toISOString().split('T')[0], value: isCompleted ? 1 : 0 });
    }
    return history;
}

const Heatmap: React.FC<{ history: { date: string; value: number }[] }> = ({ history }) => {
    return (
        <div className="flex gap-1 flex-wrap justify-end max-w-full overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
            {history.map((day, i) => (
                <div 
                    key={i} 
                    className={`w-3 h-3 rounded-sm transition-colors ${day.value > 0 ? 'bg-accent shadow-glow-electric' : 'bg-surface2'}`}
                    title={`${day.date}: ${day.value > 0 ? 'Выполнено' : 'Пропуск'}`}
                />
            ))}
        </div>
    )
}

const PracticeCard: React.FC<{ title: string; duration: string; desc: string; onClick: () => void }> = ({ title, duration, desc, onClick }) => (
    <button onClick={onClick} className="text-left p-4 bg-surface rounded-lg border border-border hover:border-primary/50 transition-all group flex flex-col h-full">
        <div className="flex justify-between items-start mb-2">
            <h4 className="font-serif text-lg text-text group-hover:text-primary transition-colors">{title}</h4>
            <span className="text-xs font-mono bg-surface2 px-2 py-1 rounded-pill text-text-muted">{duration}</span>
        </div>
        <p className="text-sm text-text-muted leading-relaxed flex-grow">{desc}</p>
        <div className="mt-4 flex items-center text-xs font-bold text-accent uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
            Начать практику <ChevronRightIcon className="w-4 h-4 ml-1" />
        </div>
    </button>
);

const BeaconView: React.FC = () => {
    const [habits, setHabits] = useState<Habit[]>([]);
    const [newHabit, setNewHabit] = useState('');
    const [showBreathing, setShowBreathing] = useState(false);

    useEffect(() => {
        setHabits(storageService.getHabits());
    }, []);

    const handleToggle = (id: string) => {
        const updated = habits.map(h => {
            if (h.id === id) {
                return { ...h, completedToday: !h.completedToday, streak: !h.completedToday ? h.streak + 1 : Math.max(0, h.streak - 1) };
            }
            return h;
        });
        setHabits(updated);
        storageService.saveHabits(updated);
    };

    const handleAddHabit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newHabit.trim()) return;
        const habit: Habit = {
            id: `habit-${Date.now()}`,
            title: newHabit,
            streak: 0,
            completedToday: false,
            ritualTag: 'DELTA'
        };
        const updated = [...habits, habit];
        setHabits(updated);
        storageService.saveHabits(updated);
        setNewHabit('');
    };

    return (
        <div className="flex flex-col h-full p-4 sm:p-6 overflow-y-auto pb-24 lg:pb-6">
            <header className="shrink-0 text-center mb-8">
                <h2 className="font-serif text-2xl md:text-3xl text-text">Маяк Внимания</h2>
                <p className="text-text-muted mt-2">Практики осознанности и карта привычек</p>
            </header>

            <div className="max-w-4xl mx-auto w-full space-y-10 animate-fade-in">
                
                {/* Habits Section */}
                <section>
                     <div className="flex justify-between items-center mb-4">
                        <h3 className="font-serif text-xl text-text flex items-center gap-2">
                            <FlameIcon className="w-5 h-5 text-primary" />
                            Огни Привычек
                        </h3>
                    </div>
                    
                    <div className="space-y-4">
                        {habits.map(habit => (
                            <div key={habit.id} className="card p-4 flex flex-col gap-4">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <button 
                                            onClick={() => handleToggle(habit.id)}
                                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${habit.completedToday ? 'bg-primary border-primary text-black' : 'border-text-muted hover:border-primary'}`}
                                        >
                                            {habit.completedToday && <span className="text-xs font-bold">✓</span>}
                                        </button>
                                        <span className={`font-medium ${habit.completedToday ? 'text-text-muted line-through' : 'text-text'}`}>{habit.title}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-sm font-mono text-primary">
                                        <FlameIcon className="w-4 h-4" />
                                        {habit.streak} дн.
                                    </div>
                                </div>
                                {/* Mock heatmap for visual fidelity */}
                                <Heatmap history={generateMockHistory(habit.id)} />
                            </div>
                        ))}

                         <form onSubmit={handleAddHabit} className="flex gap-2">
                            <input 
                                type="text" 
                                value={newHabit} 
                                onChange={e => setNewHabit(e.target.value)}
                                placeholder="Новая привычка..." 
                                className="flex-grow bg-surface border border-border rounded-lg px-4 py-2 text-text focus:border-primary/50 focus:outline-none"
                            />
                            <button type="submit" disabled={!newHabit.trim()} className="button-primary !py-2 !px-4">
                                <PlusIcon className="w-5 h-5" />
                            </button>
                        </form>
                    </div>
                </section>

                {/* Micro-practices Section */}
                <section>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-serif text-xl text-text flex items-center gap-2">
                            <PulseIcon className="w-5 h-5 text-accent" />
                            Практики
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <PracticeCard 
                            title="Дыхание 4-7-8" 
                            duration="3 мин" 
                            desc="Успокоение нервной системы через контроль ритма дыхания. Идеально перед сном."
                            onClick={() => setShowBreathing(true)}
                        />
                         <PracticeCard 
                            title="Сброс Напряжения" 
                            duration="1 мин" 
                            desc="Быстрое сканирование тела. Сжать кулаки на вдохе, резко расслабить на выдохе."
                            onClick={() => alert("Инструкция: Вдохни глубоко, сожми всё тело. Держи 3 сек. Выдохни со звуком 'Ха!'.")}
                        />
                         <PracticeCard 
                            title="Называние" 
                            duration="5 мин" 
                            desc="Назови 5 вещей, которые видишь, 4 которые слышишь, 3 которые ощущаешь."
                            onClick={() => alert("Техника заземления 5-4-3-2-1.")}
                        />
                         <PracticeCard 
                            title="Вопрос к Тени" 
                            duration="∞" 
                            desc="Спроси себя: 'Чего я сейчас избегаю?' и не отвечай сразу. Просто держи вопрос."
                            onClick={() => alert("Запиши ответ в Дневник.")}
                        />
                    </div>
                </section>

            </div>
            {showBreathing && <BreathingExercise onClose={() => setShowBreathing(false)} />}
        </div>
    );
};

export default BeaconView;
