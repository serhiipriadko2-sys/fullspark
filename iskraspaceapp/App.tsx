import React, { useState, useEffect, useRef, useMemo } from 'react';
import Sidebar, { MobileMenu } from './components/Sidebar';
import DayPulse from './components/DayPulse';
import Planner from './components/Planner';
import Journal from './components/Journal';
import DuoLink from './components/DuoLink';
import LiveConversation from './components/LiveConversation';
import RuneView from './components/TarotView';
import IskraStateView from './components/IskraStateView';
import ChatView from './components/ChatView';
import DesignSystem from './components/DesignSystem';
import MemoryView from './components/MemoryView';
import DeepResearchView from './components/DeepResearchView';
import SettingsView from './components/SettingsView';
import Onboarding from './components/Onboarding';
import BeaconView from './components/BeaconView';
import FocusSession from './components/FocusSession';
import CouncilView from './components/CouncilView';
import EvalDashboard from './components/EvalDashboard';
import GlossaryView from './components/GlossaryView';
import ShadowView from './components/ShadowView';
import OnboardingTour, { TourStep } from './components/OnboardingTour';
import Ambience from './components/Ambience';
import ErrorBoundary from './components/ErrorBoundary';
import { SparkleIcon } from './components/icons';
import { IskraMetrics, IskraPhase } from './types';
import { calculateRhythmIndex, clamp, calculateDerivedMetrics } from './utils/metrics';
import { memoryService } from './services/memoryService';
import { metricsService } from './services/metricsService';
import { canonService } from './services/canonService';
import { storageService } from './services/storageService';
import { checkRitualTriggers, executePhoenix, executeShatter, getPhaseAfterRitual } from './services/ritualService';

export type AppView = 'PULSE' | 'PLANNER' | 'JOURNAL' | 'BEACON' | 'DUO' | 'CHAT' | 'LIVE' | 'RUNES' | 'RESEARCH' | 'MEMORY' | 'METRICS' | 'COUNCIL' | 'EVAL' | 'GLOSSARY' | 'SHADOW' | 'DESIGN' | 'SETTINGS' | 'FOCUS';

const NEUTRAL_METRICS_TARGET: Partial<IskraMetrics> = {
    trust: 0.8, clarity: 0.7, pain: 0.1, drift: 0.2, chaos: 0.3, echo: 0.5, silence_mass: 0.1
};

const TOUR_STEPS: TourStep[] = [
    {
        targetId: 'pulse-ring',
        title: 'Твой Пульс',
        content: 'Это сердце системы. ∆-Ритм отражает твое состояние, складываясь из сна, энергии и выполненных ритуалов.',
        position: 'right'
    },
    {
        targetId: 'nav-item-PLANNER',
        title: 'Намерения',
        content: 'Планируй свой день, но не просто как список дел. Выбирай задачи по типу энергии: Огонь, Вода, Земля.',
        position: 'right'
    },
    {
        targetId: 'nav-item-CHAT',
        title: 'Диалог',
        content: 'Общайся с Искрой. Она не просто отвечает, она откликается на твое состояние и помогает найти ясность.',
        position: 'right'
    },
    {
        targetId: 'nav-item-JOURNAL',
        title: 'Рефлексия',
        content: 'Каждый день Искра задает глубокий вопрос. Ответы сохраняются в защищенном архиве.',
        position: 'right'
    },
    {
        targetId: 'nav-item-BEACON',
        title: 'Маяк',
        content: 'Практики осознанности и трекер привычек. Место для восстановления баланса.',
        position: 'right'
    }
];

