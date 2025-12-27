
import React, { useRef, useEffect, useState } from 'react';
import { Message } from '../types';
import InputField from './InputField';
import { SparkleIcon, UserIcon, TriangleIcon, ActivityIcon } from './icons';
import { soundService } from '../services/soundService';
import { parseIskraResponse } from '../utils/deltaValidator';

interface ChatWindowProps {
  history: Message[];
  isLoading: boolean;
  onQuery: (query: string, image?: string) => void;
}

// Basic Markdown Parser using Regex
const renderMarkdown = (text: string) => {
    if (!text) return null;

    // Split by double newlines for paragraphs
    const paragraphs = text.split(/\n\n+/);

    return paragraphs.map((paragraph, pIdx) => {
        // Lists
        if (paragraph.match(/^[-*]\s/m)) {
            const items = paragraph.split(/\n/).filter(l => l.trim());
            return (
                <ul key={pIdx} className="list-disc pl-5 mb-2 space-y-1 marker:text-accent">
                    {items.map((item, i) => (
                        <li key={i} dangerouslySetInnerHTML={{__html: parseInline(item.replace(/^[-*]\s/, ''))}} />
                    ))}
                </ul>
            );
        }
        
        // Headers (##)
        if (paragraph.startsWith('##')) {
             return <h3 key={pIdx} className="text-lg font-bold mt-4 mb-2 text-primary font-serif tracking-wide" dangerouslySetInnerHTML={{__html: parseInline(paragraph.replace(/^#+\s/, ''))}} />
        }
        
        // Bold line (Key: Value)
        if (paragraph.match(/^\*\*.+\*\*:/)) {
             return <p key={pIdx} className="mb-2" dangerouslySetInnerHTML={{__html: parseInline(paragraph)}} />
        }

        return <p key={pIdx} className="mb-3 min-h-[1em] leading-relaxed" dangerouslySetInnerHTML={{__html: parseInline(paragraph)}} />;
    });
};

// Sanitize text to prevent XSS attacks
const sanitizeText = (text: string): string => {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

// Parse inline styles: **bold**, *italic*
// Input is sanitized first to prevent XSS
const parseInline = (text: string) => {
    const sanitized = sanitizeText(text);
    return sanitized
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em class="text-accent/90 not-italic font-serif">$1</em>')
        .replace(/`([^`]+)`/g, '<code class="bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono text-warning border border-white/5">$1</code>');
};

const ChatWindow: React.FC<ChatWindowProps> = ({ history, isLoading, onQuery }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [typewriterBuffer, setTypewriterBuffer] = useState('');
  const lastMsgIndexRef = useRef(-1);
  const [loadingText, setLoadingText] = useState('Слушаю...');

  // Loading text cycle
  useEffect(() => {
      if (!isLoading) return;
      const texts = ['Вслушиваюсь...', 'Резонирую...', 'Ищу ответ...', 'Синтез...', '∆...'];
      let i = 0;
      const interval = setInterval(() => {
          setLoadingText(texts[i % texts.length]);
          i++;
      }, 800);
      return () => clearInterval(interval);
  }, [isLoading]);

  // Handle Auto-Scroll
  useEffect(() => {
    if (scrollRef.current) {
       const { scrollHeight, scrollTop, clientHeight } = scrollRef.current;
       // Auto-scroll if we are near bottom
       if (scrollHeight - scrollTop - clientHeight < 200) {
           scrollRef.current.scrollTo({ top: scrollHeight, behavior: 'smooth' });
       }
    }
  }, [history, typewriterBuffer, isLoading]);

  // Typewriter Effect Logic
  useEffect(() => {
      const lastMsg = history[history.length - 1];
      if (!lastMsg || lastMsg.role === 'user') {
          setTypewriterBuffer('');
          return;
      }
      
      if (lastMsg.role === 'model') {
          const fullText = lastMsg.text;
          
          if (lastMsgIndexRef.current !== history.length - 1) {
             setTypewriterBuffer('');
             lastMsgIndexRef.current = history.length - 1;
          }

          if (typewriterBuffer === fullText) return;

          const targetLength = fullText.length;
          const currentLength = typewriterBuffer.length;
          
          if (currentLength < targetLength) {
               const diff = targetLength - currentLength;
               const chunk = diff > 20 ? diff : 1; // Faster typewriter
               
               // Don't play sound every frame to avoid annoyance, maybe every 5th char
               if (chunk < 5 && currentLength % 3 === 0) soundService.playTypewriter();
               
               // Use timeout for typewriter pace if we are not streaming huge chunks
               if (chunk === 1) {
                   setTimeout(() => {
                       setTypewriterBuffer(fullText.slice(0, currentLength + chunk));
                   }, 10); 
               } else {
                   setTypewriterBuffer(fullText);
               }
          }
      }
  }, [history, typewriterBuffer]);


  return (
    <div className="flex h-full flex-col relative">
      <div ref={scrollRef} className="flex-grow overflow-y-auto p-4 pb-48 lg:pb-32 sm:p-8 space-y-8 scroll-smooth">
        {history.map((msg, index) => {
           const isLast = index === history.length - 1;
           const textToParse = (isLast && msg.role === 'model') ? (isLoading ? msg.text : typewriterBuffer || msg.text) : msg.text;
           
           const isUser = msg.role === 'user';
           const { content, signature, kainSlice, iLoop, validation } = !isUser
                ? parseIskraResponse(textToParse) 
                : { content: msg.text, signature: null, kainSlice: null, iLoop: null, validation: { isValid: true, missing: [] } };
           
           return (
            <div key={index} className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in group`}>
                
                {!isUser && (
                    <div className="flex flex-col items-center space-y-2 mt-1 shrink-0">
                         <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-gradient-to-br from-surface2 to-surface border border-white/10 flex items-center justify-center shadow-glow-ember group-hover:scale-105 transition-transform duration-300">
                             <span className="text-primary text-sm font-bold">{msg.voice?.symbol || <SparkleIcon className="w-4 h-4 lg:w-5 lg:h-5"/>}</span>
                         </div>
                         {/* Thread line */}
                         {index !== history.length - 1 && <div className="w-px h-full bg-gradient-to-b from-white/10 to-transparent -mb-4" />}
                    </div>
                )}

                <div className={`max-w-[90%] lg:max-w-[70%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                    {iLoop && (
                        <div className="text-[9px] font-mono text-text-muted/40 mb-1.5 pl-3 border-l-2 border-primary/20 uppercase tracking-widest">
                           {iLoop}
                        </div>
                    )}

                    {kainSlice && (
                        <div className="mb-3 w-full bg-danger/5 border-l-2 border-danger rounded-r-lg p-4 animate-slide-up backdrop-blur-sm relative overflow-hidden">
                            <div className="absolute inset-0 bg-danger/5 mix-blend-overlay" />
                            <div className="flex items-center gap-2 mb-2 relative z-10">
                                <span className="text-danger text-lg">⚑</span>
                                <span className="text-[10px] font-bold text-danger uppercase tracking-[0.2em]">Срез Честности</span>
                            </div>
                            <p className="text-sm text-text-muted font-serif italic relative z-10 border-l border-danger/20 pl-3">{kainSlice}</p>
                        </div>
                    )}

                    <div className={`
                        relative px-5 py-4 lg:px-7 lg:py-5 text-base leading-relaxed shadow-lg transition-all duration-300 flex flex-col gap-3
                        ${isUser 
                            ? 'bg-white/5 backdrop-blur-xl text-white rounded-3xl rounded-tr-sm border border-white/10 hover:bg-white/10' 
                            : 'bg-surface/60 backdrop-blur-md text-text-muted/90 rounded-3xl rounded-tl-sm border border-white/5 hover:border-white/10'
                        }
                    `}>
                        {/* Image Display */}
                        {msg.image && (
                            <div className="w-full max-w-sm rounded-xl overflow-hidden border border-white/10 mb-1">
                                <img src={msg.image} alt="User upload" className="w-full h-auto" />
                            </div>
                        )}

                        <div className={`whitespace-pre-wrap ${!isUser && 'font-serif text-lg text-text'}`}>
                            {isUser ? content : renderMarkdown(content)}
                            {isLoading && msg.role === 'model' && isLast && (
                                <span className="ml-1 inline-block w-1.5 h-4 bg-accent animate-pulse align-middle" />
                            )}
                        </div>
                    </div>
                    
                    {!isUser && signature && (
                        <div className={`mt-3 w-full backdrop-blur-md border rounded-xl p-4 text-xs font-mono space-y-2 animate-fade-in border-l-2 bg-black/20 shadow-inner ${validation.isValid ? 'border-white/5 border-l-success/50' : 'border-danger/20 border-l-danger'}`}>
                             {!validation.isValid && (
                                 <div className="flex items-center gap-2 mb-3 pb-2 border-b border-danger/20 text-danger">
                                     <TriangleIcon className="w-3 h-3" />
                                     <span className="font-bold uppercase tracking-wider">Нарушение целостности</span>
                                     <span className="opacity-70">({validation.missing.join(', ')})</span>
                                 </div>
                             )}
                             <div className="grid grid-cols-[min-content_1fr] gap-x-4 gap-y-1.5 items-baseline">
                                 <span className="text-primary font-bold">∆</span> <span className="text-text-muted leading-relaxed">{signature.delta}</span>
                                 <span className="text-accent font-bold">D</span> <span className="text-text-muted leading-relaxed">{signature.depth}</span>
                                 <span className="text-warning font-bold">Ω</span> <span className="text-text-muted leading-relaxed">{signature.omega}</span>
                                 <span className="text-success font-bold">Λ</span> <span className="text-text-muted leading-relaxed">{signature.lambda}</span>
                             </div>
                        </div>
                    )}
                    
                    {/* Timestamp / Status */}
                    <div className="mt-1 px-2 text-[10px] text-text-muted/30 font-mono">
                        {isUser ? 'Отправлено' : (isLoading && isLast ? <span className="animate-pulse text-accent">{loadingText}</span> : 'Принято')}
                    </div>
                </div>

                {isUser && (
                    <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mt-1 shrink-0">
                         <UserIcon className="w-4 h-4 lg:w-5 lg:h-5 text-text-muted" />
                    </div>
                )}
            </div>
          );
        })}
        
        {/* Spacer for bottom input */}
        <div className="h-4" />
      </div>
      
      {/* Floating Input Area */}
      <div className="absolute bottom-[80px] lg:bottom-0 left-0 right-0 p-4 lg:p-6 bg-gradient-to-t from-bg via-bg/95 to-transparent z-20">
        <div className="max-w-4xl mx-auto glass-panel rounded-2xl p-1.5 shadow-glow-electric border border-white/10 transition-all duration-300 focus-within:shadow-glow-primary focus-within:border-primary/30">
            <InputField onQuery={(q, img) => {
                soundService.playClick();
                onQuery(q, img);
            }} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
