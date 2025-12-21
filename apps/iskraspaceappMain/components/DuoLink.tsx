
import React, { useState, useEffect, useRef } from 'react';
import { storageService } from '../services/storageService';
import { DuoSharePrefs, ShareLevel, DuoMessage } from '../types';
import { PulseIcon, SunIcon, ListTodoIcon } from './icons';
import DuoCanvas from './DuoCanvas';

// Real synchronization via Broadcast Channel for P2P simulation between tabs
const SYNC_CHANNEL_NAME = 'iskra-duo-sync';

interface ShareControlProps {
    label: string;
    value: ShareLevel;
    onChange: (level: ShareLevel) => void;
    icon: React.FC<any>;
}

const ShareControl: React.FC<ShareControlProps> = ({ label, value, onChange, icon: Icon }) => {
    const levels: { id: ShareLevel; name: string }[] = [
        { id: 'hidden', name: 'Скрыто' },
        { id: 'daily_score', name: 'Дневной Score' },
        { id: 'weekly_mean', name: 'Недельное Среднее' }
    ];
    return (
        <div className="flex items-center justify-between p-3 bg-surface rounded-lg">
            <div className="flex items-center space-x-3">
                <Icon className="w-5 h-5 text-accent" />
                <span className="font-semibold text-text">{label}</span>
            </div>
            <div className="flex items-center space-x-2 rounded-pill bg-bg p-1">
                {levels.map(level => (
                    <button
                        key={level.id}
                        onClick={() => onChange(level.id)}
                        className={`px-3 py-1 text-xs font-semibold rounded-pill transition-colors ${
                            value === level.id ? 'bg-primary text-black' : 'text-text-muted hover:bg-surface2'
                        }`}
                    >
                        {level.name}
                    </button>
                ))}
            </div>
        </div>
    );
};