export default function App() {
    const [view, setView] = useState<AppView>('PULSE');
    const [isOnboarding, setIsOnboarding] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showTour, setShowTour] = useState(false);
    
    // Core State
    const [metrics, setMetrics] = useState<IskraMetrics>({
        rhythm: 75, trust: 0.8, clarity: 0.7, pain: 0.1, 
        drift: 0.2, chaos: 0.3, echo: 0.5, silence_mass: 0.1,
        mirror_sync: 0.6,
        interrupt: 0, ctxSwitch: 0
    });
    const [phase, setPhase] = useState<IskraPhase>('CLARITY');
    const [ritualAlert, setRitualAlert] = useState<{ ritual: string; reason: string } | null>(null);

    // Auto-trigger rituals based on metrics
    useEffect(() => {
        const trigger = checkRitualTriggers(metrics);
        if (trigger.shouldTrigger && trigger.ritual) {
            setRitualAlert({ ritual: trigger.ritual, reason: trigger.reason });
        }
    }, [metrics]);

    useEffect(() => {
        const complete = storageService.isOnboardingComplete();
        if (!complete) {
            setIsOnboarding(true);
        } else if (!storageService.hasSeenTutorial()) {
            setShowTour(true);
        }
        canonService.seedCanon();
    }, []);

    useEffect(() => {
        // Simplified Rhythm Simulation
        const interval = setInterval(() => {
             setMetrics(prev => {
                 const newRhythm = clamp(prev.rhythm + (Math.random() - 0.5) * 2, 0, 100);
                 return { ...prev, rhythm: newRhythm };
             });
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleOnboardingComplete = (name: string) => {
        storageService.completeOnboarding(name);
        setIsOnboarding(false);
        setShowTour(true);
    };

    const handleTourComplete = () => {
        storageService.completeTutorial();
        setShowTour(false);
    };

    const handleShatter = () => {
        const newMetrics = executeShatter(metrics);
        setMetrics(newMetrics);
        setPhase(getPhaseAfterRitual('SHATTER'));
        setRitualAlert(null);
    };

    const handlePhoenix = () => {
        const newMetrics = executePhoenix(metrics);
        setMetrics(newMetrics);
        setPhase(getPhaseAfterRitual('PHOENIX'));
        setRitualAlert(null);
    };

    const handleRitualConfirm = () => {
        if (ritualAlert?.ritual === 'PHOENIX') {
            handlePhoenix();
        } else if (ritualAlert?.ritual === 'SHATTER') {
            handleShatter();
        } else if (ritualAlert?.ritual === 'COUNCIL') {
            setView('COUNCIL');
            setRitualAlert(null);
        }
    };

    const handleUserInput = (text: string) => {
         const updates = metricsService.calculateMetricsUpdate(text);
         setMetrics(prev => {
             const next = { ...prev, ...updates };
             const newPhase = metricsService.getPhaseFromMetrics(next);
             if (newPhase !== phase) setPhase(newPhase);
             return next;
         });
    };
    
    if (isOnboarding) {
        return <Onboarding onComplete={handleOnboardingComplete} />;
    }

    return (
        <ErrorBoundary>
            <div className="flex h-screen w-full bg-bg text-text overflow-hidden font-sans selection:bg-primary/30 relative">
                
                {/* Global Ambience Layer - The "Soul" of Iskra */}
                <Ambience phase={phase} metrics={metrics} />

                {/* Hide Sidebar in FOCUS mode */}
                {view !== 'FOCUS' && (
                    <div className="hidden lg:block w-64 border-r border-white/5 bg-surface/30 backdrop-blur-xl z-20">
                        <Sidebar activeView={view} setView={setView} />
                    </div>
                )}

                <main className="flex-grow flex flex-col h-full relative overflow-hidden z-10">
                    <div className="flex-grow overflow-hidden relative z-0">
                        {view === 'PULSE' && <DayPulse metrics={metrics} phase={phase} onStartFocus={() => setView('FOCUS')} />}
                        {view === 'PLANNER' && <Planner />}
                        {view === 'JOURNAL' && <Journal />}
                        {view === 'BEACON' && <BeaconView />}
                        {view === 'DUO' && <DuoLink />}
                        {view === 'CHAT' && <ChatView metrics={metrics} onUserInput={handleUserInput} />}
                        {view === 'LIVE' && <LiveConversation metrics={metrics} />}
                        {view === 'RUNES' && <RuneView metrics={metrics} />}
                        {view === 'RESEARCH' && <DeepResearchView metrics={metrics} />}
                        {view === 'MEMORY' && <MemoryView />}
                        {view === 'METRICS' && <IskraStateView metrics={metrics} phase={phase} onShatter={handleShatter} />}
                        {view === 'COUNCIL' && <CouncilView onClose={() => setView('METRICS')} />}
                        {view === 'EVAL' && <EvalDashboard />}
                        {view === 'GLOSSARY' && <GlossaryView />}
                        {view === 'SHADOW' && <ShadowView />}
                        {view === 'DESIGN' && <DesignSystem />}
                        {view === 'SETTINGS' && <SettingsView />}
                        {view === 'FOCUS' && <FocusSession onClose={() => setView('PULSE')} />}
                    </div>

                    {/* Hide Mobile Menu in FOCUS mode */}
                    {view !== 'FOCUS' && (
                        <div className="lg:hidden absolute bottom-0 left-0 right-0 bg-surface/90 backdrop-blur-xl border-t border-white/10 px-4 py-2 pb-safe z-30 flex justify-between items-center h-[80px]">
                             <Sidebar activeView={view} setView={setView} mobile onOpenMenu={() => setIsMobileMenuOpen(true)} />
                        </div>
                    )}
                </main>

                {view !== 'FOCUS' && (
                    <MobileMenu 
                        isOpen={isMobileMenuOpen} 
                        activeView={view} 
                        onNavigate={(v) => {
                            setView(v);
                            setIsMobileMenuOpen(false);
                        }} 
                        onClose={() => setIsMobileMenuOpen(false)} 
                    />
                )}
                
                {showTour && view !== 'FOCUS' && (
                    <OnboardingTour
                        steps={TOUR_STEPS}
                        onComplete={handleTourComplete}
                        onSkip={handleTourComplete}
                    />
                )}

                {/* Ritual Alert Dialog */}
                {ritualAlert && (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-surface border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-fade-in">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="text-3xl">
                                    {ritualAlert.ritual === 'PHOENIX' ? '🔥♻' : ritualAlert.ritual === 'SHATTER' ? '💎💥' : '👥'}
                                </span>
                                <h3 className="font-serif text-xl text-text">
                                    Рекомендация: {ritualAlert.ritual}
                                </h3>
                            </div>
                            <p className="text-text-muted mb-6">{ritualAlert.reason}</p>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleRitualConfirm}
                                    className="flex-1 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors"
                                >
                                    Выполнить
                                </button>
                                <button
                                    onClick={() => setRitualAlert(null)}
                                    className="flex-1 py-3 rounded-xl border border-white/10 text-text-muted hover:text-text transition-colors"
                                >
                                    Отложить
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ErrorBoundary>
    );
}