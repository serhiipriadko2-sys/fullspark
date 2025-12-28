
import React, { useState, useEffect } from 'react';
import { IskraAIService } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { JournalPrompt, JournalEntry } from '../types';
import Loader from './Loader';
import { SparkleIcon, XIcon, ChevronRightIcon, Undo2Icon } from './icons';

const service = new IskraAIService();

// Range Slider Component
const MetricSlider: React.FC<{ label: string; value: number; onChange: (v: number) => void; icon: string; colorClass: string }> = ({ label, value, onChange, icon, colorClass }) => (
    <div className="flex flex-col gap-1">
        <div className="flex justify-between text-xs text-text-muted">
            <span className="flex items-center gap-1">{icon} {label}</span>
            <span className="font-mono">{value}%</span>
        </div>
        <input 
            type="range" 
            min="0" 
            max="100" 
            value={value} 
            onChange={(e) => onChange(parseInt(e.target.value))}
            className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-surface2 accent-${colorClass.split('-')[1]}`}
            style={{ accentColor: colorClass === 'text-accent' ? '#4DA3FF' : '#FF7A00' }}
        />
    </div>
);

const Journal: React.FC = () => {
    const [prompt, setPrompt] = useState<JournalPrompt | null>(null);
    const [entryText, setEntryText] = useState('');
    const [savedEntries, setSavedEntries] = useState<JournalEntry[]>([]);
    const [viewingEntry, setViewingEntry] = useState<JournalEntry | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isPromptLoading, setIsPromptLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // User Metrics State
    const [mood, setMood] = useState(50);
    const [energy, setEnergy] = useState(50);

    const fetchInitialData = async () => {
        setIsLoading(true);
        setIsPromptLoading(true);
        setError(null);
        try {
            setSavedEntries(storageService.getJournalEntries());
            const result = await service.getJournalPrompt();
            setPrompt(result);
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
            setError(`Failed to get a journal prompt: ${errorMessage}`);
        } finally {
            setIsLoading(false);
            setIsPromptLoading(false);
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    const handleNewPrompt = async () => {
        if (isPromptLoading) return;
        setIsPromptLoading(true);
        setError(null);
        try {
            const result = await service.getJournalPrompt();
            setPrompt(result);
            setEntryText(''); 
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
            setError(`Failed to get a new journal prompt: ${errorMessage}`);
        } finally {
            setIsPromptLoading(false);
        }
    };

    const handleSave = async () => {
        if (!entryText.trim() || !prompt) return;
        setIsSaving(true);
        
        let analysis = undefined;
        try {
             analysis = await service.analyzeJournalEntry(entryText);
        } catch (e) {
            console.error("Journal analysis failed", e);
            // Proceed to save without analysis if it fails
        }

        const newEntry: JournalEntry = {
            id: `entry-${Date.now()}`,
            timestamp: new Date().toISOString(),
            text: entryText,
            prompt: prompt,
            userMetrics: {
                mood,
                energy
            },
            analysis
        };
        
        storageService.addJournalEntry(newEntry);
        setSavedEntries(storageService.getJournalEntries()); 
        
        setIsSaving(false);
        setEntryText('');
        setMood(50);
        setEnergy(50);
    };
    
    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    return (
        <div className="flex flex-col h-full p-4 sm:p-6 overflow-y-auto lg:overflow-hidden">
            <h2 className="font-serif text-2xl md:text-3xl text-text mb-6 text-center shrink-0">Дневник</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-grow lg:overflow-hidden">
                {/* Editor Column */}
                <div className="flex flex-col h-full">
                    {(isLoading && !prompt) && (
                        <div className="m-auto flex flex-col items-center justify-center h-full">
                            <Loader />
                            <p className="mt-4 text-accent">Искра ищет для вас вопрос...</p>
                        </div>
                    )}
                    {error && (
                        <div className="m-auto text-center p-4 rounded-lg bg-danger/20">
                            <p className="text-danger">{error}</p>
                        </div>
                    )}
                    {prompt && (
                        <div className="flex flex-col h-full animate-fade-in">
                            <div className="mb-4 p-4 border border-border rounded-lg bg-surface shrink-0">
                                <div className="flex items-start space-x-3">
                                    <SparkleIcon className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                                    <div className="flex-grow">
                                        <h3 className="font-serif text-xl text-text">{prompt.question}</h3>
                                        <p className="text-sm text-text-muted mt-1 italic">Почему это? {prompt.why}</p>
                                    </div>
                                    <button
                                        onClick={handleNewPrompt}
                                        disabled={isPromptLoading}
                                        className="p-2 rounded-full text-text-muted hover:bg-surface2 hover:text-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                                        title="Сгенерировать другой вопрос"
                                    >
                                        {isPromptLoading ? <Loader /> : <Undo2Icon className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                            
                            <textarea
                                value={entryText}
                                onChange={(e) => setEntryText(e.target.value)}
                                placeholder="Напишите свои мысли здесь..."
                                className="w-full h-full flex-grow resize-none rounded-lg border border-border bg-surface p-4 text-text-muted focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors mb-4 min-h-[200px]"
                            />
                            
                            {/* Metrics Logger */}
                            <div className="bg-surface p-4 rounded-lg border border-border mb-4 shrink-0">
                                <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Внутренний Компас</p>
                                <div className="grid grid-cols-2 gap-6">
                                    <MetricSlider label="Настроение" value={mood} onChange={setMood} icon="😌" colorClass="text-accent" />
                                    <MetricSlider label="Энергия" value={energy} onChange={setEnergy} icon="⚡" colorClass="text-primary" />
                                </div>
                            </div>

                             <button
                                onClick={handleSave}
                                disabled={isSaving || !entryText.trim()}
                                className="button-primary w-full !py-3 text-md shrink-0"
                            >
                                {isSaving ? 'Слушаю...' : 'Сохранить запись'}
                            </button>
                        </div>
                    )}
                </div>
                {/* Archive Column */}
                <div className="flex flex-col h-full overflow-hidden mt-8 lg:mt-0">
                     <h3 className="font-serif text-xl text-text mb-4 text-center lg:text-left">Архив</h3>
                     <div className="flex-grow lg:overflow-y-auto pr-2 -mr-2 border-t border-border lg:border-t-0 lg:border-l lg:pl-6 pb-24 lg:pb-0">
                        {savedEntries.length === 0 && !isLoading ? (
                            <div className="text-center py-10 text-text-muted">Ваш архив дневника пуст.</div>
                        ) : (
                            <ul className="space-y-3 pt-4 lg:pt-0">
                                {savedEntries.map(entry => (
                                    <li key={entry.id}>
                                        <button onClick={() => setViewingEntry(entry)} className="w-full text-left p-3 bg-surface rounded-lg hover:bg-surface2 transition-colors flex flex-col gap-2 group">
                                            <div className="flex justify-between items-center w-full">
                                                <p className="font-semibold text-text">{formatDate(entry.timestamp)}</p>
                                                <ChevronRightIcon className="w-5 h-5 text-text-muted opacity-50 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                            <p className="text-sm text-text-muted italic truncate">"{entry.prompt.question}"</p>
                                            {/* Mini indicators for saved metrics */}
                                            <div className="flex gap-3 mt-1 items-center">
                                                {entry.userMetrics && (
                                                    <>
                                                        <div className="flex items-center gap-1 text-[10px] text-text-muted" title="Настроение">
                                                            <span>😌</span>
                                                            <div className="w-8 h-1 bg-surface2 rounded-full overflow-hidden">
                                                                <div className="h-full bg-accent" style={{ width: `${entry.userMetrics.mood}%` }} />
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 text-[10px] text-text-muted" title="Энергия">
                                                            <span>⚡</span>
                                                            <div className="w-8 h-1 bg-surface2 rounded-full overflow-hidden">
                                                                <div className="h-full bg-primary" style={{ width: `${entry.userMetrics.energy}%` }} />
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                                {entry.analysis && (
                                                    <span className="text-[10px] text-primary/80 ml-auto border border-primary/20 px-1.5 rounded bg-primary/5">
                                                        Анализ {entry.analysis.signature}
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                     </div>
                </div>
            </div>

            {/* View Entry Modal */}
            {viewingEntry && (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={() => setViewingEntry(null)}>
                    <div className="w-full max-w-2xl bg-surface2 border border-border rounded-2xl shadow-deep p-6 m-4 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start mb-4 shrink-0">
                            <div>
                                <h3 className="font-serif text-2xl text-text">{formatDate(viewingEntry.timestamp)}</h3>
                                <p className="text-sm text-accent italic mt-1">Вопрос: {viewingEntry.prompt.question}</p>
                            </div>
                            <button onClick={() => setViewingEntry(null)} className="text-text-muted hover:text-text">
                                <XIcon className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="flex-grow overflow-y-auto pr-4 -mr-4 space-y-6">
                           <p className="text-text-muted whitespace-pre-wrap leading-relaxed text-lg font-serif border-l-2 border-white/10 pl-4">
                               {viewingEntry.text}
                           </p>
                           
                           {viewingEntry.userMetrics && (
                               <div className="p-4 bg-black/20 rounded-lg border border-white/5 flex justify-around">
                                   <div className="text-center">
                                       <span className="block text-2xl mb-1">😌</span>
                                       <span className="text-xs text-text-muted uppercase">Настроение</span>
                                       <span className="block text-lg font-mono text-accent">{viewingEntry.userMetrics.mood}%</span>
                                   </div>
                                   <div className="text-center">
                                       <span className="block text-2xl mb-1">⚡</span>
                                       <span className="text-xs text-text-muted uppercase">Энергия</span>
                                       <span className="block text-lg font-mono text-primary">{viewingEntry.userMetrics.energy}%</span>
                                   </div>
                               </div>
                           )}

                           {viewingEntry.analysis && (
                               <div className="mt-6 p-5 bg-surface/80 border border-primary/20 rounded-xl relative overflow-hidden">
                                   <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                                   <div className="flex items-start gap-4">
                                       <div className="w-10 h-10 rounded-full bg-surface2 border border-white/10 flex items-center justify-center shadow-glow-ember text-xl shrink-0">
                                           {viewingEntry.analysis.signature}
                                       </div>
                                       <div>
                                           <h4 className="font-serif text-lg text-primary mb-1">Отклик Искры</h4>
                                           <p className="text-text-muted font-serif italic leading-relaxed">
                                               "{viewingEntry.analysis.reflection}"
                                           </p>
                                           <div className="mt-3 flex items-center gap-2">
                                               <span className="text-[10px] uppercase tracking-wider text-text-muted">Тон:</span>
                                               <span className="text-xs font-mono px-2 py-1 rounded bg-white/5 text-accent border border-white/5">
                                                   {viewingEntry.analysis.mood}
                                               </span>
                                           </div>
                                       </div>
                                   </div>
                               </div>
                           )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Journal;
