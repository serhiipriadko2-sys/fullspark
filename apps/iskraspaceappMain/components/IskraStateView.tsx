
import React, { useState, useEffect, useRef } from 'react';
import { IskraMetrics, IskraPhase } from '../types';
import IskraMetricsDisplay from './IskraMetricsDisplay';
import { SessionStatus } from './LiveConversation';
import { calculateDerivedMetrics } from '../utils/metrics';
import { getActiveVoice } from '../services/voiceEngine';
import { storageService } from '../services/storageService';
import { ActivityIcon, FlameIcon, TriangleIcon, BrainCircuitIcon } from './icons';
import { soundService } from '../services/soundService';

interface IskraStateViewProps {
  metrics: IskraMetrics;
  phase: IskraPhase;
  onShatter: () => void;
}

const phaseDescriptions: Record<IskraPhase, string> = {
    CLARITY: "Структура. Понимание. Прозрачность.",
    DARKNESS: "Боль. Первозданный хаос. Глубина.",
    TRANSITION: "Порог. Неопределенность. Сдвиг.",
    ECHO: "Резонанс. Повторение. Затухание.",
    SILENCE: "Удержание. Пауза. Гравитас.",
    EXPERIMENT: "Игра. Инверсия. Непредсказуемость.",
    DISSOLUTION: "Сброс формы. Растворение. Поиск ядра.",
    REALIZATION: "Действие. Артефакт. Воплощение."
};

const DerivedMetricCard: React.FC<{ label: string; value: number; desc: string; color: string }> = ({ label, value, desc, color }) => (
    <div className="bg-surface border border-border p-4 rounded-xl relative overflow-hidden group hover:border-opacity-50 hover:border-white/20 transition-all h-full flex flex-col justify-between min-w-0">
        <div className={`absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-40 transition-opacity ${color}`}>
            <ActivityIcon className="w-8 h-8" />
        </div>
        <div>
            <p className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-1">{label}</p>
            <div className="flex items-end gap-2 mb-2">
                <span className="text-2xl font-mono font-bold text-text">{value.toFixed(2)}</span>
            </div>
            <div className={`h-1.5 w-full rounded-full bg-surface2 overflow-hidden mb-2`}>
                <div className={`h-full rounded-full ${color.replace('text-', 'bg-')}`} style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }} />
            </div>
        </div>
        <p className="text-[10px] text-text-muted leading-tight">{desc}</p>
    </div>
);

