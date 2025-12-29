
import React, { useState, useEffect, useRef } from 'react';
import { IskraAIService } from '../services/geminiService';
import { searchService } from '../services/searchService';
import { memoryService } from '../services/memoryService';
import { IskraMetrics, DeepResearchReport, MemoryNode } from '../types';
import Loader from './Loader';
import { FileSearchIcon, TriangleIcon, SparkleIcon } from './icons';
import MiniMetricsDisplay from './MiniMetricsDisplay';
import { getActiveVoice } from '../services/voiceEngine';

const service = new IskraAIService();

type ResearchStatus = 'IDLE' | 'SEARCHING' | 'SYNTHESIZING' | 'GENERATING' | 'DONE' | 'ERROR';
type ResearchMode = 'research' | 'audit';

interface DeepResearchViewProps {
  metrics: IskraMetrics;
}

const NeuralScanner: React.FC<{ nodes: MemoryNode[]; mode: ResearchMode }> = ({ nodes, mode }) => {
    const colorClass = mode === 'audit' ? 'bg-danger' : 'bg-accent';
    const glowClass = mode === 'audit' ? 'shadow-glow-ember' : 'shadow-glow-electric';
    
    return (
        <div className="w-full h-64 relative overflow-hidden bg-black/40 rounded-xl border border-white/5 p-4">
            <div className={`absolute inset-0 bg-grid-white/[0.02] bg-[length:20px_20px]`} />
            <div className="absolute inset-0 flex items-center justify-center">
                 <div className={`w-full max-w-md grid grid-cols-6 gap-2 opacity-80`}>
                     {nodes.slice(0, 24).map((_node, i) => (
                         <div 
                            key={i} 
                            className={`w-2 h-2 rounded-full animate-pulse ${colorClass} ${glowClass}`}
                            style={{ 
                                animationDelay: `${i * 0.1}s`,
                                opacity: 0.3 + Math.random() * 0.7
                            }}
                         />
                     ))}
                 </div>
            </div>
            <div className="absolute bottom-4 left-4 font-mono text-xs text-text-muted">
                Scanning context nodes... [{nodes.length}]
            </div>
             {/* Scanning Line */}
            <div className={`absolute top-0 left-0 w-full h-1 ${colorClass} shadow-[0_0_20px_currentColor] animate-[scan_2s_linear_infinite] opacity-50`} />
            <style>{`
                @keyframes scan {
                    0% { top: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
            `}</style>
        </div>
    );
}

