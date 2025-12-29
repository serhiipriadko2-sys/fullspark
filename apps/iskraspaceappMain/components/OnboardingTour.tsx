
import { useState, useLayoutEffect, useRef } from 'react';
import { ChevronRightIcon, XIcon } from './icons';

export interface TourStep {
    targetId: string;
    title: string;
    content: string;
    position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface OnboardingTourProps {
    steps: TourStep[];
    onComplete: () => void;
    onSkip: () => void;
}

const OnboardingTour: React.FC<OnboardingTourProps> = ({ steps, onComplete, onSkip }) => {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({ opacity: 0 });
    const [arrowStyle, setArrowStyle] = useState<React.CSSProperties>({});
    const currentStep = steps[currentStepIndex];
    const tooltipRef = useRef<HTMLDivElement>(null);

    // Use useLayoutEffect to calculate position after render but before paint
    // to prevent visual jumping and ensure accurate dimensions.
    useLayoutEffect(() => {
        const updatePosition = () => {
            if (!tooltipRef.current) return;

            const targetId = currentStep.targetId;
            const positionPreference = currentStep.position || 'bottom';
            
            const centerFallback = () => {
                setTooltipStyle({
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    position: 'fixed',
                    margin: 0,
                    opacity: 1,
                    maxWidth: '90vw',
                    maxHeight: '90vh',
                    overflowY: 'auto'
                });
                setArrowStyle({ display: 'none' });
            };

            if (!targetId && currentStep.position !== 'center') {
                centerFallback();
                return;
            }

            let target = document.getElementById(targetId);
            if (!target && currentStep.position !== 'center') {
                centerFallback();
                return;
            }

            if (currentStep.position === 'center') {
                centerFallback();
                return;
            }

            // @ts-ignore
            const targetRect = target.getBoundingClientRect();
            const tooltipRect = tooltipRef.current.getBoundingClientRect();
            
            const screenW = window.innerWidth;
            const screenH = window.innerHeight;
            const margin = 16; // Safe margin from screen edges
            const spacing = 16; // Distance from target
            
            let top = 0;
            let left = 0;
            let place = positionPreference;

            // 1. Smart Flip Logic
            const spaceTop = targetRect.top;
            const spaceBottom = screenH - targetRect.bottom;
            const spaceLeft = targetRect.left;
            const spaceRight = screenW - targetRect.right;

            if (place === 'bottom' && spaceBottom < tooltipRect.height + spacing && spaceTop > tooltipRect.height + spacing) place = 'top';
            else if (place === 'top' && spaceTop < tooltipRect.height + spacing && spaceBottom > tooltipRect.height + spacing) place = 'bottom';
            else if (place === 'right' && spaceRight < tooltipRect.width + spacing && spaceLeft > tooltipRect.width + spacing) place = 'left';
            else if (place === 'left' && spaceLeft < tooltipRect.width + spacing && spaceRight > tooltipRect.width + spacing) place = 'right';

            // 2. Calculate Origin Position
            switch (place) {
                case 'top':
                    top = targetRect.top - tooltipRect.height - spacing;
                    left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
                    break;
                case 'bottom':
                    top = targetRect.bottom + spacing;
                    left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
                    break;
                case 'left':
                    top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
                    left = targetRect.left - tooltipRect.width - spacing;
                    break;
                case 'right':
                    top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
                    left = targetRect.right + spacing;
                    break;
            }

            // 3. Clamp to Screen Boundaries (Keep it on screen!)
            if (left < margin) left = margin;
            if (left + tooltipRect.width > screenW - margin) left = screenW - tooltipRect.width - margin;
            
            if (top < margin) top = margin;
            if (top + tooltipRect.height > screenH - margin) top = screenH - tooltipRect.height - margin;

            // 4. Calculate Arrow Position (Relative to Tooltip)
            // The arrow must point to the center of the target, even if tooltip is shifted.
            const arrowStyles: React.CSSProperties = { 
                position: 'absolute', 
                width: '12px', 
                height: '12px', 
                background: 'inherit', // Inherit bg color to hide line
                zIndex: -1 
            };
            
            // Define border color for the arrow to match the card
            const borderColor = 'rgba(255, 122, 0, 0.5)'; // primary/50

            const targetCenterX = targetRect.left + targetRect.width / 2;
            const targetCenterY = targetRect.top + targetRect.height / 2;

            // Arrow position relative to the tooltip's top-left
            let arrowX = targetCenterX - left;
            let arrowY = targetCenterY - top;

            // Clamp arrow to stay within tooltip rounded corners (approx 16px radius)
            const cornerRadius = 16;
            arrowX = Math.max(cornerRadius, Math.min(tooltipRect.width - cornerRadius, arrowX));
            arrowY = Math.max(cornerRadius, Math.min(tooltipRect.height - cornerRadius, arrowY));

            if (place === 'top') {
                arrowStyles.bottom = '-6px';
                arrowStyles.left = `${arrowX}px`;
                arrowStyles.transform = 'translateX(-50%) rotate(45deg)';
                arrowStyles.borderRight = `1px solid ${borderColor}`;
                arrowStyles.borderBottom = `1px solid ${borderColor}`;
            } else if (place === 'bottom') {
                arrowStyles.top = '-6px';
                arrowStyles.left = `${arrowX}px`;
                arrowStyles.transform = 'translateX(-50%) rotate(45deg)';
                arrowStyles.borderLeft = `1px solid ${borderColor}`;
                arrowStyles.borderTop = `1px solid ${borderColor}`;
            } else if (place === 'left') {
                arrowStyles.right = '-6px';
                arrowStyles.top = `${arrowY}px`;
                arrowStyles.transform = 'translateY(-50%) rotate(45deg)';
                arrowStyles.borderTop = `1px solid ${borderColor}`;
                arrowStyles.borderRight = `1px solid ${borderColor}`;
            } else if (place === 'right') {
                arrowStyles.left = '-6px';
                arrowStyles.top = `${arrowY}px`;
                arrowStyles.transform = 'translateY(-50%) rotate(45deg)';
                arrowStyles.borderBottom = `1px solid ${borderColor}`;
                arrowStyles.borderLeft = `1px solid ${borderColor}`;
            }

            setTooltipStyle({
                top: `${top}px`,
                left: `${left}px`,
                position: 'fixed',
                opacity: 1,
                margin: 0,
                maxWidth: `calc(100vw - ${margin * 2}px)`,
                maxHeight: `calc(100vh - ${margin * 2}px)`,
                overflowY: 'auto',
                transform: 'none' // Explicitly remove transform centering
            });
            setArrowStyle(arrowStyles);
        };

        updatePosition();
        
        // Update on resize and scroll
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true); // Capture phase for scrolling divs

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [currentStepIndex, steps]); // Depend on currentStepIndex to re-run

    const handleNext = () => {
        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        } else {
            onComplete();
        }
    };

