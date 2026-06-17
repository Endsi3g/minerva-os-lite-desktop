'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export type MascotState = 'idle' | 'thinking' | 'writing' | 'searching';

interface TreeMascotProps {
  state?: MascotState;
  size?: number;
  className?: string;
}

export function TreeMascot({ state = 'idle', size = 64, className }: TreeMascotProps) {
  return (
    <div
      className={cn('inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        className={cn(
          'transition-all',
          state === 'idle' && 'mascot-idle',
          state === 'thinking' && 'mascot-thinking',
          state === 'writing' && 'mascot-writing',
          state === 'searching' && 'mascot-searching',
        )}
      >
        {/* Trunk */}
        <rect x="28" y="44" width="8" height="14" rx="3" fill="#8b5e3c" />
        {/* Root left */}
        <path d="M28 56 Q20 58 16 60" stroke="#8b5e3c" strokeWidth="2.5" strokeLinecap="round" />
        {/* Root right */}
        <path d="M36 56 Q44 58 48 60" stroke="#8b5e3c" strokeWidth="2.5" strokeLinecap="round" />

        {/* Bottom canopy layer */}
        <ellipse cx="32" cy="40" rx="18" ry="10" fill="#16a34a" />

        {/* Middle canopy layer */}
        <ellipse cx="32" cy="30" rx="14" ry="9" fill="#15803d" />

        {/* Top canopy layer */}
        <ellipse cx="32" cy="21" rx="9" ry="8" fill="#166534" />

        {/* Highlight dots (leaves) */}
        <circle cx="26" cy="37" r="2" fill="#4ade80" opacity="0.6" />
        <circle cx="38" cy="35" r="1.5" fill="#4ade80" opacity="0.5" />
        <circle cx="24" cy="28" r="1.5" fill="#4ade80" opacity="0.5" />
        <circle cx="40" cy="27" r="1.5" fill="#4ade80" opacity="0.5" />
        <circle cx="32" cy="16" r="1.5" fill="#4ade80" opacity="0.6" />

        {/* Eyes */}
        <circle cx="29" cy="30" r="2" fill="#fff" />
        <circle cx="35" cy="30" r="2" fill="#fff" />
        <circle cx="29.6" cy="30.5" r="1" fill="#1a1a1a" />
        <circle cx="35.6" cy="30.5" r="1" fill="#1a1a1a" />

        {/* Smile */}
        {(state === 'idle' || state === 'searching') && (
          <path d="M28 34 Q32 37 36 34" stroke="#1a1a1a" strokeWidth="1.2" strokeLinecap="round" fill="none" />
        )}
        {state === 'thinking' && (
          <path d="M29 34 Q32 35 35 34" stroke="#1a1a1a" strokeWidth="1.2" strokeLinecap="round" fill="none" />
        )}
        {state === 'writing' && (
          <path d="M28 34 Q32 38 36 34" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        )}

        {/* Thinking dots */}
        {state === 'thinking' && (
          <>
            <circle cx="41" cy="22" r="1.5" fill="#059669" className="animate-bounce [animation-delay:0ms]" />
            <circle cx="45" cy="18" r="2" fill="#059669" className="animate-bounce [animation-delay:150ms]" />
            <circle cx="49" cy="14" r="2.5" fill="#059669" className="animate-bounce [animation-delay:300ms]" />
          </>
        )}

        {/* Writing sparkles */}
        {state === 'writing' && (
          <>
            <path d="M44 24 L46 20 L48 24 L46 28 Z" fill="#fbbf24" opacity="0.8" className="animate-pulse" />
            <path d="M49 30 L50 27 L51 30 L50 33 Z" fill="#fbbf24" opacity="0.6" className="animate-pulse [animation-delay:200ms]" />
          </>
        )}

        {/* Searching magnifier */}
        {state === 'searching' && (
          <>
            <circle cx="46" cy="16" r="5" stroke="#059669" strokeWidth="1.5" fill="none" opacity="0.8" />
            <path d="M49.5 19.5 L53 23" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
          </>
        )}
      </svg>

      <style>{`
        @keyframes mascot-sway {
          0%, 100% { transform: rotate(-3deg); }
          50% { transform: rotate(3deg); }
        }
        @keyframes mascot-flutter {
          0%, 100% { transform: scaleX(1) rotate(-2deg); }
          25% { transform: scaleX(1.03) rotate(2deg); }
          75% { transform: scaleX(0.97) rotate(-2deg); }
        }
        @keyframes mascot-wave {
          0%, 100% { transform: rotate(-5deg) translateY(0); }
          50% { transform: rotate(5deg) translateY(-2px); }
        }
        .mascot-idle { animation: mascot-sway 3s ease-in-out infinite; }
        .mascot-thinking { animation: mascot-flutter 1.2s ease-in-out infinite; }
        .mascot-writing { animation: mascot-wave 0.6s ease-in-out infinite; }
        .mascot-searching { animation: spin 2s linear infinite; }
      `}</style>
    </div>
  );
}

export default TreeMascot;
