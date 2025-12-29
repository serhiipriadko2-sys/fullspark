
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { memoryService } from '../services/memoryService';
import { searchService } from '../services/searchService';
import { MemoryNode, MemoryNodeType, SearchResult } from '../types';
import { XIcon, LayersIcon, DatabaseIcon, PlusIcon, FilePlus2Icon } from './icons';
import Loader from './Loader';
import MemoryGraph from './MemoryGraph';


const MEMORY_NODE_TYPES: MemoryNodeType[] = ['event', 'feedback', 'decision', 'insight', 'artifact'];

const MemoryView: React.FC = () => {
  const [archive, setArchive] = useState<MemoryNode[]>([]);
  const [shadow, setShadow] = useState<MemoryNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<MemoryNode | null>(null);
  
  // View Mode
  const [viewMode, setViewMode] = useState<'LIST' | 'GRAPH'>('LIST');
  
  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedType, setSelectedType] = useState<MemoryNodeType | 'all'>('all');

  // Create Node State
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<MemoryNodeType>('event');
  const [newLayer, setNewLayer] = useState<'archive' | 'shadow'>('shadow');
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMemory();
  }, []);

  const loadMemory = async () => {
        setIsLoading(true);
        await searchService.build(); // Pre-build index
        setArchive(memoryService.getArchive());
        setShadow(memoryService.getShadow());
        setIsLoading(false);
  }

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const results = await searchService.searchHybrid(searchTerm, {
      type: ['memory'],
      tags: selectedType === 'all' ? undefined : [`_type:${selectedType}`],
    });
    setSearchResults(results);
    setIsSearching(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      setFileError(null);

      // Size limit check (500KB to be safe with localStorage)
      if (file.size > 500 * 1024) {
          setFileError("Файл слишком велик для локальной памяти (>500KB).");
          return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
          const content = event.target?.result as string;
          setNewContent(content);
          // Auto-fill title if empty
          if (!newTitle) {
              setNewTitle(file.name);
          }
          // Auto-set type to artifact if it looks like code or config
          if (file.name.match(/\.(json|ts|js|py|md|csv)$/)) {
              setNewType('artifact');
          }
      };
      reader.onerror = () => {
          setFileError("Ошибка чтения файла.");
      };
      
      reader.readAsText(file);
      // Reset input to allow re-uploading same file if needed
      e.target.value = '';
  };

  const handleCreateNode = () => {
      if (!newTitle.trim() || !newContent.trim()) return;
      
      const partialNode: Partial<MemoryNode> = {
          title: newTitle,
          type: newType,
          content: newContent,
          evidence: [{
              source: 'Manual Entry (User)',
              inference: 'Direct input from Memory View.',
              fact: 'true',
              trace: `Created at ${new Date().toLocaleTimeString()}`
          }]
      };

      if (newLayer === 'archive') {
          memoryService.addArchiveEntry(partialNode);
      } else {
          memoryService.addShadowEntry(partialNode);
      }

      // Reset and Reload
      setIsCreating(false);
      setNewTitle('');
      setNewContent('');
      setNewType('event');
      setFileError(null);
      loadMemory();
  };

  const filteredArchive = useMemo(() => {
    if (selectedType === 'all') return archive;
    return archive.filter(node => node.type === selectedType);
  }, [archive, selectedType]);

  const filteredShadow = useMemo(() => {
    if (selectedType === 'all') return shadow;
    return shadow.filter(node => node.type === selectedType);
  }, [shadow, selectedType]);


  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString('ru-RU', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const NodeCard: React.FC<{ node: MemoryNode }> = ({ node }) => (
    <button
      onClick={() => setSelectedNode(node)}
      className="w-full text-left p-4 bg-surface rounded-lg hover:bg-surface2 transition-colors border border-border animate-fade-in"
    >
      <div className="flex justify-between items-start">
        <p className="font-semibold text-text text-lg font-serif">{node.title}</p>
        <span className={`px-2 py-0.5 text-xs rounded-pill font-mono ${node.layer === 'archive' ? 'bg-accent/20 text-accent' : 'bg-purple-500/20 text-purple-400'}`}>
          {node.layer}
        </span>
      </div>
      <p className="text-sm text-text-muted mt-1">{node.type}</p>
      <p className="text-xs text-text-muted mt-2">{formatDate(node.timestamp)}</p>
    </button>
  );

  const renderListContent = () => {
    if (searchTerm.trim()) {
        if (isSearching) {
            return <div className="text-center p-8"><Loader /></div>;
        }
        if (searchResults.length > 0) {
            return (
                <div className="mt-4 space-y-3">
                    {searchResults.map(r => (
                        <div key={r.id} className="rounded-lg border border-border bg-surface p-3 animate-fade-in">
                            <div className="flex justify-between items-center text-xs opacity-70">
                                <span>{r.type}{r.layer ? `/${r.layer}` : ''}</span>
                                <span className="font-mono">Score: {r.score.toFixed(2)}</span>
                            </div>
                            <div className="font-semibold mt-1 text-text">{r.title || 'Без названия'}</div>
                            <div className="text-sm text-text-muted mt-1 italic">"{r.snippet}"</div>
                        </div>
                    ))}
                </div>
            );
        }
        return <p className="text-text-muted text-center py-8">Ничего не найдено по запросу "{searchTerm}".</p>
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-grow overflow-hidden mt-4">
          <div className="flex flex-col h-full">
            <h3 className="font-serif text-xl text-accent mb-4 text-center md:text-left">Архив (Проверенные узлы)</h3>
            <div className="flex-grow overflow-y-auto pr-2 -mr-2 space-y-3 pb-24 lg:pb-0">
              {filteredArchive.length > 0 ? (
                filteredArchive.map(node => <NodeCard key={node.id} node={node} />)
              ) : (
                <p className="text-text-muted text-center py-8">Архив пуст.</p>
              )}
            </div>
          </div>
          <div className="flex flex-col h-full">
            <h3 className="font-serif text-xl text-purple-400 mb-4 text-center md:text-left">Тень (Гипотезы и паттерны)</h3>
            <div className="flex-grow overflow-y-auto pr-2 -mr-2 space-y-3 pb-24 lg:pb-0">
              {filteredShadow.length > 0 ? (
                 filteredShadow.map(node => <NodeCard key={node.id} node={node} />)
              ) : (
                <p className="text-text-muted text-center py-8">Тень пуста.</p>
              )}
            </div>
          </div>
        </div>
    );
  };

  return (
    <div className="flex flex-col h-full p-4 sm:p-6 overflow-hidden">
      <header className="shrink-0 text-center mb-6">
        <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-2xl md:text-3xl text-text">Память Искры</h2>
            <div className="flex gap-2">
                <button
                    onClick={() => setIsCreating(true)}
                    className="p-2 rounded-md bg-primary text-black hover:bg-primary/90 transition-colors shadow-glow-primary"
                    title="Добавить узел"
                >
                    <PlusIcon className="w-5 h-5" />
                </button>
                <div className="flex bg-surface rounded-lg p-1 border border-border">
                     <button 
                        onClick={() => setViewMode('LIST')}
                        className={`p-2 rounded-md transition-all ${viewMode === 'LIST' ? 'bg-surface2 text-primary shadow-sm' : 'text-text-muted hover:text-text'}`}
                        title="Список"
                     >
                         <DatabaseIcon className="w-5 h-5" />
                     </button>
                     <button 
                        onClick={() => setViewMode('GRAPH')}
                        className={`p-2 rounded-md transition-all ${viewMode === 'GRAPH' ? 'bg-surface2 text-primary shadow-sm' : 'text-text-muted hover:text-text'}`}
                        title="Гиперграф"
                     >
                         <LayersIcon className="w-5 h-5" />
                     </button>
                </div>
            </div>
        </div>

        <div className="mt-4 max-w-2xl mx-auto flex items-center gap-2">
            <input 
                type="text"
                placeholder="Поиск по названию или содержимому..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="w-full rounded-lg border border-border bg-surface px-4 py-2 text-text focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
            />
            <select
                value={selectedType}
                onChange={e => setSelectedType(e.target.value as any)}
                 className="rounded-lg border border-border bg-surface px-4 py-2 text-text focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
            >
                <option value="all">Все типы</option>
                {MEMORY_NODE_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                ))}
            </select>
             <button onClick={handleSearch} disabled={isSearching} className="button-primary !py-2 !px-4">
                {isSearching ? '...' : 'Поиск'}
            </button>
        </div>
      </header>

      {isLoading ? (
        <div className="m-auto"><Loader/></div>
      ) : (
        <div className="flex-grow overflow-y-auto flex flex-col pb-24 lg:pb-0">
            {viewMode === 'LIST' ? renderListContent() : (
                <div className="flex-grow border border-border rounded-2xl bg-black/20 p-4 relative overflow-hidden">
                    <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur-md p-2 rounded-lg text-xs font-mono text-text-muted">
                        Архив + Тень
                    </div>
                    <MemoryGraph nodes={[...filteredArchive, ...filteredShadow]} onSelectNode={setSelectedNode} />
                </div>
            )}
        </div>
      )}

      {/* Create Node Modal */}
      {isCreating && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={() => setIsCreating(false)}>
              <div className="w-full max-w-xl bg-surface2 border border-border rounded-2xl shadow-deep p-6 m-4" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="font-serif text-2xl text-text">Новый Узел Памяти</h3>
                      <button onClick={() => setIsCreating(false)}><XIcon className="w-6 h-6 text-text-muted hover:text-text" /></button>
                  </div>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs text-text-muted uppercase mb-1">Заголовок</label>
                          <input 
                              type="text" 
                              value={newTitle} 
                              onChange={e => setNewTitle(e.target.value)}
                              className="w-full bg-bg border border-white/10 rounded p-2 text-text focus:border-primary" 
                              placeholder="Название события или инсайта"
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs text-text-muted uppercase mb-1">Тип</label>
                              <select value={newType} onChange={e => setNewType(e.target.value as any)} className="w-full bg-bg border border-white/10 rounded p-2 text-text">
                                  {MEMORY_NODE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="block text-xs text-text-muted uppercase mb-1">Слой</label>
                              <select value={newLayer} onChange={e => setNewLayer(e.target.value as any)} className="w-full bg-bg border border-white/10 rounded p-2 text-text">
                                  <option value="shadow">Shadow (Гипотеза)</option>
                                  <option value="archive">Archive (Факт)</option>
                              </select>
                          </div>
                      </div>
                      <div>
                          <div className="flex justify-between items-center mb-1">
                              <label className="block text-xs text-text-muted uppercase">Содержание</label>
                              <button 
                                  onClick={() => fileInputRef.current?.click()}
                                  className="text-xs text-accent flex items-center gap-1 hover:text-white transition-colors"
                              >
                                  <FilePlus2Icon className="w-3 h-3" /> Загрузить файл
                              </button>
                              <input 
                                  type="file" 
                                  ref={fileInputRef}
                                  onChange={handleFileUpload}
                                  className="hidden"
                                  accept=".txt,.md,.json,.csv,.js,.ts,.py,.log"
                              />
                          </div>
                          {fileError && <div className="text-xs text-danger mb-2">{fileError}</div>}
                          <textarea 
                              value={newContent}
                              onChange={e => setNewContent(e.target.value)}
                              rows={5}
                              className="w-full bg-bg border border-white/10 rounded p-2 text-text focus:border-primary font-mono text-sm"
                              placeholder="Текст, данные или описание..."
                          />
                      </div>
                      
                      <div className="pt-4 flex justify-end">
                          <button onClick={handleCreateNode} className="button-primary px-6">Создать</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Node Detail Modal */}
      {selectedNode && (
         <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={() => setSelectedNode(null)}>
            <div className="w-full max-w-3xl bg-surface2 border border-border rounded-2xl shadow-deep p-6 m-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="font-serif text-2xl text-text">{selectedNode.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-0.5 text-xs rounded-pill font-mono ${selectedNode.layer === 'archive' ? 'bg-accent/20 text-accent' : 'bg-purple-500/20 text-purple-400'}`}>
                                {selectedNode.layer}
                            </span>
                            <span className="px-2 py-0.5 text-xs rounded-pill font-mono bg-border text-text-muted">{selectedNode.type}</span>
                            {selectedNode.facet && <span className="px-2 py-0.5 text-xs rounded-pill font-mono bg-surface text-text-muted">{selectedNode.facet}</span>}
                        </div>
                        <p className="text-xs text-text-muted mt-2">{formatDate(selectedNode.timestamp)}</p>
                    </div>
                     <button onClick={() => setSelectedNode(null)} className="text-text-muted hover:text-text">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="flex-grow overflow-y-auto pr-4 -mr-4 text-text-muted space-y-4">
                   <div>
                       <h4 className="font-semibold text-text-muted uppercase text-xs tracking-wider mb-2">Содержимое</h4>
                       <pre className="text-sm bg-bg p-3 rounded-md whitespace-pre-wrap font-mono overflow-x-auto">{JSON.stringify(selectedNode.content, null, 2)}</pre>
                   </div>
                    {selectedNode.metrics && (
                        <div>
                            <h4 className="font-semibold text-text-muted uppercase text-xs tracking-wider mb-2">Метрики в момент записи</h4>
                            <pre className="text-sm bg-bg p-3 rounded-md whitespace-pre-wrap font-mono">{JSON.stringify(selectedNode.metrics, null, 2)}</pre>
                        </div>
                    )}
                     {selectedNode.evidence && selectedNode.evidence.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-text-muted uppercase text-xs tracking-wider mb-2">Опоры (Evidence)</h4>
                             <div className="space-y-2">
                            {selectedNode.evidence.map((ev, i) => (
                                <div key={i} className="text-sm bg-bg p-3 rounded-md">
                                    <p><strong className="text-text-muted/80">Источник:</strong> {ev.source}</p>
                                    <p><strong className="text-text-muted/80">Вывод:</strong> {ev.inference}</p>
                                    <p><strong className="text-text-muted/80">Факт:</strong> {String(ev.fact)}</p>
                                    <p><strong className="text-text-muted/80">След:</strong> {ev.trace}</p>
                                </div>
                            ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default MemoryView;
