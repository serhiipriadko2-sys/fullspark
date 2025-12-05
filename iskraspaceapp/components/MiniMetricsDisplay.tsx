import React from 'react';
import { IskraMetrics, Voice } from '../types';

interface MiniMetricsDisplayProps {
  metrics: IskraMetrics;
  className?: string;
  activeVoice?: Voice;
}

const MiniMetricBar: React.FC<{ value: number; colorClass: string }> = ({ value, colorClass }) => {
    const width = `${Math.round(value * 100)}%`;
    return (
        <div className="h-1 w-8 rounded-pill bg-surface2">
            <div
                className={`h-full rounded-pill ${colorClass}`}
                style={{ width, transition: 'width 0.5s ease-out' }}
            />
        </div>
    );
};

const MiniMetricsDisplay: React.FC<MiniMetricsDisplayProps> = ({ metrics, className = '', activeVoice }) => {
    const { rhythm, trust, clarity, pain, drift, chaos } = metrics;
    const rhythmScore = Math.round(rhythm);
    
    const circumference = 2 * Math.PI * 14; // r=14
    const strokeDashoffset = circumference - (rhythmScore / 100) * circumference;

    return (
        <div title={activeVoice ? `Активный голос: ${activeVoice.description}` : 'Метрики Искры'} className={`flex items-center gap-3 rounded-pill border border-border bg-surface/80 p-2 shadow-soft backdrop-blur-sm ${className}`}>
            <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center">
                 <svg className="h-full w-full" viewBox="0 0 32 32">
                    <circle
                        className="text-border"
                        strokeWidth="2"
                        stroke="currentColor"
                        fill="transparent"
                        r="14"
                        cx="16"
                        cy="16"
                    />
                    <circle
                        className="text-accent"
                        strokeWidth="2"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r="14"
                        cx="16"
                        cy="16"
                        style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset 1s ease-out' }}
                    />
                </svg>
                <div className="absolute flex items-center justify-center gap-1">
                    <span className="font-mono text-xs font-bold text-text">{rhythmScore}</span>
                    {activeVoice && activeVoice.name !== 'ISKRA' && <span className="text-accent text-xs">{activeVoice.symbol}</span>}
                </div>
            </div>
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <MiniMetricBar value={trust} colorClass="bg-success" />
                    <MiniMetricBar value={clarity} colorClass="bg-accent" />
                </div>
                <div className="flex items-center gap-2">
                    <MiniMetricBar value={pain} colorClass="bg-danger" />
                    <MiniMetricBar value={drift} colorClass="bg-warning" />
                    <MiniMetricBar value={chaos} colorClass="bg-purple-500" />
                </div>
            </div>
        </div>
    );
};

export default MiniMetricsDisplay;
