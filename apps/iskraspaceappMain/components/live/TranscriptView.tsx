/**
 * TranscriptView - Displays conversation transcript
 * Extracted from LiveConversation.tsx
 */

import React from 'react';
import { TranscriptionMessage } from '../../types';
import { SparkleIcon, UserIcon } from '../icons';
import { SessionStatus } from './types';

interface TranscriptViewProps {
  transcription: TranscriptionMessage[];
  status: SessionStatus;
}

const TranscriptView: React.FC<TranscriptViewProps> = ({ transcription, status }) => {
  return (
    <div className={`w-full flex-grow bg-surface/80 backdrop-blur-sm rounded-lg p-4 mb-6 overflow-y-auto space-y-4 transition-all duration-500 border ${
      status === 'LISTENING' ? 'border-accent shadow-glow-electric' :
      status === 'SPEAKING' ? 'border-primary shadow-glow-ember' : 'border-border'
    }`}>
      {transcription.map((msg, index) => {
        if (msg.role === 'system') {
          return (
            <div key={index} className="my-2 text-center text-xs text-text-muted italic">
              <p>{msg.text}</p>
            </div>
          );
        }
        return (
          <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'model' && (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex-shrink-0 flex items-center justify-center mt-1">
                <SparkleIcon className="w-5 h-5 text-primary" />
              </div>
            )}
            <div className={`rounded-lg p-3 max-w-[85%] ${msg.role === 'user' ? 'bg-accent/50' : 'bg-surface2'}`}>
              <p className="text-text whitespace-pre-wrap">{msg.text}</p>
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-accent/20 flex-shrink-0 flex items-center justify-center mt-1">
                <UserIcon className="w-5 h-5 text-accent" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TranscriptView;
