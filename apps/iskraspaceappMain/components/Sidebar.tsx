
import React, { useEffect, useState } from 'react';
import { AppView } from '../App';
import { PulseIcon, ListTodoIcon, BookTextIcon, UsersIcon, MicIcon, SparkleIcon, BrainCircuitIcon, MessageCircleIcon, LayersIcon, DatabaseIcon, FileSearchIcon, BeaconIcon, MenuIcon, XIcon, IskraLogo, ScaleIcon, CircleIcon } from './icons';
import { soundService } from '../services/soundService';

interface SidebarProps {
  activeView: AppView;
  setView: (view: AppView) => void;
  compact?: boolean;
  mobile?: boolean;
  onOpenMenu?: () => void;
}

const NAV_ITEMS = [
  { id: 'PULSE', name: 'Пульс', icon: PulseIcon },
  { id: 'PLANNER', name: 'План', icon: ListTodoIcon },
  { id: 'CHAT', name: 'Чат', icon: MessageCircleIcon },
  { id: 'JOURNAL', name: 'Дневник', icon: BookTextIcon },
  { id: 'BEACON', name: 'Маяк', icon: BeaconIcon },
] as const;

const SECONDARY_ITEMS = [
    { id: 'DUO', name: 'Связь', icon: UsersIcon },
    { id: 'LIVE', name: 'Голос', icon: MicIcon },
    { id: 'RUNES', name: 'Руны', icon: SparkleIcon },
    { id: 'RESEARCH', name: 'Поиск', icon: FileSearchIcon },
    { id: 'MEMORY', name: 'Память', icon: DatabaseIcon },
    { id: 'SHADOW', name: 'Тень', icon: CircleIcon },
    { id: 'METRICS', name: 'Ядро', icon: BrainCircuitIcon },
    { id: 'COUNCIL', name: 'Совет', icon: UsersIcon },
    { id: 'EVAL', name: 'Оценка', icon: ScaleIcon },
    { id: 'GLOSSARY', name: 'Канон', icon: BookTextIcon },
    { id: 'SETTINGS', name: 'Настройки', icon: LayersIcon },
] as const;

