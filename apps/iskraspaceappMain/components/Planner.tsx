
import React, { useState, useEffect, useRef } from 'react';
import { IskraAIService } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { soundService } from '../services/soundService';
import { Task, RitualTag } from '../types';
import Loader from './Loader';
import { FlameIcon, DropletsIcon, SunIcon, ScaleIcon, TriangleIcon, TrashIcon, ListTodoIcon, ClockIcon, GripVerticalIcon } from './icons';

const service = new IskraAIService();

const ritualIcons: Record<RitualTag, React.FC<React.SVGProps<SVGSVGElement>>> = {
    FIRE: FlameIcon,
    WATER: DropletsIcon,
    SUN: SunIcon,
    BALANCE: ScaleIcon,
    DELTA: TriangleIcon,
};

const ritualColors: Record<RitualTag, string> = {
    FIRE: 'text-danger',
    WATER: 'text-blue-400', 
    SUN: 'text-warning',
    BALANCE: 'text-success',
    DELTA: 'text-accent',
};

const priorityColors = {
    high: 'bg-danger',
    medium: 'bg-warning',
    low: 'bg-success'
};

// Simple bar chart component for task distribution
const StatsView: React.FC<{ tasks: Task[] }> = ({ tasks }) => {
    const totalTasks = tasks.length;
    const counts = tasks.reduce((acc, task) => {
        acc[task.ritualTag] = (acc[task.ritualTag] || 0) + 1;
        return acc;
    }, {} as Record<RitualTag, number>);

    const completedCount = tasks.filter(t => t.done).length;
    const completionRate = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

    return (
        <div className="flex flex-col gap-8 animate-fade-in max-w-2xl mx-auto w-full pt-4">
            <div className="card flex justify-around items-center py-6">
                 <div className="text-center">
                    <p className="text-sm text-text-muted uppercase tracking-wider">Всего Задач</p>
                    <p className="text-4xl font-serif font-bold text-text mt-1">{totalTasks}</p>
                 </div>
                 <div className="text-center">
                    <p className="text-sm text-text-muted uppercase tracking-wider">Завершено</p>
                    <p className="text-4xl font-serif font-bold text-success mt-1">{completionRate}%</p>
                 </div>
            </div>

            <div className="card">
                <h3 className="font-serif text-xl text-text mb-6">Распределение по Ритмам</h3>
                <div className="space-y-4">
                    {(Object.keys(ritualIcons) as RitualTag[]).map(tag => {
                        const count = counts[tag] || 0;
                        const percentage = totalTasks > 0 ? (count / totalTasks) * 100 : 0;
                        const Icon = ritualIcons[tag];
                        const color = ritualColors[tag];
                        const bgClass = color.replace('text-', 'bg-');

                        return (
                            <div key={tag} className="flex items-center gap-4">
                                <Icon className={`w-6 h-6 ${color} flex-shrink-0`} />
                                <div className="flex-grow">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-text-muted font-medium">{tag}</span>
                                        <span className="text-text font-mono">{count}</span>
                                    </div>
                                    <div className="h-2 w-full bg-surface2 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full ${bgClass} transition-all duration-1000`} 
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

const CalendarView: React.FC<{ tasks: Task[] }> = ({ tasks }) => {
    const daysInMonth = 30; // Simulating a standard month for MVP
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const today = new Date().getDate();

    const getTasksForDay = (day: number) => {
        return tasks.filter(t => {
             if (t.date) {
                 return new Date(t.date).getDate() === day;
             }
             return (t.id.charCodeAt(t.id.length - 1) % daysInMonth) + 1 === day;
        });
    };

    return (
        <div className="grid grid-cols-7 gap-2 animate-fade-in pb-24 lg:pb-0">
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => (
                <div key={d} className="text-center text-xs text-text-muted font-semibold py-2">{d}</div>
            ))}
            {days.map(day => {
                const dayTasks = getTasksForDay(day);
                const isToday = day === today;
                return (
                    <div key={day} className={`min-h-[80px] p-2 rounded-lg border flex flex-col gap-1 ${isToday ? 'bg-primary/10 border-primary' : 'bg-surface border-border'}`}>
                        <span className={`text-xs font-mono ${isToday ? 'text-primary font-bold' : 'text-text-muted'}`}>{day}</span>
                        <div className="flex flex-wrap gap-1">
                            {dayTasks.slice(0, 4).map((t, i) => {
                                const colorClass = ritualColors[t.ritualTag].replace('text-', 'bg-');
                                return (
                                    <div key={i} className={`w-2 h-2 rounded-full ${colorClass}`} title={t.title} />
                                );
                            })}
                            {dayTasks.length > 4 && <span className="text-[10px] text-text-muted leading-none">+</span>}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const Planner: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [newDuration, setNewDuration] = useState<string>('');
    const [newDate, setNewDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [filterTag, setFilterTag] = useState<RitualTag | 'ALL'>('ALL');
    const [sortBy, setSortBy] = useState<'DEFAULT' | 'DATE' | 'PRIORITY'>('DEFAULT');
    
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [view, setView] = useState<'LIST' | 'CALENDAR' | 'STATS'>('LIST');

    // Drag & Drop Refs
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    useEffect(() => {
        const loadTasks = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const storedTasks = storageService.getTasks();
                if (storedTasks.length > 0) {
                    setTasks(storedTasks);
                } else {
                    const plan = await service.getPlanTop3();
                    const initialTasks: Task[] = plan.tasks.map(t => ({
                        ...t,
                        id: `iskra-${Date.now()}-${Math.random()}`,
                        done: false,
                        date: new Date().toISOString(), // Default to today
                        priority: 'medium'
                    }));
                    setTasks(initialTasks);
                }
            } catch (e) {
                const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
                setError(`Failed to generate a plan: ${errorMessage}`);
            } finally {
                setIsLoading(false);
            }
        };
        loadTasks();
    }, []);

    useEffect(() => {
        if (!isLoading) {
            storageService.saveTasks(tasks);
        }
    }, [tasks, isLoading]);


    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;
        const newTask: Task = {
            id: `user-${Date.now()}`,
            title: newTaskTitle,
            ritualTag: 'DELTA',
            done: false,
            date: newDate || new Date().toISOString(),
            priority: newPriority,
            duration: newDuration ? parseInt(newDuration) : undefined
        };
        setTasks(prevTasks => [newTask, ...prevTasks]);
        setNewTaskTitle('');
        setNewDuration('');
        setNewPriority('medium');
        setNewDate(new Date().toISOString().split('T')[0]);
        soundService.playClick();
    };

    const handleToggleTask = (id: string) => {
        const task = tasks.find(t => t.id === id);
        if (task && !task.done) {
            soundService.playTone(600, 'sine', 0.1); // Completion sound
        } else {
            soundService.playClick();
        }

        setTasks(prevTasks =>
            prevTasks.map(task =>
                task.id === id ? { ...task, done: !task.done } : task
            )
        );
    };

    const handleDeleteTask = (id: string) => {
        setTasks(prevTasks => prevTasks.filter(task => task.id !== id));
        soundService.playClick();
    };

    // Drag and Drop Handlers
    const handleDragStart = (e: React.DragEvent, position: number) => {
        dragItem.current = position;
        e.dataTransfer.effectAllowed = 'move';
        // Add a ghost class or style if needed
    };

    const handleDragEnter = (e: React.DragEvent, position: number) => {
        dragOverItem.current = position;
    };

    const handleDragEnd = () => {
        if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) {
            dragItem.current = null;
            dragOverItem.current = null;
            return;
        }

        const _tasks = [...tasks];
        const draggedTaskContent = _tasks[dragItem.current];
        _tasks.splice(dragItem.current, 1);
        _tasks.splice(dragOverItem.current, 0, draggedTaskContent);

        setTasks(_tasks);
        dragItem.current = null;
        dragOverItem.current = null;
        soundService.playHover(); // Subtle sound on reorder
    };

    const renderTaskItem = (task: Task, index: number) => {
        const Icon = ritualIcons[task.ritualTag];
        const color = ritualColors[task.ritualTag];
        const priorityColor = priorityColors[task.priority || 'medium'];

        return (
            <li 
                key={task.id} 
                draggable={filterTag === 'ALL' && sortBy === 'DEFAULT'} // Only draggable when not filtered/sorted
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnter={(e) => handleDragEnter(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center justify-between p-3 bg-surface rounded-lg animate-fade-in group border border-transparent hover:border-white/5 relative transition-all ${filterTag === 'ALL' && sortBy === 'DEFAULT' ? 'cursor-grab active:cursor-grabbing' : ''}`}
            >
                <div className="flex items-center space-x-4 flex-grow overflow-hidden">
                     {filterTag === 'ALL' && sortBy === 'DEFAULT' && (
                         <div className="text-text-muted/20 group-hover:text-text-muted transition-colors">
                             <GripVerticalIcon className="w-4 h-4" />
                         </div>
                     )}
                     <button
                        onClick={() => handleToggleTask(task.id)}
                        className={`w-6 h-6 flex-shrink-0 rounded-md border-2 flex items-center justify-center transition-all duration-300 ${
                            task.done ? 'bg-accent border-accent scale-90' : 'border-border group-hover:border-accent'
                        }`}
                        aria-label={task.done ? 'Mark as not done' : 'Mark as done'}
                    >
                        {task.done && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                    </button>
                    
                    <div className={`flex flex-col flex-grow transition-opacity duration-300 overflow-hidden ${task.done ? 'opacity-50' : 'opacity-100'}`}>
                        <div className="flex items-center gap-2 min-w-0">
                            <span className={`text-base truncate ${task.done ? 'line-through text-text-muted' : 'text-text'}`}>{task.title}</span>
                            <div className={`w-2 h-2 shrink-0 rounded-full ${priorityColor}`} title={`Priority: ${task.priority || 'medium'}`} />
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                             <div className="flex items-center gap-1 text-[10px] text-text-muted font-mono uppercase tracking-wide">
                                <Icon className={`w-3 h-3 ${color}`} />
                                <span>{task.ritualTag}</span>
                             </div>
                             {task.duration && (
                                 <div className="flex items-center gap-1 text-[10px] text-text-muted font-mono bg-white/5 px-1.5 py-0.5 rounded">
                                     <ClockIcon className="w-3 h-3" />
                                     <span>{task.duration}m</span>
                                 </div>
                             )}
                             {task.date && (
                                 <span className="text-[10px] text-text-muted font-mono">
                                     {new Date(task.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                 </span>
                             )}
                        </div>
                    </div>
                </div>
                 <button 
                    onClick={() => handleDeleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger transition-opacity p-2 ml-2 shrink-0"
                    aria-label="Delete task"
                >
                    <TrashIcon className="w-5 h-5" />
                </button>
            </li>
        )
    }

    const getFilteredAndSortedTasks = () => {
        let filtered = tasks.filter(t => filterTag === 'ALL' || t.ritualTag === filterTag);
        
        if (sortBy === 'DATE') {
            filtered.sort((a, b) => {
                const dateA = a.date ? new Date(a.date).getTime() : 0;
                const dateB = b.date ? new Date(b.date).getTime() : 0;
                return dateA - dateB; // Ascending (earliest first)
            });
        } else if (sortBy === 'PRIORITY') {
            const priorityMap = { high: 3, medium: 2, low: 1 };
            filtered.sort((a, b) => {
                const pA = priorityMap[a.priority || 'medium'];
                const pB = priorityMap[b.priority || 'medium'];
                return pB - pA; // Descending (high first)
            });
        }
        
        return filtered;
    };

    const displayedTasks = getFilteredAndSortedTasks();

    return (
        <div className="flex flex-col h-full p-4 sm:p-6 overflow-hidden">
            <header className="flex flex-col gap-4 mb-6 shrink-0">
                <div className="flex justify-between items-center">
                    <h2 className="font-serif text-2xl md:text-3xl text-text">Планировщик</h2>
                    <div className="flex bg-surface rounded-lg p-1 border border-border">
                        <button 
                            onClick={() => setView('LIST')}
                            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${view === 'LIST' ? 'bg-surface2 text-accent shadow-sm' : 'text-text-muted hover:text-text'}`}
                        >
                            Список
                        </button>
                        <button 
                            onClick={() => setView('CALENDAR')}
                            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${view === 'CALENDAR' ? 'bg-surface2 text-accent shadow-sm' : 'text-text-muted hover:text-text'}`}
                        >
                            Календарь
                        </button>
                        <button 
                            onClick={() => setView('STATS')}
                            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${view === 'STATS' ? 'bg-surface2 text-accent shadow-sm' : 'text-text-muted hover:text-text'}`}
                        >
                            Анализ
                        </button>
                    </div>
                </div>

                {/* Filter & Sort Bar */}
                {view === 'LIST' && (
                    <div className="flex flex-col gap-2">
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            <button 
                                onClick={() => setFilterTag('ALL')}
                                className={`px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap transition-colors ${
                                    filterTag === 'ALL' ? 'bg-white text-black border-white' : 'bg-transparent border-white/10 text-text-muted hover:border-white/30'
                                }`}
                            >
                                Все
                            </button>
                            {(Object.keys(ritualIcons) as RitualTag[]).map(tag => {
                                const color = ritualColors[tag];
                                return (
                                    <button
                                        key={tag}
                                        onClick={() => setFilterTag(tag)}
                                        className={`px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap transition-colors ${
                                            filterTag === tag 
                                            ? `bg-surface2 ${color} border-white/20` 
                                            : 'bg-transparent border-white/10 text-text-muted hover:border-white/30'
                                        }`}
                                    >
                                        {tag}
                                    </button>
                                )
                            })}
                        </div>
                        <div className="flex gap-2 items-center text-xs text-text-muted">
                            <span>Сортировка:</span>
                            <select 
                                value={sortBy} 
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="bg-surface border border-white/10 rounded px-2 py-1 focus:outline-none focus:border-accent/50"
                            >
                                <option value="DEFAULT">По умолчанию</option>
                                <option value="DATE">По дате (сначала старые)</option>
                                <option value="PRIORITY">По важности (сначала High)</option>
                            </select>
                        </div>
                    </div>
                )}
            </header>
            
            {view === 'LIST' && (
                <form onSubmit={handleAddTask} className="mb-6 shrink-0 bg-surface p-2 rounded-xl border border-border">
                    <div className="flex gap-2 mb-2">
                        <input
                            type="text"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            placeholder="Новое намерение..."
                            className="flex-grow bg-bg rounded-lg px-3 py-2 text-text focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors placeholder:text-text-muted/50"
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <select 
                            value={newPriority}
                            onChange={(e) => setNewPriority(e.target.value as any)}
                            className="bg-bg text-text-muted text-xs rounded-lg px-2 py-2 border border-white/5 focus:outline-none"
                        >
                            <option value="low">Low</option>
                            <option value="medium">Med</option>
                            <option value="high">High</option>
                        </select>
                        
                        <input 
                            type="date"
                            value={newDate}
                            onChange={(e) => setNewDate(e.target.value)}
                            className="bg-bg text-text-muted text-xs rounded-lg px-2 py-2 border border-white/5 focus:outline-none font-mono"
                        />

                        <div className="flex items-center bg-bg rounded-lg px-2 py-1 border border-white/5 h-[34px]">
                            <ClockIcon className="w-3 h-3 text-text-muted mr-1" />
                            <input 
                                type="number"
                                value={newDuration}
                                onChange={(e) => setNewDuration(e.target.value)}
                                placeholder="Min"
                                className="w-10 bg-transparent text-xs text-text focus:outline-none placeholder:text-text-muted/30"
                            />
                        </div>
                        <div className="flex-grow" />
                        <button
                            type="submit"
                            className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-black transition-colors hover:bg-primary/80 disabled:cursor-not-allowed disabled:bg-primary/50"
                            disabled={!newTaskTitle.trim()}
                        >
                            Добавить
                        </button>
                    </div>
                </form>
            )}
            
            <div className="flex-grow overflow-y-auto pr-2 -mr-2">
                {isLoading && (
                    <div className="flex flex-col items-center justify-center h-full">
                        <Loader />
                        <p className="mt-4 text-accent">Искра готовит ваши точки фокуса...</p>
                    </div>
                )}

                {error && (
                    <div className="m-auto text-center p-4 rounded-lg bg-danger/20">
                        <p className="text-danger">{error}</p>
                    </div>
                )}
                
                {!isLoading && !error && (
                    <>
                        {view === 'LIST' && (
                            <ul className="space-y-3 pb-24 lg:pb-20">
                                {displayedTasks.filter(t => !t.done).map((task, index) => renderTaskItem(task, index))}
                                
                                {displayedTasks.filter(t => t.done).length > 0 && (
                                    <li className="pt-6 mt-6 border-t border-border">
                                        <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-4">Завершено</h3>
                                        <ul className="space-y-3">
                                            {displayedTasks.filter(t => t.done).map((task, index) => renderTaskItem(task, index))}
                                        </ul>
                                    </li>
                                )}
                                
                                {displayedTasks.length === 0 && (
                                    <div className="text-center py-10">
                                        <p className="text-text-muted">Список пуст.</p>
                                    </div>
                                )}
                            </ul>
                        )}
                        {view === 'CALENDAR' && <CalendarView tasks={tasks} />}
                        {view === 'STATS' && <StatsView tasks={tasks} />}
                    </>
                )}
            </div>
        </div>
    );
};

export default Planner;
