
import React from 'react';
import { SparkleIcon } from './icons';

const Loader: React.FC = () => {
  return (
    <div className="relative flex items-center justify-center w-6 h-6" aria-label="Loading...">
      {/* Core Spark */}
      <SparkleIcon className="w-4 h-4 text-primary animate-[pulse_2s_ease-in-out_infinite]" />
      
      {/* Breathing Aura */}
      <div className="absolute inset-0 bg-primary/20 blur-[4px] rounded-full animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
      
      {/* Orbiting Particle (optional detail for complexity) */}
      <div className="absolute inset-0 animate-[spin_4s_linear_infinite] opacity-60">
          <div className="w-1 h-1 bg-accent rounded-full absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1" />
      </div>
    </div>
  );
};

export default Loader;
