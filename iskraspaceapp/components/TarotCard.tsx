
import React from 'react';
import { Rune } from '../utils/tarot';

interface RuneStoneProps {
  rune: Rune;
  index: number;
  rotation: number;
  offsetY: number;
}

const RuneStone: React.FC<RuneStoneProps> = ({ rune, index, rotation, offsetY }) => {
  // Dynamic delay based on index for staggered falling effect
  const animationDelay = `${index * 0.15}s`;

  return (
    <div 
        className="relative flex flex-col items-center justify-center w-32 h-40 sm:w-36 sm:h-44"
        style={{
            transform: `rotate(${rotation}deg) translateY(${offsetY}px)`,
            animation: `rune-drop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards`,
            animationDelay: animationDelay,
            opacity: 0 // Start invisible before animation kicks in
        }}
    >
      {/* Stone Body */}
      <div className="relative w-full h-full rounded-[30px_40px_35px_25px] bg-gradient-to-br from-[#2A2E35] to-[#15181E] shadow-deep border border-white/5 flex items-center justify-center overflow-hidden group hover:scale-105 transition-transform duration-300 cursor-pointer">
        
        {/* Stone Texture/Noise Overlay */}
        <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuNjUiIG51bU9jdGF2ZXM9IjMiIHN0aXRjaFRpbGVzPSJzdGl0Y2giLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjbm9pc2UpIiBvcGFjaXR5PSIwLjUiLz48L3N2Zz4=')] mix-blend-overlay pointer-events-none" />
        
        {/* Inner Glow / Highlight */}
        <div className="absolute inset-2 rounded-[25px_35px_30px_20px] border border-white/5 opacity-50 pointer-events-none" />

        {/* Rune Symbol */}
        <div className="relative z-10 flex flex-col items-center">
            <span className="font-mono text-6xl text-transparent bg-clip-text bg-gradient-to-b from-[#FFD700] to-[#B8860B] drop-shadow-[0_2px_10px_rgba(255,215,0,0.3)] filter pb-2">
                {rune.symbol}
            </span>
        </div>
      </div>
      
      {/* Label (Fades in later) */}
      <div 
        className="absolute -bottom-8 left-0 right-0 text-center opacity-0 animate-fade-in"
        style={{ animationDelay: `${(index * 0.2) + 0.6}s`, animationFillMode: 'forwards' }}
      >
          <span className="text-sm font-serif text-text-muted uppercase tracking-widest drop-shadow-md">{rune.name}</span>
      </div>

      <style>{`
        @keyframes rune-drop {
            0% {
                opacity: 0;
                transform: translateY(-150px) scale(1.5) rotate(${rotation + 45}deg);
            }
            60% {
                opacity: 1;
                transform: translateY(10px) scale(0.95) rotate(${rotation - 5}deg);
            }
            100% {
                opacity: 1;
                transform: translateY(${offsetY}px) scale(1) rotate(${rotation}deg);
            }
        }
      `}</style>
    </div>
  );
};

export default RuneStone;
