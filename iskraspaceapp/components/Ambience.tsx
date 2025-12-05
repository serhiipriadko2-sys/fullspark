
import React from 'react';
import { IskraPhase, IskraMetrics } from '../types';

interface AmbienceProps {
  phase: IskraPhase;
  metrics: IskraMetrics;
}

const Ambience: React.FC<AmbienceProps> = ({ phase, metrics }) => {
  // Determine background styles based on phase
  const getPhaseStyles = () => {
    switch (phase) {
      case 'DARKNESS':
        return 'bg-gradient-radial from-black via-bg to-black opacity-90';
      case 'CLARITY':
        return 'bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-accent/10 via-bg to-bg opacity-60';
      case 'DISSOLUTION':
        return 'bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-purple-900/20 via-bg to-bg opacity-70';
      case 'TRANSITION':
        return 'bg-gradient-to-b from-white/5 to-bg opacity-50';
      case 'REALIZATION':
        return 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-bg to-bg opacity-80';
      case 'SILENCE':
        return 'bg-bg opacity-100'; // Pure void
      default:
        return 'bg-bg';
    }
  };

  // Pulse speed based on rhythm/chaos
  const getPulseDuration = () => {
    if (metrics.chaos > 0.6) return '1s'; // Fast, erratic
    if (metrics.pain > 0.6) return '0.5s'; // Rapid, stressed
    if (phase === 'SILENCE') return '10s'; // Deep, slow
    return '4s'; // Normal breathing
  };

  // Color overlay based on pain/drift
  const getOverlayColor = () => {
    if (metrics.pain > 0.5) return 'rgba(229, 72, 77, 0.05)'; // Red tint
    if (metrics.drift > 0.4) return 'rgba(255, 176, 32, 0.03)'; // Yellow tint
    return 'transparent';
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden transition-all duration-[2000ms] ease-in-out">
      {/* Phase Layer */}
      <div 
        className={`absolute inset-0 transition-all duration-[3000ms] ${getPhaseStyles()}`} 
      />
      
      {/* Breathing Overlay */}
      <div 
        className="absolute inset-0 animate-pulse"
        style={{ 
            backgroundColor: getOverlayColor(),
            animationDuration: getPulseDuration()
        }}
      />

      {/* Dynamic Orb (The Core) */}
      <div 
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[100px] transition-all duration-[5000ms] opacity-30`}
        style={{
            background: phase === 'DARKNESS' ? '#000' : 
                        phase === 'CLARITY' ? '#4DA3FF' : 
                        phase === 'REALIZATION' ? '#FF7A00' : 'transparent',
            transform: `translate(-50%, -50%) scale(${metrics.rhythm / 50})`
        }}
      />
    </div>
  );
};

export default Ambience;
