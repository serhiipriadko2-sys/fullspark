
import React, { useState, useRef, useEffect } from 'react';
import { IskraAIService } from '../services/geminiService';
import { decode, decodeAudioData } from '../css/audioUtils';
import RuneCasting from './TarotReader';
import { IskraMetrics } from '../types';
import { getActiveVoice } from '../services/voiceEngine';
import MiniMetricsDisplay from './MiniMetricsDisplay';

const service = new IskraAIService();

interface RuneViewProps {
    metrics: IskraMetrics;
}

const RuneView: React.FC<RuneViewProps> = ({ metrics }) => {
    const [isTtsEnabled, setIsTtsEnabled] = useState(false);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const nextStartTimeRef = useRef(0);
    const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

    const activeVoice = getActiveVoice(metrics);

    useEffect(() => {
        // Initialize AudioContext on component mount
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

        // Cleanup on unmount
        return () => {
            stopAndClearAudio();
            outputAudioContextRef.current?.close();
        };
    }, []);

    const processSentenceForSpeech = async (sentence: string) => {
        if (!isTtsEnabled || !sentence.trim()) return;
        
        if (!outputAudioContextRef.current) {
             outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }

        try {
            const base64Audio = await service.getTextToSpeech(sentence, activeVoice.name); // Pass voice name
            const outputCtx = outputAudioContextRef.current;
            
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
            
            const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
            const source = outputAudioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputCtx.destination);
            
            source.addEventListener('ended', () => {
                audioSourcesRef.current.delete(source);
            });

            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += audioBuffer.duration;
            audioSourcesRef.current.add(source);
        } catch (error) {
            console.error("Error processing sentence for speech:", error);
        }
    };

    const stopAndClearAudio = () => {
        for (const source of audioSourcesRef.current.values()) {
            try {
              source.stop();
            } catch(e) {
                // Ignore errors from stopping already-stopped sources
            }
        }
        audioSourcesRef.current.clear();
        nextStartTimeRef.current = 0;
    };
    
    const resumeAudio = () => {
        if (!outputAudioContextRef.current) {
             outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        if (outputAudioContextRef.current.state === 'suspended') {
            outputAudioContextRef.current.resume().catch(() => {});
        }
    };
    
    // When TTS is toggled off, stop any playing audio.
    useEffect(() => {
        if (!isTtsEnabled) {
            stopAndClearAudio();
        }
    }, [isTtsEnabled]);

    return (
        <div className="flex flex-col h-full p-4 sm:p-6 items-center overflow-y-auto relative pb-24 lg:pb-6">
            <div className="absolute top-4 left-6 z-20">
                <MiniMetricsDisplay metrics={metrics} activeVoice={activeVoice}/>
            </div>
            <div className="absolute top-4 right-6 z-20 flex items-center space-x-3" role="presentation">
                <label
                    htmlFor="tts-toggle"
                    className={`text-sm font-semibold transition-colors cursor-pointer ${isTtsEnabled ? 'text-accent' : 'text-text-muted'}`}
                >
                    Озвучить ответ
                </label>
                <button
                    id="tts-toggle"
                    onClick={() => setIsTtsEnabled(!isTtsEnabled)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-pill border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-bg ${
                    isTtsEnabled ? 'bg-primary' : 'bg-surface2'
                    }`}
                    role="switch"
                    aria-checked={isTtsEnabled}
                >
                    <span
                    className={`inline-block h-5 w-5 transform rounded-pill bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isTtsEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                    />
                </button>
            </div>
            
            <RuneCasting
                metrics={metrics}
                isTtsEnabled={isTtsEnabled}
                processSentenceForSpeech={processSentenceForSpeech}
                stopAndClearAudio={stopAndClearAudio}
                resumeAudio={resumeAudio}
            />
        </div>
    );
};

export default RuneView;
