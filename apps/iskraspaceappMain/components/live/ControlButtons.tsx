/**
 * ControlButtons - Session control buttons
 * Extracted from LiveConversation.tsx
 */

import React from 'react';
import { MicIcon, BrainCircuitIcon } from '../icons';
import Loader from '../Loader';
import { SessionStatus } from './types';

interface ControlButtonsProps {
  status: SessionStatus;
  transcriptionLength: number;
  isAnalyzing: boolean;
  onToggleSession: () => void;
  onAnalyze: () => void;
}

const ControlButtons: React.FC<ControlButtonsProps> = ({
  status,
  transcriptionLength,
  isAnalyzing,
  onToggleSession,
  onAnalyze,
}) => {
  const getStatusText = () => {
    switch (status) {
      case 'CONNECTING': return "Настройка связи ⟡";
      case 'LISTENING': return "Вслушиваюсь в ритм...";
      case 'SPEAKING': return "Поток пошёл...";
      case 'ERROR': return "Сбой связи. Попробовать снова?";
      case 'IDLE': return "Нажмите, чтобы говорить";
      default: return "Ожидание";
    }
  };

  const isActive = status === 'LISTENING' || status === 'SPEAKING' || status === 'CONNECTING';

  return (
    <div className="flex flex-col items-center shrink-0 space-y-4">
      <div className="flex items-center space-x-6">
        <button
          onClick={onToggleSession}
          className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-deep active:scale-95 ${
            isActive ? 'bg-danger hover:bg-danger/80 shadow-danger/30' : 'bg-accent hover:bg-accent/80 shadow-accent/30'
          }`}
          disabled={status === 'CONNECTING'}
        >
          {(status === 'LISTENING' || status === 'SPEAKING') && (
            <div className="absolute inset-0 rounded-full bg-accent/50 animate-ping" />
          )}
          <MicIcon className="w-10 h-10 text-white" />
        </button>

        {(status === 'IDLE' || status === 'ERROR') && transcriptionLength > 1 && (
          <button
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className="relative w-24 h-24 rounded-full flex items-center justify-center transition-colors duration-300 bg-surface2 hover:bg-border disabled:cursor-not-allowed disabled:opacity-50"
          >
            <BrainCircuitIcon className="w-10 h-10 text-white" />
          </button>
        )}
      </div>
      <p className="text-accent h-6 font-mono text-sm tracking-wider bg-black/50 px-3 py-1 rounded-full">
        {status === 'CONNECTING' ? <Loader /> : getStatusText()}
      </p>
    </div>
  );
};

export default ControlButtons;