const DuoLink: React.FC = () => {
    const [prefs, setPrefs] = useState<DuoSharePrefs>({ sleep: 'hidden', focus: 'hidden', habits: 'hidden' });
    const [chatHistory, setChatHistory] = useState<DuoMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isCanvasOpen, setIsCanvasOpen] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const channelRef = useRef<BroadcastChannel | null>(null);
    const [partnerStatus, setPartnerStatus] = useState<'offline' | 'online'>('offline');

    useEffect(() => {
        setPrefs(storageService.getDuoPrefs());
        
        // Initialize P2P simulation
        channelRef.current = new BroadcastChannel(SYNC_CHANNEL_NAME);
        
        channelRef.current.onmessage = (event) => {
            const { type, payload } = event.data;
            if (type === 'MESSAGE') {
                setChatHistory(prev => [...prev, { ...payload, sender: 'partner' }]);
            } else if (type === 'PING') {
                setPartnerStatus('online');
                channelRef.current?.postMessage({ type: 'PONG' });
            } else if (type === 'PONG') {
                setPartnerStatus('online');
            }
        };

        // Ping to find partners
        channelRef.current.postMessage({ type: 'PING' });

        return () => {
            channelRef.current?.close();
        };
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    const handlePrefChange = (key: keyof DuoSharePrefs, value: ShareLevel) => {
        const newPrefs = { ...prefs, [key]: value };
        setPrefs(newPrefs);
        storageService.saveDuoPrefs(newPrefs);
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim()) return;

        const newMessage: DuoMessage = {
            id: `msg-${Date.now()}`,
            sender: 'me',
            text: chatInput.trim(),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setChatHistory(prev => [...prev, newMessage]);
        
        // Broadcast to other tabs
        channelRef.current?.postMessage({ type: 'MESSAGE', payload: newMessage });
        
        setChatInput('');
    };

    return (
        <div className="flex flex-col h-full p-4 sm:p-6 overflow-y-auto pb-24 lg:pb-6">
            <h2 className="font-serif text-2xl md:text-3xl text-text mb-6 text-center shrink-0">Связь двоих</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-grow animate-fade-in">
                {/* Left Column: Shared State & Privacy */}
                <div className="space-y-6">
                    {/* Shared Rhythm */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-serif text-xl text-text">Общий Ритм</h3>
                            <span className={`text-xs px-2 py-1 rounded-full border ${partnerStatus === 'online' ? 'text-success border-success/30 bg-success/10' : 'text-text-muted border-white/10'}`}>
                                {partnerStatus === 'online' ? 'Синхронизировано' : 'Ожидание партнера...'}
                            </span>
                        </div>
                        
                        <div className="card flex items-center justify-around p-4">
                             {partnerStatus === 'online' ? (
                                <>
                                    <div className="text-center">
                                        <p className="text-sm text-accent">∆-Score</p>
                                        <p className="font-serif text-4xl text-text">88</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm text-accent">Сон</p>
                                        <p className="font-serif text-4xl text-text">7.8h</p>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center text-text-muted py-4">
                                    <p>Откройте приложение во второй вкладке,</p>
                                    <p>чтобы симулировать связь P2P.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Granular Privacy */}
                    <div>
                        <h3 className="font-serif text-xl text-text mb-4">Настройки Приватности</h3>
                        <div className="space-y-3">
                           <ShareControl label="Сон" value={prefs.sleep} onChange={(v) => handlePrefChange('sleep', v)} icon={SunIcon} />
                           <ShareControl label="Фокус" value={prefs.focus} onChange={(v) => handlePrefChange('focus', v)} icon={PulseIcon} />
                           <ShareControl label="Привычки" value={prefs.habits} onChange={(v) => handlePrefChange('habits', v)} icon={ListTodoIcon} />
                        </div>
                        <p className="text-xs text-text-muted mt-4 italic">Ваши настройки сохраняются автоматически. Партнёр видит только те данные, которыми вы разрешили делиться.</p>
                    </div>
                </div>

                {/* Right Column: Communication Space */}
                <div className="flex flex-col space-y-6 h-[500px] lg:h-auto">
                    {/* E2EE Chat */}
                    <div className="flex flex-col h-full card p-0 overflow-hidden">
                        <h3 className="font-serif text-xl text-text p-4 border-b border-border bg-surface2">Чат-ритуал (Local P2P)</h3>
                        <div className="flex-grow p-4 space-y-4 overflow-y-auto bg-bg/50">
                           {chatHistory.length === 0 && (
                               <div className="text-center text-text-muted text-sm mt-10">
                                   Канал чист. Начните передачу.
                               </div>
                           )}
                           {chatHistory.map(msg => (
                                <div key={msg.id} className={`flex items-start gap-3 ${msg.sender === 'me' ? 'justify-end' : ''}`}>
                                     {msg.sender === 'partner' && <div className="w-8 h-8 rounded-full bg-accent/30 flex-shrink-0 flex items-center justify-center text-xs font-bold">P</div>}
                                     <div className={`max-w-[80%] rounded-2xl p-3 ${msg.sender === 'me' ? 'bg-primary text-black rounded-br-none' : 'bg-surface2 text-text rounded-bl-none'}`}>
                                         <p className="text-sm">{msg.text}</p>
                                         <p className={`text-[10px] text-right mt-1 ${msg.sender === 'me' ? 'text-black/60' : 'text-text-muted'}`}>{msg.timestamp}</p>
                                     </div>
                                </div>
                           ))}
                           <div ref={chatEndRef} />
                        </div>
                         <form onSubmit={handleSendMessage} className="p-4 border-t border-border bg-surface">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                placeholder="Сообщение..."
                                className="w-full rounded-lg border border-border bg-bg p-3 text-sm text-text focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
                            />
                        </form>
                    </div>
                     {/* Shared Canvas */}
                     <div className="card text-center p-4">
                        <h3 className="font-serif text-xl text-text mb-2">Общий Canvas</h3>
                        <p className="text-sm text-text-muted mb-4">Пространство для совместных идей и планов.</p>
                        <button
                          onClick={() => setIsCanvasOpen(true)}
                          className="px-4 py-2 text-sm bg-surface2 hover:bg-border rounded-md font-semibold transition-colors border border-border">
                            Открыть Canvas
                        </button>
                    </div>
                </div>
            </div>
            
            {isCanvasOpen && <DuoCanvas onClose={() => setIsCanvasOpen(false)} />}
        </div>
    );
};

export default DuoLink;
