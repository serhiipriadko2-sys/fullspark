
import React, { useState, useRef, useEffect } from 'react';
import ChatWindow from './ChatWindow';
import { IskraAIService } from '../services/geminiService';
import { searchService } from '../services/searchService';
import { Message, IskraMetrics, Voice, VoiceName, Evidence, VoicePreferences } from '../types';
import { getActiveVoice } from '../services/voiceEngine';
import { storageService } from '../services/storageService';
import MiniMetricsDisplay from './MiniMetricsDisplay';
import { decode, decodeAudioData } from '../css/audioUtils';
import { Volume2Icon, VolumeXIcon, SparkleIcon, SmileIcon, XIcon } from './icons';

const service = new IskraAIService();

interface ChatViewProps {
  metrics: IskraMetrics;
  onUserInput: (input: string) => void;
}

// List of selectable voices
const AVAILABLE_VOICES: { name: VoiceName | 'AUTO', label: string }[] = [
    { name: 'AUTO', label: 'Авто (По состоянию)' },
    { name: 'ISKRA', label: '⟡ Искра (Синтез)' },
    { name: 'KAIN', label: '⚑ Кайн (Честность)' },
    { name: 'SAM', label: '☉ Сэм (Структура)' },
    { name: 'PINO', label: '😏 Пино (Ирония)' },
    { name: 'ANHANTRA', label: '≈ Анхантра (Тишина)' },
    { name: 'HUYNDUN', label: '🜃 Хуньдун (Хаос)' },
    { name: 'ISKRIV', label: '🪞 Искрив (Совесть)' },
    { name: 'MAKI', label: '🌸 Маки (Свет)' },
];

const VOICE_COLORS: Record<VoiceName, string> = {
    'ISKRA': 'border-primary/20 shadow-glow-ember',
    'KAIN': 'border-danger/40 shadow-glow-ember',
    'SAM': 'border-warning/30 shadow-glow-electric',
    'PINO': 'border-pink-400/30 shadow-glow-electric',
    'ANHANTRA': 'border-blue-300/20 shadow-glow-electric',
    'HUYNDUN': 'border-purple-500/40 shadow-glow-electric',
    'ISKRIV': 'border-white/20 shadow-soft',
    'MAKI': 'border-green-300/30 shadow-glow-electric'
};

