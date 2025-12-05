
import React, { useEffect, useRef } from 'react';
import { SessionStatus } from './LiveConversation';

interface VoiceVisualizerProps {
  status: SessionStatus;
  activeColor: string; // Hex color
}

const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({ status, activeColor }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const resize = () => {
        const parent = canvas.parentElement;
        if (parent) {
            canvas.width = parent.clientWidth;
            canvas.height = parent.clientHeight;
        }
    }
    
    window.addEventListener('resize', resize);
    resize();

    const draw = () => {
      if (!ctx || !canvas) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Animation parameters based on status
      let baseRadius = 80;
      let amplitude = 10;
      let frequency = 0.05;
      let speed = 0.05;
      let layers = 3;

      if (status === 'SPEAKING') {
          amplitude = 30;
          frequency = 0.2;
          speed = 0.15;
          layers = 5;
      } else if (status === 'LISTENING') {
          baseRadius = 70;
          amplitude = 5;
          frequency = 0.02;
          speed = 0.02;
      } else if (status === 'CONNECTING') {
           amplitude = 2;
           frequency = 0.1;
           speed = 0.1;
           layers = 2;
      } else {
          // IDLE
          amplitude = 2;
          frequency = 0.01;
          speed = 0.01;
          layers = 1;
      }
      
      time += speed;

      // Parse color for transparency
      // Assuming activeColor is Hex, we convert to RGB for rgba usage
      const hex = activeColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);

      for (let l = 0; l < layers; l++) {
          ctx.beginPath();
          const layerOffset = l * (Math.PI / layers);
          
          for (let angle = 0; angle < Math.PI * 2; angle += 0.05) {
            const wave = Math.sin(angle * 5 + time + layerOffset) * Math.cos(angle * 3 - time * 0.5);
            const rDynamic = baseRadius + wave * amplitude + (l * 10);
            
            const x = centerX + rDynamic * Math.cos(angle);
            const y = centerY + rDynamic * Math.sin(angle);
            
            if (angle === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
          }
          
          ctx.closePath();
          ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.5 - l * 0.1})`;
          ctx.lineWidth = 2;
          ctx.stroke();
          
          if (l === 0) {
              ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.1)`;
              ctx.fill();
          }
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, [status, activeColor]);

  return <canvas ref={canvasRef} className="w-full h-full absolute inset-0 pointer-events-none" />;
};

export default VoiceVisualizer;
