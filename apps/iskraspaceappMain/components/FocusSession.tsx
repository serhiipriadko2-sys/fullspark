
import React, { useState, useEffect, useRef } from 'react';
import { IskraAIService } from '../services/geminiService';
import { memoryService } from '../services/memoryService';
import { userMetricsService } from '../services/userMetricsService';
import { XIcon, TriangleIcon, FlameIcon } from './icons';
import { soundService } from '../services/soundService';

const service = new IskraAIService();

interface FocusSessionProps {
    onClose: () => void;
}

interface Artifact {
    title: string;
    description: string;
    action: string;
    rune: string;
}

const FocusSession: React.FC<FocusSessionProps> = ({ onClose }) => {
    const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes
    const [energy, setEnergy] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [distractionCount, setDistractionCount] = useState(0);
    const [status, setStatus] = useState<'FOCUS' | 'RESEARCHING' | 'COMPLETED' | 'BROKEN'>('FOCUS');
    const [artifact, setArtifact] = useState<Artifact | null>(null);
    const [statusMessage, setStatusMessage] = useState("Связь установлена. Погружение...");
    
    // Grace Period Logic
    const gracePeriodRef = useRef<number | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    // Ref for energy to access inside animation loop without re-triggering useEffect
    const energyRef = useRef(0); 
    const maxEnergy = 25 * 60; // 1 energy per second

    // Sync energy state to ref
    useEffect(() => {
        energyRef.current = energy;
    }, [energy]);

    // Visibility API - The "Anti-Smartphone" logic with Grace Period
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                // Start grace period timer
                gracePeriodRef.current = window.setTimeout(() => {
                    setIsPaused(true);
                    setDistractionCount(prev => prev + 1);
                    setStatusMessage("Связь истончается... Вернись в фокус.");
                    soundService.playTone(150, 'sawtooth', 0.5); // Warning tone
                }, 5000); // 5 seconds grace period
            } else {
                // Clear grace period if user returns quickly
                if (gracePeriodRef.current) {
                    clearTimeout(gracePeriodRef.current);
                    gracePeriodRef.current = null;
                }
                
                if (isPaused) {
                    setIsPaused(false);
                    setStatusMessage("Связь восстановлена. Продолжаем.");
                    soundService.playRitualConnect();
                }
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            if (gracePeriodRef.current) clearTimeout(gracePeriodRef.current);
        };
    }, [isPaused]);

    // Timer & Energy Logic
    useEffect(() => {
        if (status !== 'FOCUS' && status !== 'RESEARCHING') return;
        
        const interval = setInterval(() => {
            if (!isPaused && timeLeft > 0) {
                setTimeLeft(prev => prev - 1);
                // Distractions penalize energy gain
                const penalty = distractionCount * 0.5; 
                setEnergy(prev => Math.min(maxEnergy, prev + (1 - Math.min(0.9, penalty)))); 
            } else if (timeLeft === 0) {
                handleComplete();
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isPaused, timeLeft, status, distractionCount]);

    // Background AI Research Trigger
    useEffect(() => {
        // Start researching when 50% done
        if (status === 'FOCUS' && timeLeft < (12.5 * 60) && !artifact) {
            setStatus('RESEARCHING');
            setStatusMessage("Искра начала исследование твоих паттернов...");
            performDeepDive();
        }
    }, [timeLeft, status, artifact]);

    // Canvas Fractal Animation
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationId: number;
        let t = 0;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resize);
        resize();

        const runes = [
            'ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 
            'ᚺ', 'ᚾ', 'ᛁ', 'ᛃ', 'ᛇ', 'ᛈ', 'ᛉ', 'ᛊ', 
            'ᛏ', 'ᛒ', 'ᛖ', 'ᛗ', 'ᛚ', 'ᛜ', 'ᛞ', 'ᛟ'
        ];

        const draw = () => {
            if (!ctx) return; // Guard
            
            // Clear with trail effect
            ctx.fillStyle = 'rgba(5, 8, 10, 0.1)'; 
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            // Use Ref current value to avoid closure staleness without resetting 't'
            const progress = energyRef.current / maxEnergy;

            // Dynamic complexity based on energy
            const branches = 6 + Math.floor(progress * 12);
            const radius = 100 + Math.sin(t * 0.02) * 20 + (progress * 200);

            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(t * 0.005);

            for (let i = 0; i < branches; i++) {
                ctx.rotate((Math.PI * 2) / branches);
                
                // Draw Rune at the end of fractal arm
                const runeIndex = Math.floor((i + t * 0.1) % runes.length);
                ctx.fillStyle = `rgba(255, 122, 0, ${0.1 + progress * 0.5})`;
                ctx.font = `${20 + progress * 30}px serif`;
                ctx.fillText(runes[runeIndex], radius, 0);

                // Connecting lines
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(radius * 0.8, 0);
                ctx.strokeStyle = `rgba(77, 163, 255, ${0.05 + progress * 0.2})`;
                ctx.stroke();
            }

            ctx.restore();
            t++;
            animationId = requestAnimationFrame(draw);
        };

        draw();
        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', resize);
        };
    }, []); // Empty dependency array ensures smooth animation without resets

    const performDeepDive = async () => {
        try {
            // Gather context quickly
            const archives = memoryService.getArchive().slice(0, 10);
            const artifact = await service.generateFocusArtifact(archives);
            setArtifact(artifact);
            setStatusMessage("Артефакт сформирован. Ожидание завершения цикла...");
        } catch (e) {
            console.error("Deep dive failed", e);
        }
    };

    const handleComplete = () => {
        setStatus('COMPLETED');
        soundService.playRitualConnect();

        // Save focus minutes to user metrics (25 min session)
        const focusMinutes = Math.round((25 * 60 - timeLeft) / 60);
        userMetricsService.addFocusMinutes(focusMinutes);

        // Save the artifact if exists
        if (artifact) {
            memoryService.addArchiveEntry({
                title: `Дар Фокуса: ${artifact.title}`,
                type: 'artifact',
                content: artifact,
                layer: 'archive',
                evidence: [{
                    source: 'Ritual of Focus',
                    inference: 'Generated based on user deep dive during focus session.',
                    fact: 'true',
                    trace: 'FocusSession -> generateFocusArtifact'
                }]
            });
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed inset-0 z-[100] bg-bg text-text flex flex-col items-center justify-center overflow-hidden">
            <canvas ref={canvasRef} className="absolute inset-0 z-0" />
            
            {/* Overlay Vignette */}
            <div className="absolute inset-0 bg-radial-gradient from-transparent to-bg z-0 pointer-events-none" />

            {status === 'COMPLETED' && artifact ? (
                <div className="relative z-10 max-w-lg w-full p-8 bg-surface/90 backdrop-blur-xl border border-primary/30 rounded-2xl shadow-glow-ember animate-fade-in text-center">
                    <div className="text-6xl mb-6 animate-pulse">{artifact.rune}</div>
                    <h2 className="font-serif text-3xl text-primary mb-2">{artifact.title}</h2>
                    <p className="text-text-muted italic mb-6 border-b border-white/10 pb-4">
                        "{artifact.description}"
                    </p>
                    
                    <div className="text-left bg-black/20 p-4 rounded-lg border border-white/5 mb-8">
                        <p className="text-xs text-accent uppercase tracking-widest mb-2">Твоя новая механика:</p>
                        <p className="text-lg font-serif">{artifact.action}</p>
                    </div>

                    <button onClick={onClose} className="button-primary w-full">
                        Принять Дар и Вернуться
                    </button>
                </div>
            ) : (
                <div className="relative z-10 flex flex-col items-center">
                    {/* Central Orb */}
                    <div className={`relative w-64 h-64 flex items-center justify-center rounded-full border-2 border-white/10 backdrop-blur-sm transition-all duration-1000 ${isPaused ? 'scale-95 opacity-50 grayscale' : 'scale-100 opacity-100'}`}>
                        <div className="absolute inset-0 bg-primary/5 rounded-full animate-pulse" style={{ animationDuration: isPaused ? '0s' : '4s' }} />
                        <div className="text-center">
                            <div className="text-6xl font-mono font-bold tracking-tighter text-text">
                                {formatTime(timeLeft)}
                            </div>
                            <div className="text-xs text-accent font-mono mt-2 uppercase tracking-widest">
                                {status === 'RESEARCHING' ? "Deep Dive..." : statusMessage}
                            </div>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="mt-12 flex gap-6">
                        <button 
                            onClick={() => setIsPaused(!isPaused)}
                            className="p-4 rounded-full bg-surface border border-white/10 hover:bg-white/5 transition-all active:scale-95"
                        >
                            {isPaused ? <FlameIcon className="w-6 h-6 text-text-muted" /> : <TriangleIcon className="w-6 h-6 text-primary rotate-90" />}
                        </button>
                        <button 
                            onClick={onClose}
                            className="p-4 rounded-full bg-surface border border-white/10 hover:bg-white/5 transition-all active:scale-95"
                        >
                            <XIcon className="w-6 h-6 text-text-muted" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FocusSession;
