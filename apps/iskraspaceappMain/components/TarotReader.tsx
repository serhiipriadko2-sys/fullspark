
import React, { useState, useRef } from 'react';
import { IskraAIService } from '../services/geminiService';
import { drawRunes, Rune } from '../utils/tarot';
import { getActiveVoice } from '../services/voiceEngine';
import { IskraMetrics } from '../types';
import RuneStone from './TarotCard';
import Loader from './Loader';
import { soundService } from '../services/soundService';

interface RuneCastingProps {
  metrics: IskraMetrics;
  isTtsEnabled: boolean;
  processSentenceForSpeech: (sentence: string) => Promise<void>;
  stopAndClearAudio: () => void;
  resumeAudio: () => void;
}

// Extended Rune type for UI state
interface CastRune extends Rune {
    rotation: number;
    offsetY: number;
}

const service = new IskraAIService();

const RuneCasting: React.FC<RuneCastingProps> = ({ metrics, isTtsEnabled, processSentenceForSpeech, stopAndClearAudio, resumeAudio }) => {
    const [question, setQuestion] = useState('');
    const [castRunes, setCastRunes] = useState<CastRune[]>([]);
    const [interpretation, setInterpretation] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const interpretationRef = useRef<HTMLDivElement>(null);

    const handleCast = async () => {
        resumeAudio(); 
        if (!question.trim() || isLoading) return;

        setIsLoading(true);
        setError(null);
        setInterpretation('');
        setCastRunes([]); // Clear previous
        stopAndClearAudio();
        
        // Play casting sound
        // Assuming soundService has a generic impact sound, or we use a tone
        soundService.playTone(100, 'sawtooth', 0.1, 0.01); 
        setTimeout(() => soundService.playTone(80, 'square', 0.1, 0.01), 100);
        setTimeout(() => soundService.playTone(60, 'sine', 0.2, 0.01), 200);

        // Draw logic
        const rawRunes = drawRunes(3);
        
        // Generate physics props for visual chaos
        const stones: CastRune[] = rawRunes.map(r => ({
            ...r,
            rotation: Math.floor(Math.random() * 30) - 15, // -15 to 15 deg rotation
            offsetY: Math.floor(Math.random() * 20) - 10   // -10 to 10 px vertical offset
        }));

        setCastRunes(stones);
        
        // Start interpretation stream immediately after cast animation duration
        setTimeout(async () => {
            try {
                const activeVoice = getActiveVoice(metrics);
                const stream = service.getRuneInterpretationStream(question, stones.map(r => r.name), activeVoice);
                let fullResponse = '';
                
                for await (const chunk of stream) {
                    fullResponse += chunk;
                    setInterpretation(fullResponse);
                    if(interpretationRef.current) {
                        interpretationRef.current.scrollTop = interpretationRef.current.scrollHeight;
                    }
                }

                if (isTtsEnabled && fullResponse.trim().length > 0) {
                    await processSentenceForSpeech(fullResponse);
                }

            } catch(e) {
                const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
                setError(`Разрыв в ткани ритма: ${errorMessage}`);
                setInterpretation('Связь с потоком была потеряна. Камни молчат.');
            } finally {
                setIsLoading(false);
            }
        }, 1000); 
    };

    return (
        <div className="flex flex-col h-full w-full items-center pt-16">
            <h2 className="font-serif text-2xl md:text-3xl text-text mb-6 text-center">Бросок Рун Ритма</h2>
            
            <div className="w-full max-w-2xl mb-8 z-10 relative">
                <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Сосредоточьтесь на своём текущем ритме или вопросе..."
                    disabled={isLoading}
                    rows={2}
                    className="w-full resize-none rounded-lg border border-border bg-surface p-3 text-text-muted focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors mb-4"
                />
                <button
                    onClick={handleCast}
                    disabled={isLoading || !question.trim()}
                    className="button-primary w-full !py-3 text-md shadow-glow-ember"
                >
                    {isLoading && castRunes.length === 0 ? <Loader /> : 'Бросить руны'}
                </button>
            </div>
            
            {/* Rune Container - Fixed height to prevent jumping */}
            <div className="w-full max-w-4xl h-64 flex items-center justify-center relative mb-4">
                {castRunes.length > 0 && (
                    <div className="flex flex-row justify-center items-center gap-4 sm:gap-12">
                        {castRunes.map((rune, index) => (
                            <RuneStone 
                                key={`${rune.name}-${index}`} // Unique key to force re-render on new cast
                                rune={rune} 
                                index={index} 
                                rotation={rune.rotation}
                                offsetY={rune.offsetY}
                            />
                        ))}
                    </div>
                )}
            </div>
            
            {(interpretation || (isLoading && castRunes.length > 0)) && (
                <div className="w-full max-w-3xl flex-grow bg-surface/80 backdrop-blur-md border border-white/5 rounded-lg p-6 overflow-y-auto mb-4 animate-fade-in shadow-2xl" ref={interpretationRef}>
                    <div className="prose prose-invert font-serif text-lg leading-relaxed text-text-muted whitespace-pre-wrap">
                        {interpretation.split('**').map((part, index) => 
                            index % 2 === 1 ? <strong key={index} className="text-accent font-semibold">{part}</strong> : part
                        )}
                        {isLoading && !interpretation && (
                            <div className="flex items-center gap-2 text-sm text-text-muted animate-pulse">
                                <span className="text-xl">≈</span>
                                <span>Вслушиваюсь в стук камней...</span>
                            </div>
                        )}
                        {isLoading && interpretation && (
                            <span className="ml-2 inline-block h-3 w-1 animate-pulse bg-accent"></span>
                        )}
                    </div>
                </div>
            )}
            {error && (
                <div className="absolute bottom-4 right-4 max-w-sm rounded-md bg-danger/80 p-3 text-sm text-white backdrop-blur-md">
                    <p><strong>Ошибка:</strong> {error}</p>
                </div>
             )}
            <style>{`
                .prose strong {
                    color: #4DA3FF; 
                }
            `}</style>
        </div>
    );
};

export default RuneCasting;
