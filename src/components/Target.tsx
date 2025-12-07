'use client';

import * as motion from 'motion/react-client';
import React from 'react';

interface TargetProps {
  x: number; // 0-1 normalized
  y: number; // 0-1 normalized
  isStability?: boolean;
}

export default function Target({ x, y, isStability }: TargetProps) {
  return (
    <div
      className="absolute pointer-events-none z-20"
      style={{
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        transform: 'translate(-50%, -50%)',
        // We handle the main positioning transition in the parent or via CSS class if needed, 
        // but since we are passing raw props every frame, we might want smooth spring interpolation here 
        // if we weren't updating every frame. 
        // However, the parent component handles the smoothing logic via CSS transition for some phases.
        // We'll rely on the parent's positioning style for the container to avoid conflict.
      }}
    >
      {/* Crosshairs */}
      <div className="relative flex items-center justify-center w-[300px] h-[300px]">
        {/* Horizontal Line */}
        <motion.div
          initial={false}
          animate={{ opacity: isStability ? 0.8 : 0.3 }}
          className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-[#ff0080] to-transparent"
        />
        
        {/* Vertical Line */}
        <motion.div
          initial={false}
          animate={{ opacity: isStability ? 0.8 : 0.3 }}
          className="absolute h-full w-[1px] bg-gradient-to-b from-transparent via-[#ff0080] to-transparent"
        />

        {/* The Box Target */}
        <motion.div
          className={`w-10 h-10 rounded-full border-2 border-[#ff0080] bg-[#ff0080]/10 backdrop-blur-sm flex items-center justify-center shadow-[0_0_15px_rgba(255,0,128,0.5)] ${isStability ? 'animate-pulse' : ''}`}
          animate={{ 
            scale: isStability ? 0.8 : 1
          }}
          transition={{ duration: 0.5 }}
        >
            {/* Center Dot */}
            <div className="w-1 h-1 bg-white rounded-full shadow-[0_0_5px_#fff]" />
        </motion.div>
      </div>
    </div>
  );
}

