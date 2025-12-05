import React from 'react';
import { SparkleIcon } from './icons';

interface SparkDisplayProps {
  text: string;
  title?: string;
}

const SparkDisplay: React.FC<SparkDisplayProps> = ({ text, title }) => {
  return (
    <div className="animate-fade-in rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start space-x-3">
        <SparkleIcon className="h-5 w-5 flex-shrink-0 text-primary mt-1" />
        <div>
          {title && <h3 className="font-serif text-xl text-text mb-1">{title}</h3>}
          <p className="font-serif text-lg leading-relaxed text-text-muted whitespace-pre-wrap">{text}</p>
        </div>
      </div>
    </div>
  );
};

export default SparkDisplay;