    const handleBack = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(prev => prev - 1);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] pointer-events-auto">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] transition-opacity" />
            
            {/* Tooltip Card */}
            <div 
                ref={tooltipRef}
                className="glass-card bg-surface/95 border border-primary/50 shadow-glow-ember p-6 w-[320px] flex flex-col gap-4 animate-fade-in transition-all duration-200"
                style={tooltipStyle}
            >
                {/* Arrow */}
                <div className="bg-surface" style={arrowStyle} />

                <div className="flex justify-between items-start shrink-0">
                    <h3 className="font-serif text-xl text-primary font-bold">{currentStep.title}</h3>
                    <button onClick={onSkip} className="text-text-muted hover:text-text transition-colors p-1" aria-label="Close tutorial">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                <p className="text-sm text-text-muted leading-relaxed">
                    {currentStep.content}
                </p>

                <div className="flex justify-between items-center mt-2 shrink-0">
                    <div className="flex gap-1">
                        {steps.map((_, i) => (
                            <div 
                                key={i} 
                                className={`w-1.5 h-1.5 rounded-full transition-colors ${i === currentStepIndex ? 'bg-primary' : 'bg-white/10'}`} 
                            />
                        ))}
                    </div>
                    
                    <div className="flex gap-2">
                        {currentStepIndex > 0 && (
                            <button 
                                onClick={handleBack}
                                className="px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text transition-colors"
                            >
                                Назад
                            </button>
                        )}
                        <button 
                            onClick={handleNext}
                            className="px-4 py-1.5 bg-primary text-black text-xs font-bold rounded-full hover:bg-primary/90 transition-colors flex items-center gap-1"
                        >
                            {currentStepIndex === steps.length - 1 ? 'Готово' : 'Далее'}
                            {currentStepIndex < steps.length - 1 && <ChevronRightIcon className="w-3 h-3" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OnboardingTour;
