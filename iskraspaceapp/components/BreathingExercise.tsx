
import React, { useState, useEffect, useRef } from 'react';
import { XIcon } from './icons';

interface BreathingExerciseProps {
    onClose: () => void;
}

type Phase = 'INHALE' | 'HOLD' | 'EXHALE';

const PHASE_CONFIG: Record<Phase, { duration: number; label: string; scale: number; color: string; glow: string }> = {
    INHALE: { 
        duration: 4000, 
        label: 'Вдох', 
        scale: 1.5, 
        color: 'text-accent', 
        glow: 'shadow-[0_0_60px_rgba(77,163,255,0.6)]' 
    },
    HOLD: { 
        duration: 7000, 
        label: 'Задержка', 
        scale: 1.5, 
        color: 'text-primary', 
        glow: 'shadow-[0_0_40px_rgba(255,122,0,0.5)]' 
    },
    EXHALE: { 
        duration: 8000, 
        label: 'Выдох', 
        scale: 1.0, 
        color: 'text-text-muted', 
        glow: 'shadow-[0_0_20px_rgba(255,255,255,0.1)]' 
    },
};

const BreathingExercise: React.FC<BreathingExerciseProps> = ({ onClose }) => {
    const [phase, setPhase] = useState<Phase>('INHALE');
    const [secondsLeft, setSecondsLeft] = useState(4);
    const [cycles, setCycles] = useState(0);
    const timeoutRef = useRef<number | null>(null);
    const intervalRef = useRef<number | null>(null);

    const startPhase = (newPhase: Phase) => {
        setPhase(newPhase);
        const config = PHASE_CONFIG[newPhase];
        setSecondsLeft(config.duration / 1000);

        timeoutRef.current = window.setTimeout(() => {
            if (newPhase === 'INHALE') startPhase('HOLD');
            else if (newPhase === 'HOLD') startPhase('EXHALE');
            else if (newPhase === 'EXHALE') {
                setCycles(c => c + 1);
                startPhase('INHALE');
            }
        }, config.duration);
    };

    useEffect(() => {
        startPhase('INHALE');

        intervalRef.current = window.setInterval(() => {
            setSecondsLeft(prev => Math.max(0, prev - 1));
        }, 1000);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    const config = PHASE_CONFIG[phase];

    return (
        <div className="fixed inset-0 z-[100] bg-bg/95 backdrop-blur-xl flex flex-col items-center justify-center animate-fade-in touch-none">
            <button 
                onClick={onClose}
                className="absolute top-6 right-6 p-4 rounded-full bg-surface border border-white/10 hover:bg-white/10 transition-colors active:scale-95"
            >
                <XIcon className="w-8 h-8 text-text-muted" />
            </button>

            <div className="relative flex items-center justify-center mb-12">
                {/* Outer Guides */}
                <div className="absolute inset-0 w-[300px] h-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/5" />
                <div className="absolute inset-0 w-[200px] h-[200px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/5" />

                {/* Breathing Sphere */}
                <div 
                    className={`w-[200px] h-[200px] rounded-full bg-surface2 border-2 border-current transition-all ease-in-out flex items-center justify-center ${config.color} ${config.glow}`}
                    style={{ 
                        transform: `scale(${config.scale})`, 
                        transitionDuration: `${config.duration}ms` 
                    }}
                >
                     <div className="flex flex-col items-center scale-100 transform transition-transform duration-0" style={{ transform: `scale(${1/config.scale})` }}>
                        <span className="text-4xl font-mono font-bold text-text drop-shadow-md">{secondsLeft}</span>
                     </div>
                </div>
            </div>

            <div className="text-center space-y-2 z-10">
                <h2 className={`text-4xl font-serif font-bold transition-colors duration-500 ${config.color}`}>
                    {config.label}
                </h2>
                <p className="text-text-muted text-sm font-mono uppercase tracking-widest opacity-60">
                    Цикл: {cycles + 1}
                </p>
            </div>
            
            <div className="absolute bottom-12 text-text-muted/40 text-xs font-mono">
                Ритм 4-7-8 • Успокоение
            </div>
        </div>
    );
};

export default BreathingExercise;