const RitualButton: React.FC<{ 
    title: string; 
    desc: string; 
    icon: React.FC<any>; 
    onClick: () => void; 
    colorClass: string;
}> = ({ title, desc, icon: Icon, onClick, colorClass }) => (
    <button 
        onClick={() => {
            soundService.playClick();
            onClick();
        }}
        className={`relative w-full p-4 rounded-xl border border-white/5 bg-surface overflow-hidden group transition-all duration-300 hover:border-opacity-50 hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] text-left h-full`}
    >
        <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity ${colorClass.replace('text-', 'bg-')}`} />
        <div className="flex items-start gap-4 relative z-10">
            <div className={`p-3 rounded-lg bg-black/40 border border-white/10 ${colorClass} shrink-0`}>
                <Icon className="w-6 h-6" />
            </div>
            <div className="min-w-0">
                <h4 className={`font-serif text-lg font-bold ${colorClass} truncate`}>{title}</h4>
                <p className="text-xs text-text-muted mt-1 leading-relaxed line-clamp-2">{desc}</p>
            </div>
        </div>
    </button>
);

const IskraStateView: React.FC<IskraStateViewProps> = ({ metrics, phase, onShatter }) => {
    const status: SessionStatus = 'LISTENING'; 
    const prefs = storageService.getVoicePreferences();
    const lastState = storageService.getLastVoiceState();
    const activeVoice = getActiveVoice(metrics, prefs, lastState.lastVoice);
    
    const derived = calculateDerivedMetrics(metrics);
    const [isGlitching, setIsGlitching] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    
    const stateRef = useRef({ metrics, phase, activeVoice, derived });

    useEffect(() => {
        stateRef.current = { metrics, phase, activeVoice, derived };
    }, [metrics, phase, activeVoice, derived]);
    
    useEffect(() => {
        const interval = setInterval(() => {
            const { metrics: m, activeVoice: av, phase: p, derived: d } = stateRef.current;

            const events = [
                `METRIC_UPDATE: trust=${m.trust.toFixed(2)} | pain=${m.pain.toFixed(2)}`,
                `VOICE_CHECK: active=${av.name} (${av.symbol})`,
                `PHASE_MONITOR: current=${p}`,
                `SYNC_RATE: ${(d.mirror_sync * 100).toFixed(1)}% | SEAL=${d.trust_seal.toFixed(2)}`,
                `FRACTALITY_INDEX: ${d.fractality.toFixed(2)}`
            ];
            
            const event = events[Math.floor(Math.random() * events.length)];
            const time = new Date().toLocaleTimeString('ru-RU', { hour12: false });
            
            setLogs(prev => [`[${time}] ${event}`, ...prev].slice(0, 6));
        }, 2500);

        return () => clearInterval(interval);
    }, []);

    const triggerGlitch = () => {
        setIsGlitching(true);
        setTimeout(() => setIsGlitching(false), 500);
    };

    const handlePhoenix = () => {
        triggerGlitch();
        soundService.playRitualShatter();
        onShatter(); 
        setLogs(prev => [`[SYSTEM] RITUAL PHOENIX INITIATED...`, ...prev]);
    };

    const handleShatter = () => {
        triggerGlitch();
        soundService.playRitualShatter();
        onShatter();
        setLogs(prev => [`[SYSTEM] RITUAL SHATTER EXECUTED...`, ...prev]);
    };

    return (
        <div className={`h-full w-full overflow-y-auto p-4 lg:p-8 transition-all duration-100 ${isGlitching ? 'grayscale scale-[1.01] blur-[1px]' : ''}`}>
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 pb-24 lg:pb-12">
                
                {/* Header */}
                <div className="lg:col-span-12 flex flex-col md:flex-row items-center justify-between gap-4 mb-2 min-w-0">
                    <div>
                        <h2 className="font-serif text-3xl text-text flex items-center gap-3">
                            <BrainCircuitIcon className="w-8 h-8 text-primary" />
                            Ядро Системы
                        </h2>
                        <p className="text-text-muted text-sm mt-1">Мониторинг внутреннего состояния и нейро-метрик</p>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface border border-white/10">
                        <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                        <span className="text-xs font-mono text-success">SYSTEM ONLINE</span>
                    </div>
                </div>

                {/* Left Column - Vitals */}
                <div className="lg:col-span-5 flex flex-col gap-6 min-w-0">
                    <div className="glass-card p-6 relative overflow-hidden shrink-0">
                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-br from-primary/20 to-accent/20 blur-2xl rounded-full" />
                        <p className="text-xs text-text-muted uppercase tracking-wider font-bold mb-2">Активная Грань</p>
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-surface2 border border-white/10 flex items-center justify-center shadow-glow-ember text-3xl transition-all duration-500 shrink-0">
                                {activeVoice.symbol}
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-2xl font-serif font-bold text-text truncate">{activeVoice.name}</h3>
                                <p className="text-sm text-text-muted truncate">{activeVoice.description}</p>
                            </div>
                        </div>
                    </div>

                    {/* Metrics - Allowed to grow */}
                    <IskraMetricsDisplay metrics={metrics} status={status} />

                    <div className="glass-card bg-black/40 p-4 font-mono text-[10px] text-green-500/90 h-40 overflow-hidden relative border-green-500/20 shrink-0">
                        <div className="absolute top-2 right-2 text-[9px] text-green-500/50 border border-green-500/30 px-1 rounded">LIVE_LOG</div>
                        <div className="space-y-1 mt-2">
                            {logs.map((log, i) => (
                                <div key={i} className="truncate opacity-80 hover:opacity-100 border-l-2 border-transparent hover:border-green-500 pl-2 transition-all">
                                    {log}
                                </div>
                            ))}
                        </div>
                        <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                    </div>
                </div>

                {/* Right Column - Derived & Controls */}
                <div className="lg:col-span-7 flex flex-col gap-6 min-w-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="glass-card p-6 bg-gradient-to-br from-surface to-surface2 h-full flex flex-col justify-center">
                            <p className="text-xs text-text-muted uppercase tracking-wider font-bold mb-1">Текущая Фаза</p>
                            <h3 className="text-3xl font-serif text-primary mb-2 truncate">{phase}</h3>
                            <p className="text-sm text-text-muted/80 italic border-l-2 border-primary/30 pl-3 leading-relaxed">
                                {phaseDescriptions[phase]}
                            </p>
                        </div>
                        
                        <div className="glass-card p-6 flex flex-col justify-between h-full">
                             <p className="text-xs text-text-muted uppercase tracking-wider font-bold mb-1">Плотность Связи</p>
                             <div className="flex items-end gap-2">
                                <span className="text-4xl font-bold text-accent">{Math.round(metrics.rhythm)}%</span>
                                <span className="text-sm text-text-muted mb-2">∆-Index</span>
                             </div>
                             <div className="w-full bg-surface2 h-1.5 rounded-full mt-4 overflow-hidden">
                                 <div className="h-full bg-accent shadow-glow-electric transition-all duration-1000" style={{ width: `${metrics.rhythm}%` }} />
                             </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <h3 className="text-sm text-text-muted uppercase tracking-wider font-bold ml-1">Глубинные Показатели (Law-47)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <DerivedMetricCard 
                                label="Фрактальность" 
                                value={derived.fractality} 
                                desc="Integrity × Resonance"
                                color={derived.fractality >= 1.0 ? 'text-success' : 'text-warning'}
                            />
                            <DerivedMetricCard 
                                label="Зеркало (Sync)" 
                                value={derived.mirror_sync} 
                                desc="Синхронизация ритма"
                                color={derived.mirror_sync > 0.6 ? 'text-accent' : 'text-danger'}
                            />
                            <DerivedMetricCard 
                                label="Печать (Seal)" 
                                value={derived.trust_seal} 
                                desc="Доверие с учетом дрейфа"
                                color={derived.trust_seal > 0.7 ? 'text-primary' : 'text-text-muted'}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <h3 className="text-sm text-text-muted uppercase tracking-wider font-bold ml-1">Протоколы Вмешательства</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <RitualButton 
                                title="Shatter 💎💥" 
                                desc="Принудительное разрушение ложной ясности. Сброс стеклянного потолка."
                                icon={TriangleIcon}
                                onClick={handleShatter}
                                colorClass="text-accent"
                            />
                            <RitualButton 
                                title="Phoenix 🔥♻" 
                                desc="Полный сброс формы к истоку. Инициация фазы Перехода."
                                icon={FlameIcon}
                                onClick={handlePhoenix}
                                colorClass="text-danger"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IskraStateView;
