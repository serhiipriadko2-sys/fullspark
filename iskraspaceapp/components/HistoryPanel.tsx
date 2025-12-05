import React from 'react';
import { Message } from '../types';

interface HistoryPanelProps {
  history: Message[];
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ history }) => {
  return (
    <div className="flex h-full flex-col p-4 space-y-4 bg-surface/50 overflow-y-auto">
      <h2 className="text-sm font-semibold uppercase text-accent tracking-wider">Поток Памяти</h2>
      <div className="space-y-4">
        {history.slice().reverse().map((msg, index) => (
            <div key={index} className="rounded-md border border-border p-3 text-xs">
                <p className={`font-semibold ${msg.role === 'user' ? 'text-accent' : 'text-text-muted'}`}>
                    {msg.role === 'user' ? 'Запрос' : 'Ответ'}
                </p>
                <p className="mt-1 text-text-muted italic line-clamp-3">
                    {`"${msg.text}"`}
                </p>
            </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryPanel;