const ReportDisplay: React.FC<{ report: DeepResearchReport; onSave: () => void; mode: ResearchMode }> = ({ report, onSave, mode }) => {
    const theme = mode === 'audit' 
        ? { text: 'text-danger', border: 'border-danger/30', bg: 'bg-danger/5', accent: 'text-text-muted' }
        : { text: 'text-primary', border: 'border-primary/30', bg: 'bg-primary/5', accent: 'text-accent' };

    return (
        <div className="w-full max-w-4xl mx-auto space-y-8 animate-fade-in">
            <header className="text-center relative overflow-hidden p-6 rounded-2xl border border-white/5">
                <div className={`absolute inset-0 ${theme.bg} blur-3xl opacity-20`} />
                <span className={`relative z-10 text-xs font-mono uppercase tracking-widest ${theme.text} border ${theme.border} px-2 py-1 rounded-md mb-4 inline-block`}>
                    {mode === 'audit' ? 'ПРОТОКОЛ АУДИТА' : 'ОТЧЕТ ИССЛЕДОВАНИЯ'}
                </span>
                <h3 className={`relative z-10 font-serif text-3xl md:text-4xl text-text mt-2`}>{report.title}</h3>
            </header>
            
            <div className={`card ${mode === 'audit' ? 'border-l-4 border-l-danger' : ''}`}>
                <h4 className={`font-serif text-xl ${theme.text} mb-4`}>{mode === 'audit' ? 'Вскрытие Реальности' : 'Синтез Ядра'}</h4>
                <p className="font-serif text-lg text-text/90 leading-relaxed whitespace-pre-wrap">{report.synthesis}</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
                <div className="card">
                    <h4 className={`font-serif text-xl ${theme.accent} mb-4`}>Паттерны</h4>
                    <ul className="list-none space-y-3">
                        {report.keyPatterns.map((item, i) => (
                            <li key={i} className="flex items-start p-2 bg-white/5 rounded-lg">
                                <span className={`mr-3 mt-1 ${theme.text}`}>⟡</span>
                                <span className="text-text-muted text-sm">{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                 <div className="card">
                    <h4 className="font-serif text-xl text-danger mb-4">Точки Напряжения</h4>
                    <ul className="list-none space-y-3">
                        {report.tensionPoints.map((item, i) => (
                            <li key={i} className="flex items-start p-2 bg-danger/10 border border-danger/20 rounded-lg">
                                <span className="mr-3 mt-1 text-danger">⚑</span>
                                <span className="text-text-muted text-sm">{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="card">
                <h4 className="font-serif text-xl text-purple-400 mb-4">Невидимые Связи</h4>
                <ul className="list-none space-y-2">
                    {report.unseenConnections.map((item, i) => <li key={i} className="flex items-start"><span className="mr-2 mt-1 text-purple-400">≈</span><span className="text-text-muted">{item}</span></li>)}
                </ul>
            </div>

            <div className="card bg-surface2 text-center border-t-4 border-accent">
                <h4 className="font-serif text-xl text-accent mb-4">Вопрос для Рефлексии</h4>
                <p className="font-serif text-2xl text-text italic">"{report.reflectionQuestion}"</p>
            </div>

            <div className="flex justify-center pt-4 pb-20">
                <button onClick={onSave} className="button-primary !px-8 !py-3 shadow-glow-primary">
                    Сохранить отчет в память
                </button>
            </div>
        </div>
    );
}

const ProcessingView: React.FC<{ status: ResearchStatus; log: string[]; mode: ResearchMode; contextNodes: MemoryNode[] }> = ({ status, log, mode, contextNodes }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [log]);

    const color = mode === 'audit' ? 'text-danger' : 'text-accent';
    const iconColor = mode === 'audit' ? 'text-danger' : 'text-primary';

    return (
        <div className="flex flex-col items-center justify-center w-full max-w-2xl animate-fade-in py-6">
            <div className="w-full mb-8">
                {contextNodes.length > 0 ? (
                    <NeuralScanner nodes={contextNodes} mode={mode} />
                ) : (
                    <div className="flex justify-center py-12">
                         <Loader />
                    </div>
                )}
            </div>
            
            <h3 className={`text-2xl font-serif font-bold mb-2 ${color}`}>
                {status === 'SEARCHING' ? (mode === 'audit' ? 'Сканирование уязвимостей...' : 'Нейронный поиск...') : 
                 status === 'SYNTHESIZING' ? (mode === 'audit' ? 'Вскрытие противоречий...' : 'Синтез паттернов...') : 
                 'Формирование отчета...'}
            </h3>
            
            <div className="w-full bg-black/40 rounded-lg border border-white/10 h-32 overflow-hidden relative font-mono text-xs p-4">
                 <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-black/40 to-transparent z-10" />
                 <div ref={scrollRef} className="h-full overflow-y-auto space-y-1 scrollbar-hide">
                     {log.map((entry, i) => (
                         <div key={i} className="flex gap-2 opacity-80">
                             <span className="text-white/30">[{new Date().toLocaleTimeString()}]</span>
                             <span className={entry.includes('Found') ? iconColor : 'text-text-muted'}>{entry}</span>
                         </div>
                     ))}
                     <div className="animate-pulse text-white/50">_</div>
                 </div>
                 <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/80 to-transparent z-10" />
            </div>
        </div>
    );
}

const DeepResearchView: React.FC<DeepResearchViewProps> = ({ metrics }) => {
  const [topic, setTopic] = useState('');
  const [status, setStatus] = useState<ResearchStatus>('IDLE');
  const [mode, setMode] = useState<ResearchMode>('research');
  const [report, setReport] = useState<DeepResearchReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processLog, setProcessLog] = useState<string[]>([]);
  const [contextNodes, setContextNodes] = useState<MemoryNode[]>([]);

  const activeVoice = getActiveVoice(metrics);

  const addLog = (msg: string) => setProcessLog(prev => [...prev, msg]);

  const handleStartResearch = async () => {
    if (!topic.trim()) return;

    setStatus('SEARCHING');
    setError(null);
    setReport(null);
    setProcessLog([]);
    setContextNodes([]);
    addLog(`Initiating ${mode === 'audit' ? 'AUDIT' : 'RESEARCH'} protocol...`);
    addLog(`Target topic: "${topic}"`);

    try {
      // Simulated delay for effect and log population
      await new Promise(r => setTimeout(r, 600));
      
      const searchResults = await searchService.searchHybrid(topic, { type: ['memory', 'journal', 'task'] });
      
      addLog(`Scanned index. Found ${searchResults.length} potential nodes.`);
      
      if (searchResults.length === 0) {
          addLog("WARNING: No relevant data found.");
          throw new Error("Не найдено данных для анализа.");
      }

      const archive = memoryService.getArchive();
      const shadow = memoryService.getShadow();
      const allMemoryNodes = [...archive, ...shadow];

      const nodes = searchResults.map(result => {
        if (result.type === 'memory') {
             const originalId = result.id.split('_').slice(2).join('_');
             return allMemoryNodes.find(node => node.id === originalId);
        }
        // Map pseudo-nodes for other types to visualize them
        return {
            id: result.id,
            title: result.title || 'Snippet',
            type: result.type === 'journal' ? 'insight' : 'event',
            layer: 'archive',
            timestamp: new Date(result.meta?.ts || Date.now()).toISOString(),
            content: result.snippet,
            evidence: []
        } as unknown as MemoryNode;
      }).filter((node): node is MemoryNode => node !== undefined && node !== null);

      setContextNodes(nodes);

      // Visualize "Reading" nodes
      for (let i = 0; i < Math.min(nodes.length, 5); i++) {
          await new Promise(r => setTimeout(r, 300)); // Fake reading delay
          addLog(`Reading node: ${nodes[i].title || 'Untitled'}`);
      }
      
      addLog(`Context loaded. ${nodes.length} nodes prepared.`);
      setStatus('SYNTHESIZING');
      addLog(mode === 'audit' ? "Running ISKRIV (🪞) heuristics..." : "Synthesizing ISKRA (⟡) patterns...");
      
      const researchReport = await service.performDeepResearch(topic, nodes, mode);
      
      setStatus('GENERATING'); 
      addLog("Report structure generated. Finalizing...");
      
      setTimeout(() => {
        setReport(researchReport);
        setStatus('DONE');
        addLog("Done.");
      }, 800);

    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
      setError(errorMessage);
      addLog(`ERROR: ${errorMessage}`);
      setStatus('ERROR');
    }
  };

  const handleSaveToMemory = () => {
    if (!report) return;
    memoryService.addArchiveEntry({
      title: `${mode === 'audit' ? 'Аудит' : 'Исследование'}: ${report.title}`,
      type: 'artifact',
      content: report,
      metrics: { ...metrics },
      tags: ['report', mode],
      evidence: [{
        source: `Deep Research on topic: "${topic}"`,
        inference: 'An AI-generated synthesis of memory nodes and user query.',
        fact: 'true',
        trace: 'DeepResearchView -> performDeepResearch()'
      }]
    });
    alert("Отчет сохранен в Архив Памяти.");
  };

  return (
    <div className="flex flex-col h-full p-4 sm:p-6 items-center overflow-y-auto pb-24 lg:pb-6">
        <header className="shrink-0 text-center relative w-full mb-8">
            <h2 className="font-serif text-2xl md:text-3xl text-text">Глубокое Исследование</h2>
            <p className="text-text-muted mt-2 max-w-2xl mx-auto">
                Погружение в память для поиска паттернов или аудит дрейфа.
            </p>
            <div className="absolute top-0 right-0 hidden md:block">
                <MiniMetricsDisplay metrics={metrics} activeVoice={activeVoice} />
            </div>
        </header>

        {/* Input Phase */}
        {(status === 'IDLE' || status === 'DONE' || status === 'ERROR') && (
            <div className="w-full max-w-3xl mb-8 animate-fade-in">
                
                {/* Mode Toggle */}
                <div className="flex justify-center mb-8">
                    <div className="bg-surface border border-border p-1 rounded-full flex relative">
                         <div 
                            className={`absolute top-1 bottom-1 w-[50%] bg-white/10 rounded-full transition-all duration-300 ${mode === 'audit' ? 'left-[49%]' : 'left-1'}`}
                         />
                         <button 
                            onClick={() => setMode('research')}
                            className={`relative z-10 px-6 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${mode === 'research' ? 'text-text' : 'text-text-muted'}`}
                         >
                             <SparkleIcon className="w-4 h-4" /> Исследование
                         </button>
                         <button 
                            onClick={() => setMode('audit')}
                            className={`relative z-10 px-6 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${mode === 'audit' ? 'text-danger' : 'text-text-muted'}`}
                         >
                             <TriangleIcon className="w-4 h-4" /> Аудит (Искрив)
                         </button>
                    </div>
                </div>

                <div className={`relative group rounded-2xl p-1 transition-all duration-500 ${mode === 'audit' ? 'bg-gradient-to-br from-danger/20 to-transparent' : 'bg-gradient-to-br from-primary/20 to-transparent'}`}>
                    <textarea
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder={mode === 'audit' ? "Что проверить на честность? (напр. 'мои цели на год')" : "Что исследовать? (напр. 'паттерны моей энергии')"}
                        disabled={status !== 'IDLE' && status !== 'DONE' && status !== 'ERROR'}
                        rows={3}
                        className="w-full resize-none rounded-xl border border-border bg-bg p-5 pr-32 text-lg font-serif text-text focus:border-white/20 focus:outline-none focus:ring-0 transition-colors shadow-deep"
                    />
                    <button
                        onClick={handleStartResearch}
                        disabled={!topic.trim()}
                        className={`absolute right-4 top-1/2 -translate-y-1/2 p-4 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                            mode === 'audit' 
                            ? 'bg-danger text-white shadow-glow-ember' 
                            : 'bg-primary text-black shadow-glow-primary'
                        }`}
                    >
                        {mode === 'audit' ? <TriangleIcon className="w-6 h-6" /> : <FileSearchIcon className="w-6 h-6" />}
                    </button>
                </div>
                
                {mode === 'audit' && (
                    <p className="text-center text-xs text-danger mt-3 font-mono opacity-70">
                        ⚑ Внимание: режим Аудита использует голос Искрива. Ожидайте жесткой правды.
                    </p>
                )}
                 {error && (
                    <p className="mt-4 text-center text-sm text-danger bg-danger/10 p-2 rounded-lg border border-danger/20">{error}</p>
                 )}
            </div>
        )}

        {/* Processing Phase */}
        {(status === 'SEARCHING' || status === 'SYNTHESIZING' || status === 'GENERATING') && (
            <ProcessingView status={status} log={processLog} mode={mode} contextNodes={contextNodes} />
        )}

        {/* Result Phase */}
        {report && status === 'DONE' && (
            <ReportDisplay report={report} onSave={handleSaveToMemory} mode={mode} />
        )}
    </div>
  );
};

export default DeepResearchView;
