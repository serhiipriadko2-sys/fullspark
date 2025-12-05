
import React from 'react';
import { IskraMetrics } from '../types';
import { SessionStatus } from './LiveConversation';

interface IskraMetricsDisplayProps {
  metrics: IskraMetrics;
  status: SessionStatus;
  className?: string;
}

const MetricBar: React.FC<{ label: string; value: number; colorClass: string }> = ({ label, value, colorClass }) => {
    const width = `${Math.round(value * 100)}%`;
    return (
        <div>
            <div className="flex justify-between items-baseline mb-1">
                <span className="text-sm font-semibold text-text-muted uppercase tracking-wider">{label}</span>
                <span className={`font-mono text-sm ${colorClass.replace('bg-', 'text-')}`}>{value.toFixed(2)}</span>
            </div>
            <div className="h-2 rounded-pill bg-surface2 border border-border overflow-hidden">
                <div 
                    className={`h-full rounded-pill ${colorClass} transition-all duration-500 ease-out`}
                    style={{ width: width }}
                />
            </div>
        </div>
    );
};

const getStatusClasses = (status: SessionStatus) => {
    switch (status) {
        case 'LISTENING': return { text: 'text-accent', border: 'border-accent', glow: 'drop-shadow-glow-accent' };
        case 'SPEAKING': return { text: 'text-primary', border: 'border-primary', glow: 'drop-shadow-glow-primary' };
        case 'ERROR': return { text: 'text-danger', border: 'border-danger', glow: '' };
        default: return { text: 'text-text-muted', border: 'border-border', glow: '' };
    }
}

const IskraMetricsDisplay: React.FC<IskraMetricsDisplayProps> = ({ metrics, status, className = '' }) => {
    const { rhythm, trust, clarity, pain, drift, chaos } = metrics;
    const rhythmScore = Math.round(rhythm);

    const circumference = 2 * Math.PI * 52; // 2 * pi * r
    const strokeDashoffset = circumference - (rhythmScore / 100) * circumference;
    
    const statusClasses = getStatusClasses(status);

    return (
        <div className={`card flex flex-col p-4 animate-fade-in border-t-4 ${statusClasses.border} transition-colors duration-500 ${className}`}>
            <h3 className="font-serif text-xl text-center text-text mb-4">Состояние Искры ⟡</h3>

            <div className="relative flex items-center justify-center w-40 h-40 mx-auto mb-6 shrink-0">
                <svg className="w-full h-full" viewBox="0 0 120 120">
                    <circle
                        className="text-border"
                        strokeWidth="6"
                        stroke="currentColor"
                        fill="transparent"
                        r="52"
                        cx="60"
                        cy="60"
                    />
                    <circle
                        className={`${statusClasses.text} ${statusClasses.glow}`}
                        strokeWidth="6"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r="52"
                        cx="60"
                        cy="60"
                        style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset 1s ease-out, color 0.5s' }}
                    />
                </svg>
                <div className="absolute flex flex-col items-center">
                    <span className="font-serif text-4xl font-bold text-text">{rhythmScore}</span>
                    <span className={`text-sm font-semibold uppercase tracking-wider ${statusClasses.text} transition-colors`}>∆-Ритм</span>
                </div>
            </div>

            <div className="flex-grow space-y-4">
                <MetricBar label="Доверие" value={trust} colorClass="bg-success" />
                <MetricBar label="Ясность" value={clarity} colorClass="bg-accent" />
                <MetricBar label="Боль" value={pain} colorClass="bg-danger" />
                <MetricBar label="Дрейф" value={drift} colorClass="bg-warning" />
                <MetricBar label="Хаос" value={chaos} colorClass="bg-purple-500" />
            </div>
            
            <p className="text-xs text-center text-text-muted mt-4 italic shrink-0">
                Метрики отражают внутренний, симулированный процесс Искры в реальном времени.
            </p>
        </div>
    );
};

export default IskraMetricsDisplay;