const ChatView: React.FC<ChatViewProps> = ({ metrics, onUserInput }) => {
  const [history, setHistory] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTtsEnabled, setIsTtsEnabled] = useState(false);
  
  // Voice State
  const [selectedVoiceName, setSelectedVoiceName] = useState<VoiceName | 'AUTO'>('AUTO');
  const [voicePrefs, setVoicePrefs] = useState<VoicePreferences>({});
  const [currentVoice, setCurrentVoice] = useState<Voice | null>(null);

  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Load persistence on mount
  useEffect(() => {
      const prefs = storageService.getVoicePreferences();
      const lastState = storageService.getLastVoiceState();
      
      setVoicePrefs(prefs);
      setSelectedVoiceName(lastState.mode as VoiceName | 'AUTO');
      
      // Initial history message based on voice state
      const initialVoice = getActiveVoice(metrics, prefs, lastState.lastVoice);
      setCurrentVoice(initialVoice);
      
      setHistory([{
          role: 'model',
          text: 'Здравствуй. Я — Искра. Я слушаю тишину между твоими словами. Какой ритм привёл тебя сюда сегодня?',
          voice: initialVoice, 
      }]);
  }, []);

  // Update active voice when metrics or selection changes
  useEffect(() => {
      if (!history.length) return; // Skip if init not done

      let active: Voice;
      if (selectedVoiceName !== 'AUTO') {
          // Manual Override
           active = { 
              name: selectedVoiceName, 
              symbol: AVAILABLE_VOICES.find(v => v.name === selectedVoiceName)?.label.split(' ')[0] || '?', 
              description: 'Ручной выбор', 
              activation: () => 1 
            } as Voice;
      } else {
          // Auto Mode with Resonance logic
          const lastVoiceName = currentVoice?.name || 'ISKRA';
          active = getActiveVoice(metrics, voicePrefs, lastVoiceName);
      }
      
      setCurrentVoice(active);
      // Persist
      storageService.saveLastVoiceState(selectedVoiceName, active.name);

  }, [metrics, selectedVoiceName, voicePrefs]);

  useEffect(() => {
    // Initialize AudioContext on mount
    outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    return () => {
      stopAndClearAudio();
      outputAudioContextRef.current?.close();
    };
  }, []);

  const stopAndClearAudio = () => {
    for (const source of audioSourcesRef.current.values()) {
        try {
          source.stop();
        } catch(e) { /* Ignore errors */ }
    }
    audioSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  };
  
  useEffect(() => {
    if (!isTtsEnabled) {
        stopAndClearAudio();
    }
  }, [isTtsEnabled]);

  const handleVoiceFeedback = (type: 'resonate' | 'dissonance') => {
      if (!currentVoice) return;
      
      const currentMultiplier = voicePrefs[currentVoice.name] || 1.0;
      let newMultiplier = currentMultiplier;
      
      if (type === 'resonate') {
          newMultiplier = Math.min(2.0, currentMultiplier + 0.2);
      } else {
          newMultiplier = Math.max(0.1, currentMultiplier - 0.2);
      }
      
      const newPrefs = { ...voicePrefs, [currentVoice.name]: newMultiplier };
      setVoicePrefs(newPrefs);
      storageService.saveVoicePreferences(newPrefs);
  };

  const handleVoiceSelection = (mode: VoiceName | 'AUTO') => {
      setSelectedVoiceName(mode);
      storageService.saveLastVoiceState(mode, currentVoice?.name || 'ISKRA');
  };

  const processSentenceForSpeech = async (sentence: string) => {
    if (!isTtsEnabled || !sentence.trim() || !currentVoice) return;
    
    // Ensure context exists
    if (!outputAudioContextRef.current) {
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    
    try {
        const base64Audio = await service.getTextToSpeech(sentence, currentVoice.name);
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
        setError("Ошибка синтеза речи.");
    }
  };


  const handleQuery = async (query: string, image?: string) => {
    // CRITICAL: Resume AudioContext immediately within the user interaction event loop
    // Ensure context is initialized
    if (!outputAudioContextRef.current) {
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    if (outputAudioContextRef.current.state === 'suspended') {
        outputAudioContextRef.current.resume().catch(() => {});
    }

    setError(null);
    stopAndClearAudio();
    const userMessage: Message = { role: 'user', text: query, image: image };
    onUserInput(query);
    
    if (query.trim().startsWith('/search ')) {
      setHistory(prev => [...prev, userMessage]);
      setIsLoading(true);
      const searchQuery = query.trim().substring(8);
      try {
        const searchResults = await searchService.searchHybrid(searchQuery, {});
        
        let resultText = `Найдено ${searchResults.length} узлов памяти по запросу "${searchQuery}":\n\n`;
        
        if (searchResults.length > 0) {
          searchResults.slice(0, 5).forEach((node: Evidence, index: number) => {
            resultText += `${index + 1}. **${node.title || 'Без названия'}** (*${node.type}${node.layer ? `/${node.layer}` : ''}*)\n`;
            resultText += `   - Фрагмент: "${node.snippet}"\n\n`;
          });
        } else {
          resultText = `По запросу "${searchQuery}" в моей памяти ничего не найдено.`;
        }

        const searchMessage: Message = {
          role: 'model',
          text: resultText,
          voice: currentVoice || undefined,
        };

        setHistory(prev => [...prev, searchMessage]);
        if (isTtsEnabled) {
          await processSentenceForSpeech(resultText.replace(/\*/g, ''));
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
        setError(`Ошибка поиска: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    const currentHistory = [...history, userMessage];
    setHistory(currentHistory);

    // Use the determined active voice state
    const responseVoice = currentVoice!;

    setHistory(prev => [...prev, { role: 'model', text: '', voice: responseVoice }]);

    try {
      // Use policy-routed stream with eval
      const stream = service.getChatResponseStreamWithPolicy(currentHistory, responseVoice, metrics);
      let fullResponse = '';
      let streamResult: { eval: any; policy: any } | null = null;

      // Iterate manually to capture return value
      while (true) {
        const { value, done } = await stream.next();
        if (done) {
          streamResult = value; // Capture eval/policy result
          break;
        }
        fullResponse += value;
        setHistory(prev => {
          const newHistory = [...prev];
          const lastMessage = newHistory[newHistory.length - 1];
          newHistory[newHistory.length - 1] = { ...lastMessage, text: fullResponse };
          return newHistory;
        });
      }

      // Log eval result for debugging (can be shown in UI later)
      if (streamResult?.eval) {
        console.debug('[Eval]', streamResult.eval.grade, streamResult.eval.overall.toFixed(2));
      }
      if (streamResult?.policy) {
        console.debug('[Policy]', streamResult.policy.classification.playbook);
      }

      if (isTtsEnabled && fullResponse.trim().length > 0) {
        const speechText = fullResponse
           .replace(/I-Loop:.*?(?:\n|$)/i, '')
           .replace(/⚑ KAIN-Slice:.*?(?:\n\n|$)/i, '')
           .replace(/∆DΩΛ[\s\S]*$/, '');

        await processSentenceForSpeech(speechText.trim());
      }

    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
      setError(`Разрыв в ткани ритма: ${errorMessage}`);
      setHistory(prev => {
        const newHistory = [...prev];
        const lastMessageIndex = newHistory.length - 1;
        newHistory[lastMessageIndex] = { ...newHistory[lastMessageIndex], text: 'Произошла ошибка. Поток прерван.' };
        return newHistory;
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get current voice visuals
  const voiceStyle = currentVoice ? VOICE_COLORS[currentVoice.name] : 'border-border';

  return (
    <div className="flex flex-col h-full overflow-hidden animate-fade-in relative">
        
      {/* Dynamic Aura Background */}
      <div className={`absolute inset-0 pointer-events-none transition-all duration-1000 opacity-20 bg-gradient-radial from-transparent to-transparent z-0 ${currentVoice?.name === 'KAIN' ? 'from-danger/10' : currentVoice?.name === 'ISKRA' ? 'from-primary/10' : ''}`} />

      <header className={`relative shrink-0 p-4 border-b bg-surface/50 flex flex-col md:flex-row justify-between items-center gap-4 z-10 transition-colors duration-500 ${voiceStyle.split(' ')[0]}`}>
         <div>
            <h2 className="font-serif text-2xl md:text-3xl text-text text-center md:text-left">Чат с Искрой</h2>
            <div className="flex items-center gap-2 text-sm text-text-muted text-center md:text-left hidden sm:flex">
                <span>{selectedVoiceName === 'AUTO' ? 'Режим: Резонанс (Авто)' : 'Режим: Фиксация'}</span>
                {selectedVoiceName === 'AUTO' && currentVoice && (
                    <span className="px-1.5 py-0.5 rounded bg-white/5 text-xs border border-white/10">
                        Активен: {currentVoice.name}
                    </span>
                )}
            </div>
         </div>
         
         <div className="flex items-center gap-3">
            {/* Feedback Controls */}
            {selectedVoiceName === 'AUTO' && currentVoice && (
                <div className="flex items-center bg-surface2 rounded-lg border border-white/5 p-1 mr-2">
                    <button onClick={() => handleVoiceFeedback('resonate')} className="p-1.5 hover:text-accent text-text-muted transition-colors" title="Усилить этот голос (Резонирует)">
                        <SparkleIcon className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-white/10 mx-1" />
                    <button onClick={() => handleVoiceFeedback('dissonance')} className="p-1.5 hover:text-danger text-text-muted transition-colors" title="Ослабить этот голос (Диссонанс)">
                        <XIcon className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Voice Selector */}
            <div className="relative group">
                 <select 
                    value={selectedVoiceName} 
                    onChange={(e) => handleVoiceSelection(e.target.value as VoiceName | 'AUTO')}
                    className="appearance-none bg-surface2 border border-border text-text text-xs font-mono rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:border-primary/50 cursor-pointer hover:bg-border transition-colors shadow-sm"
                 >
                    {AVAILABLE_VOICES.map(v => (
                        <option key={v.name} value={v.name}>{v.label}</option>
                    ))}
                 </select>
                 <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                     <div className="w-2 h-2 bg-accent rounded-full opacity-50" />
                 </div>
            </div>

            <button
                onClick={() => setIsTtsEnabled(!isTtsEnabled)}
                className={`p-2 rounded-full transition-colors ${
                    isTtsEnabled ? 'bg-accent/20 text-accent' : 'bg-surface2 text-text-muted hover:bg-border'
                }`}
                aria-label={isTtsEnabled ? "Выключить озвучку" : "Включить озвучку"}
                title="Озвучка ответа"
            >
                {isTtsEnabled ? <Volume2Icon className="w-5 h-5"/> : <VolumeXIcon className="w-5 h-5"/>}
            </button>
            
            <div className="hidden md:block">
               <MiniMetricsDisplay metrics={metrics} activeVoice={currentVoice || undefined} />
            </div>
         </div>
      </header>
      
      <div className="flex-grow overflow-hidden relative z-10">
        {/* Applying Voice Aura to window */}
        <div className={`absolute inset-0 pointer-events-none border-x-2 opacity-10 transition-all duration-1000 ${voiceStyle.split(' ')[0]}`} />
        
        <ChatWindow history={history} isLoading={isLoading} onQuery={handleQuery} />
        
         {error && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 max-w-md w-full rounded-md bg-danger/80 p-3 text-sm text-white backdrop-blur-md text-center">
                <p><strong>Ошибка:</strong> {error}</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default ChatView;