export const MobileMenu: React.FC<{
    isOpen: boolean;
    activeView: AppView;
    onNavigate: (view: AppView) => void;
    onClose: () => void;
}> = ({ isOpen, activeView, onNavigate, onClose }) => {
    const [animate, setAnimate] = useState(false);

    useEffect(() => {
        if (isOpen) {
            requestAnimationFrame(() => setAnimate(true));
        } else {
            setAnimate(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const remainingNavItems = NAV_ITEMS.slice(4);
    const menuItems = [...remainingNavItems, ...SECONDARY_ITEMS];
    
    const handleNavigate = (view: AppView) => {
        soundService.playClick();
        onNavigate(view);
    }

    const renderRadialItem = (item: any, index: number, total: number) => {
        // Two-arc layout for better ergonomics
        const isInner = index < 4;
        const arcIndex = isInner ? index : index - 4;
        const arcTotal = isInner ? 4 : total - 4;
        
        const radius = isInner ? 130 : 240;
        
        // Sweep from ~10 to ~100 degrees (from bottom right up)
        const startAngle = 5; 
        const endAngle = 95;
        const angleStep = (endAngle - startAngle) / (arcTotal - 1 || 1);
        const angleDeg = startAngle + (arcIndex * angleStep);
        const angleRad = angleDeg * (Math.PI / 180);

        // Polar to Cartesian relative to Bottom-Right
        const rightVal = radius * Math.cos(angleRad);
        const bottomVal = radius * Math.sin(angleRad);

        const delay = index * 40;

        return (
            <button
                key={item.id}
                onClick={() => handleNavigate(item.id as AppView)}
                className={`absolute flex flex-col items-center justify-center rounded-2xl border shadow-lg transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) ${
                    activeView === item.id 
                    ? 'bg-primary/20 border-primary text-primary shadow-glow-ember' 
                    : 'bg-surface/95 backdrop-blur-xl border-white/10 text-text-muted hover:text-text hover:bg-surface2 hover:border-white/20'
                } ${animate ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
                style={{
                    right: `${rightVal}px`,
                    bottom: `${bottomVal}px`,
                    width: '60px',
                    height: '60px',
                    transitionDelay: `${delay}ms`,
                    zIndex: 60 - index
                }}
            >
                <item.icon className="h-5 w-5 mb-1" />
                <span className="text-[8px] font-medium leading-none truncate w-full text-center tracking-wide">{item.name}</span>
            </button>
        );
    };

    return (
        <>
            <div 
                className={`fixed inset-0 bg-black/60 backdrop-blur-[2px] z-40 transition-opacity duration-300 ${animate ? 'opacity-100' : 'opacity-0'}`} 
                onClick={() => {
                    soundService.playClick();
                    onClose();
                }}
            />

            {/* Anchored to Bottom Right, accounting for mobile nav bar */}
            <div className="fixed bottom-[90px] right-4 w-0 h-0 z-50 flex items-end justify-end pointer-events-none">
                {/* Close/Toggle Button */}
                <button 
                    onClick={() => {
                        soundService.playClick();
                        onClose();
                    }}
                    className={`pointer-events-auto absolute -bottom-2 -right-2 w-14 h-14 rounded-full bg-surface2 border border-white/10 text-text shadow-glow-electric flex items-center justify-center transition-all duration-300 z-[70] active:scale-90 hover:bg-surface ${animate ? 'opacity-100 rotate-0' : 'opacity-0 rotate-90'}`}
                >
                    <XIcon className="w-6 h-6" />
                </button>

                <div className="pointer-events-auto relative">
                    {menuItems.map((item, i) => renderRadialItem(item, i, menuItems.length))}
                </div>
            </div>
        </>
    );
};


const Sidebar: React.FC<SidebarProps> = ({ activeView, setView, compact = false, mobile = false, onOpenMenu }) => {
  
  const handleItemClick = (id: AppView) => {
     soundService.playClick();
     setView(id);
  }

  const renderItem = (item: any, isMobileRender = false) => {
      const isActive = activeView === item.id;
      const domId = `nav-item-${item.id}`;
      
      if (isMobileRender) {
          return (
            <button
                key={item.id}
                id={domId}
                onClick={() => handleItemClick(item.id as AppView)}
                className={`flex flex-col items-center justify-center w-full h-full relative transition-all duration-300 active:scale-95 group ${
                    isActive ? 'text-primary' : 'text-text-muted/80'
                }`}
            >
                {isActive && (
                    <div className="absolute -top-4 w-10 h-10 bg-primary/20 blur-xl rounded-full animate-pulse-slow" />
                )}
                <item.icon className={`h-6 w-6 mb-1 transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-glow-primary' : 'group-hover:scale-105'}`} />
                <span className={`text-[10px] font-medium ${isActive ? 'opacity-100 font-bold' : 'opacity-70'}`}>{item.name}</span>
            </button>
          )
      }

      return (
        <button
            key={item.id}
            id={domId}
            onClick={() => handleItemClick(item.id as AppView)}
            className={`group flex items-center w-full p-3 mb-2 rounded-xl transition-all duration-300 relative overflow-hidden active:scale-98 ${
                isActive
                ? 'bg-white/5 text-primary shadow-[0_0_20px_rgba(255,122,0,0.15)] border border-primary/20'
                : 'text-text-muted hover:bg-white/5 hover:text-text hover:border-white/10 border border-transparent'
            }`}
            title={compact ? item.name : undefined}
        >
            {isActive && (
                 <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_10px_#FF7A00]" />
            )}
            <item.icon className={`h-5 w-5 shrink-0 transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-glow-primary' : 'group-hover:scale-110'}`} style={compact ? { margin: '0 auto' } : { marginRight: '12px' }} />
            
            <span className={`font-medium text-sm whitespace-nowrap transition-all duration-300 origin-left ${
                compact ? 'w-0 opacity-0 absolute left-14 bg-surface px-2 py-1 rounded border border-white/10 shadow-lg group-hover:opacity-100 group-hover:w-auto z-50' : 'opacity-100'
            }`}>
                {item.name}
            </span>
        </button>
      );
  };

  if (mobile) {
      // Main 4 items + Menu
      const mobileMainItems = NAV_ITEMS.slice(0, 4);

      return (
          <>
            {mobileMainItems.map(item => renderItem(item, true))}
            
            <button
                id="nav-item-MENU"
                onClick={() => {
                    soundService.playClick();
                    if (onOpenMenu) onOpenMenu();
                }}
                className={`flex flex-col items-center justify-center w-full h-full relative transition-all duration-300 active:scale-95 text-text-muted/80 group`}
            >
                 <div className="p-2 rounded-full border border-white/10 group-hover:bg-white/5 transition-colors bg-surface2">
                    <MenuIcon className="h-5 w-5" />
                 </div>
            </button>
          </>
      )
  }

  return (
    <div className="flex flex-col h-full w-full">
        <div className="flex-grow py-6 px-3">
            {!compact && (
                <div className="px-4 mb-8 animate-fade-in">
                    <IskraLogo className="w-full h-12 text-primary" />
                </div>
            )}

            <nav className="flex flex-col space-y-1">
                {NAV_ITEMS.map(item => renderItem(item))}
            </nav>

            <div className="my-6 border-t border-white/5 mx-2" />

            <nav className="flex flex-col space-y-1">
                {SECONDARY_ITEMS.map(item => renderItem(item))}
            </nav>
        </div>
    </div>
  );
};

export default Sidebar;
