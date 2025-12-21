/**
 * AnalysisModal - Conversation analysis modal
 * Extracted from LiveConversation.tsx
 */

import React from 'react';
import { ConversationAnalysis, DeltaReportData } from '../../types';
import { XIcon } from '../icons';
import Loader from '../Loader';
import DeltaReport from '../DeltaReport';

interface AnalysisModalProps {
  isOpen: boolean;
  isAnalyzing: boolean;
  result: ConversationAnalysis | null;
  deltaReport: DeltaReportData | null;
  onClose: () => void;
}

const AnalysisContent: React.FC<{ result: ConversationAnalysis }> = ({ result }) => {
  const score = result.connectionQuality?.score ?? 0;
  const circumference = 2 * Math.PI * 28;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="space-y-6 text-text-muted font-serif text-lg leading-relaxed">
      {result.connectionQuality && (
        <div className="flex items-center gap-6 p-4 bg-surface rounded-lg">
          <div className="relative flex items-center justify-center w-20 h-20 flex-shrink-0">
            <svg className="w-full h-full" viewBox="0 0 64 64">
              <circle className="text-border" strokeWidth="4" stroke="currentColor" fill="transparent" r="28" cx="32" cy="32" />
              <circle
                className="text-accent drop-shadow-glow-accent"
                strokeWidth="4"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r="28"
                cx="32"
                cy="32"
                style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset 1s ease-out' }}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-bold text-text">{score}</span>
              <span className="text-xs text-accent">%</span>
            </div>
          </div>
          <div>
            <h4 className="font-serif text-xl text-accent mb-1">Качество Связи</h4>
            <p className="text-sm">{result.connectionQuality.assessment}</p>
          </div>
        </div>
      )}

      <div>
        <h4 className="font-serif text-xl text-accent mb-2">Резюме Потока</h4>
        <p className="text-base whitespace-pre-wrap">{result.summary}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {result.keyPoints?.length > 0 && (
          <div className="p-4 bg-surface rounded-lg">
            <h4 className="font-serif text-xl text-accent mb-2">Ключевые Узлы</h4>
            <ul className="space-y-2 text-base">
              {result.keyPoints.map((point, i) => (
                <li key={i} className="flex items-start">
                  <span className="mr-2 mt-1 text-accent">⟡</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {result.mainThemes?.length > 0 && (
          <div className="p-4 bg-surface rounded-lg">
            <h4 className="font-serif text-xl text-accent mb-2">Основные Темы</h4>
            <div className="flex flex-wrap gap-2">
              {result.mainThemes.map((theme, i) => (
                <span key={i} className="px-3 py-1 text-sm bg-border rounded-pill">{theme}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {result.unspokenQuestions?.length > 0 && (
        <div>
          <h4 className="font-serif text-xl text-accent mb-2">Невысказанные Вопросы</h4>
          <ul className="space-y-2 text-base">
            {result.unspokenQuestions.map((q, i) => (
              <li key={i} className="flex items-start">
                <span className="mr-2 mt-1 text-accent">≈</span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.brainstormIdeas?.length > 0 && (
        <div>
          <h4 className="font-serif text-xl text-accent mb-2">Пространство Идей</h4>
          <ul className="space-y-2 text-base">
            {result.brainstormIdeas.map((idea, i) => (
              <li key={i} className="flex items-start">
                <span className="mr-2 mt-1 text-primary">💡</span>
                <span>{idea}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const AnalysisModal: React.FC<AnalysisModalProps> = ({
  isOpen,
  isAnalyzing,
  result,
  deltaReport,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="absolute inset-0 bg-bg/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-surface2 border border-border rounded-2xl shadow-deep p-6 m-4 max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <h3 className="font-serif text-2xl text-text">Анализ Диалога</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text">
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-grow overflow-y-auto pr-4 -mr-4">
          {isAnalyzing && !result ? (
            <div className="flex flex-col items-center justify-center h-full py-10">
              <Loader />
              <p className="mt-4 text-accent">Искра анализирует потоки...</p>
            </div>
          ) : result ? (
            <div className="space-y-8">
              <AnalysisContent result={result} />
              {deltaReport && <DeltaReport data={deltaReport} />}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AnalysisModal;
