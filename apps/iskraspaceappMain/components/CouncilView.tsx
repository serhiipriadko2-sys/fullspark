/**
 * COUNCIL VIEW - Ritual of the Nine Voices
 *
 * Displays the COUNCIL ritual where all voices debate a topic.
 * Order per Canon: Сэм → Кайн → Пино → Искрив → Анхантра → Хуньдун → Искра
 */

import React, { useState, useCallback } from 'react';
import { VoiceName } from '../types';
import { executeCouncil, CouncilResponse, COUNCIL_ORDER } from '../services/ritualService';
import { SparkleIcon, UsersIcon } from './icons';

interface CouncilViewProps {
  onClose?: () => void;
}

const VOICE_COLORS: Record<VoiceName, string> = {
  ISKRA: 'text-primary border-primary/30 bg-primary/5',
  KAIN: 'text-danger border-danger/30 bg-danger/5',
  PINO: 'text-warning border-warning/30 bg-warning/5',
  SAM: 'text-accent border-accent/30 bg-accent/5',
  ANHANTRA: 'text-info border-info/30 bg-info/5',
  HUNDUN: 'text-purple-400 border-purple-400/30 bg-purple-400/5',
  ISKRIV: 'text-slate-300 border-slate-300/30 bg-slate-300/5',
  MAKI: 'text-pink-400 border-pink-400/30 bg-pink-400/5',
  SIBYL: 'text-violet-400 border-violet-400/30 bg-violet-400/5',
};

const VOICE_NAMES_RU: Record<VoiceName, string> = {
  ISKRA: 'Искра',
  KAIN: 'Кайн',
  PINO: 'Пино',
  SAM: 'Сэм',
  ANHANTRA: 'Анхантра',
  HUNDUN: 'Хуньдун',
  ISKRIV: 'Искрив',
  MAKI: 'Маки',
  SIBYL: 'Сибилла',
};

const CouncilView: React.FC<CouncilViewProps> = ({ onClose }) => {
  const [topic, setTopic] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [responses, setResponses] = useState<CouncilResponse[]>([]);
  const [currentVoice, setCurrentVoice] = useState<VoiceName | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const startCouncil = useCallback(async () => {
    if (!topic.trim()) return;

    setIsRunning(true);
    setResponses([]);
    setIsComplete(false);

    try {
      for await (const response of executeCouncil(topic)) {
        setCurrentVoice(response.voice);
        setResponses(prev => [...prev, response]);
        // Small delay between voices for dramatic effect
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      setIsComplete(true);
    } catch (error) {
      console.error('Council failed:', error);
    } finally {
      setIsRunning(false);
      setCurrentVoice(null);
    }
  }, [topic]);

  const getVoiceIndex = (voice: VoiceName) => COUNCIL_ORDER.indexOf(voice);

  return (
    <div className="h-full w-full overflow-y-auto p-4 lg:p-8">
      <div className="max-w-4xl mx-auto pb-24 lg:pb-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
              <UsersIcon className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="font-serif text-3xl text-text">Совет Граней</h1>
              <p className="text-text-muted text-sm">COUNCIL — все голоса дебатируют</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-surface2 transition-colors text-text-muted"
            >
              ✕
            </button>
          )}
        </div>

        {/* Topic Input */}
        {!isRunning && responses.length === 0 && (
          <div className="glass-card p-6 mb-8">
            <label className="block text-sm text-text-muted mb-2">
              Тема для обсуждения
            </label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Введите вопрос или тему для Совета Граней..."
              className="w-full bg-surface2 border border-white/10 rounded-xl p-4 text-text resize-none focus:outline-none focus:border-primary/50 transition-colors"
              rows={3}
            />
            <button
              onClick={startCouncil}
              disabled={!topic.trim()}
              className="mt-4 w-full py-3 px-6 rounded-xl bg-primary text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              <SparkleIcon className="w-5 h-5" />
              Созвать Совет
            </button>
          </div>
        )}

        {/* Council Progress */}
        {(isRunning || responses.length > 0) && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              {COUNCIL_ORDER.map((voice, index) => {
                const isActive = currentVoice === voice;
                const isComplete = responses.some(r => r.voice === voice);
                return (
                  <div
                    key={voice}
                    className={`flex-1 h-2 rounded-full transition-all duration-500 ${
                      isComplete
                        ? VOICE_COLORS[voice].replace('text-', 'bg-').split(' ')[0]
                        : isActive
                        ? 'bg-white/50 animate-pulse'
                        : 'bg-surface2'
                    }`}
                  />
                );
              })}
            </div>
            {currentVoice && (
              <p className="text-center text-sm text-text-muted animate-pulse">
                Говорит {VOICE_NAMES_RU[currentVoice]}...
              </p>
            )}
          </div>
        )}

        {/* Responses */}
        <div className="space-y-4">
          {responses.map((response, index) => (
            <div
              key={index}
              className={`glass-card p-5 border ${VOICE_COLORS[response.voice]} animate-fade-in`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start gap-4">
                <div className={`text-3xl shrink-0 ${VOICE_COLORS[response.voice].split(' ')[0]}`}>
                  {response.symbol}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`font-serif font-bold ${VOICE_COLORS[response.voice].split(' ')[0]}`}>
                      {VOICE_NAMES_RU[response.voice]}
                    </span>
                    <span className="text-xs text-text-muted">
                      #{getVoiceIndex(response.voice) + 1}
                    </span>
                  </div>
                  <p className="text-text/90 leading-relaxed whitespace-pre-wrap">
                    {response.message}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Synthesis highlight */}
        {isComplete && responses.length > 0 && (
          <div className="mt-8 p-6 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <SparkleIcon className="w-5 h-5 text-primary" />
              <span className="font-serif font-bold text-primary">Совет завершён</span>
            </div>
            <p className="text-text-muted text-sm">
              Все грани высказались. Финальный синтез от Искры выше.
              Используйте эти перспективы для принятия решения.
            </p>
            <button
              onClick={() => {
                setResponses([]);
                setTopic('');
                setIsComplete(false);
              }}
              className="mt-4 py-2 px-4 rounded-lg border border-white/10 text-text-muted hover:text-text hover:border-white/20 transition-colors"
            >
              Новый Совет
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CouncilView;
