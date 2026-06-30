'use client';

import React from 'react';
import { motion } from 'motion/react';

export type OwlState = 
  | 'idle'
  | 'thinking'
  | 'prospecting'
  | 'sending'
  | 'success'
  | 'connected'
  | 'analyse'
  | 'debugging'
  | 'update';

interface MinervaOwlProps {
  state?: OwlState;
  size?: number;
  className?: string;
}

export function MinervaOwl({ state = 'idle', size = 120, className = '' }: MinervaOwlProps) {
  // Theme colors
  const colors = {
    body: '#2D3A34',      // Deep forest/charcoal body
    belly: '#F1EBE4',     // Warm cream belly
    eyesGlow: '#059669',  // Minerva emerald green glow
    eyesWhite: '#FFFFFF',
    beak: '#E28743',      // Burnt orange beak
    featherDark: '#1E2723'
  };

  // Blinking loop (for eyes)
  const blinkTransition = {
    repeat: Infinity,
    repeatType: 'reverse' as const,
    duration: 0.15,
    delay: 3,
    repeatDelay: 4
  };

  // Floating body animation (Idle loop)
  const floatTransition = {
    y: {
      duration: 2,
      repeat: Infinity,
      repeatType: 'reverse' as const,
      ease: 'easeInOut' as const
    }
  };

  return (
    <div 
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <motion.svg
        viewBox="0 0 200 200"
        width="100%"
        height="100%"
        animate={{ y: [0, -6, 0] }}
        transition={floatTransition}
      >
        {/* Definitions for gradients & glowing effects */}
        <defs>
          <radialGradient id="eyesGlowGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#34d399" stopOpacity="1" />
            <stop offset="70%" stopColor="#059669" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#047857" stopOpacity="0" />
          </radialGradient>
          <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* ── CONNECTIONS / BACKGROUND STATE ANIMATIONS ────────────────────── */}
        {state === 'connected' && (
          <motion.g opacity={0.7}>
            <circle cx="100" cy="100" r="85" fill="none" stroke={colors.eyesGlow} strokeWidth="1" strokeDasharray="4 6" className="animate-spin" style={{ transformOrigin: '100px 100px', animationDuration: '20s' }} />
            {/* Dots connected */}
            <circle cx="30" cy="100" r="3.5" fill={colors.eyesGlow} />
            <line x1="30" y1="100" x2="60" y2="100" stroke={colors.eyesGlow} strokeWidth="1.5" />
            <circle cx="170" cy="100" r="3.5" fill={colors.eyesGlow} />
            <line x1="170" y1="100" x2="140" y2="100" stroke={colors.eyesGlow} strokeWidth="1.5" />
            <circle cx="100" cy="20" r="3.5" fill={colors.eyesGlow} />
            <line x1="100" y1="20" x2="100" y2="50" stroke={colors.eyesGlow} strokeWidth="1.5" />
          </motion.g>
        )}

        {state === 'analyse' && (
          <g opacity={0.6}>
            {/* Matrix rain columns */}
            {[45, 75, 125, 155].map((x, i) => (
              <motion.g key={i} y={0}>
                <text x={x} y="40" fill={colors.eyesGlow} fontSize="10" fontFamily="monospace" opacity="0.8">01</text>
                <text x={x} y="65" fill={colors.eyesGlow} fontSize="10" fontFamily="monospace" opacity="0.6">10</text>
                <text x={x} y="135" fill={colors.eyesGlow} fontSize="10" fontFamily="monospace" opacity="0.6">11</text>
                <text x={x} y="160" fill={colors.eyesGlow} fontSize="10" fontFamily="monospace" opacity="0.8">00</text>
              </motion.g>
            ))}
          </g>
        )}

        {/* ── BODY ───────────────────────────────────────────────────────── */}
        {/* Ear Tufts / Horns */}
        <path d="M 50 60 L 35 30 L 75 48 Z" fill={colors.body} />
        <path d="M 150 60 L 165 30 L 125 48 Z" fill={colors.body} />

        {/* Outer Body Shape */}
        <rect x="40" y="45" width="120" height="115" rx="55" ry="50" fill={colors.body} />

        {/* Belly Panel */}
        <motion.path 
          d="M 60 110 C 60 85, 140 85, 140 110 C 140 142, 60 142, 60 110 Z" 
          fill={colors.belly} 
        />

        {/* Subtle Belly Feathers */}
        <path d="M 90 105 Q 100 110 110 105" stroke={colors.body} strokeWidth="1.5" fill="none" opacity="0.3" />
        <path d="M 85 118 Q 100 123 115 118" stroke={colors.body} strokeWidth="1.5" fill="none" opacity="0.3" />
        <path d="M 92 128 Q 100 133 108 128" stroke={colors.body} strokeWidth="1.5" fill="none" opacity="0.3" />

        {/* ── DATA HELMET / CIRCUIT BOARD ON HEAD ───────────────────────── */}
        <path d="M 68 46 Q 100 38 132 46" stroke={colors.eyesGlow} strokeWidth="2.5" fill="none" opacity="0.85" filter="url(#glowFilter)" />
        <circle cx="100" cy="40" r="3" fill={colors.eyesGlow} filter="url(#glowFilter)" />
        <line x1="85" y1="44" x2="85" y2="52" stroke={colors.eyesGlow} strokeWidth="1.5" opacity="0.7" />
        <line x1="115" y1="44" x2="115" y2="52" stroke={colors.eyesGlow} strokeWidth="1.5" opacity="0.7" />

        {/* ── EYES (Large, expressive) ───────────────────────────────────── */}
        {/* Left Eye */}
        <g transform="translate(68, 80)">
          {/* Eye Socket */}
          <ellipse cx="0" cy="0" rx="26" ry="26" fill={colors.featherDark} />
          <ellipse cx="0" cy="0" rx="22" ry="22" fill={colors.eyesWhite} />
          
          {/* Eye Iris (glowing green) */}
          <motion.ellipse 
            cx="0" 
            cy="0" 
            rx="16" 
            ry="16" 
            fill="url(#eyesGlowGrad)"
            animate={
              state === 'thinking' ? { cx: [0, 4, -4, 0], cy: [0, -3, -3, 0] } :
              state === 'prospecting' ? { cx: [-6, 6, -6] } :
              state === 'sending' ? { cx: [0, 5, 5, 0] } : {}
            }
            transition={{
              repeat: state === 'prospecting' ? Infinity : 0,
              duration: state === 'prospecting' ? 2.5 : 1,
              ease: 'easeInOut'
            }}
          />

          {/* Pupil */}
          <motion.circle 
            cx="0" 
            cy="0" 
            r="8" 
            fill="#1E2723"
            animate={
              state === 'thinking' ? { cx: [0, 5, -5, 0], cy: [0, -4, -4, 0] } :
              state === 'prospecting' ? { cx: [-8, 8, -8] } :
              state === 'sending' ? { cx: [0, 6, 6, 0] } :
              state === 'success' ? { scaleY: 0 } : {}
            }
            transition={{
              repeat: state === 'prospecting' ? Infinity : 0,
              duration: state === 'prospecting' ? 2.5 : 1,
              ease: 'easeInOut'
            }}
          />

          {/* Eye glint */}
          <circle cx="-5" cy="-5" r="3.5" fill="#FFFFFF" />

          {/* Blinking Lid */}
          <motion.path
            d="M -26 -26 L 26 -26 L 26 26 L -26 26 Z"
            fill={colors.body}
            transform="scale(1, 0)"
            style={{ transformOrigin: '0px -26px' }}
            animate={
              state === 'success' ? { scaleY: [0, 0.4] } :
              state === 'idle' ? { scaleY: [0, 1, 0] } : {}
            }
            transition={state === 'idle' ? blinkTransition : { duration: 0.2 }}
          />

          {/* Happy Eye Arch (For Success State) */}
          {state === 'success' && (
            <path d="M -15 5 Q 0 -10 15 5" stroke={colors.featherDark} strokeWidth="4.5" fill="none" strokeLinecap="round" />
          )}

          {/* Green Radar Scan Line (Prospecting) */}
          {state === 'prospecting' && (
            <motion.line 
              x1="-22" y1="-22" x2="22" y2="-22" 
              stroke={colors.eyesGlow} strokeWidth="2.5" opacity="0.9"
              filter="url(#glowFilter)"
              animate={{ y: [5, 38, 5] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
            />
          )}
        </g>

        {/* Right Eye */}
        <g transform="translate(132, 80)">
          {/* Eye Socket */}
          <ellipse cx="0" cy="0" rx="26" ry="26" fill={colors.featherDark} />
          <ellipse cx="0" cy="0" rx="22" ry="22" fill={colors.eyesWhite} />
          
          {/* Eye Iris */}
          <motion.ellipse 
            cx="0" 
            cy="0" 
            rx="16" 
            ry="16" 
            fill="url(#eyesGlowGrad)"
            animate={
              state === 'thinking' ? { cx: [0, 4, -4, 0], cy: [0, -3, -3, 0] } :
              state === 'prospecting' ? { cx: [-6, 6, -6] } :
              state === 'sending' ? { cx: [0, 5, 5, 0] } : {}
            }
            transition={{
              repeat: state === 'prospecting' ? Infinity : 0,
              duration: state === 'prospecting' ? 2.5 : 1,
              ease: 'easeInOut'
            }}
          />

          {/* Pupil */}
          <motion.circle 
            cx="0" 
            cy="0" 
            r="8" 
            fill="#1E2723"
            animate={
              state === 'thinking' ? { cx: [0, 5, -5, 0], cy: [0, -4, -4, 0] } :
              state === 'prospecting' ? { cx: [-8, 8, -8] } :
              state === 'sending' ? { cx: [0, 6, 6, 0] } :
              state === 'success' ? { scaleY: 0 } : {}
            }
            transition={{
              repeat: state === 'prospecting' ? Infinity : 0,
              duration: state === 'prospecting' ? 2.5 : 1,
              ease: 'easeInOut'
            }}
          />

          {/* Eye glint */}
          <circle cx="-5" cy="-5" r="3.5" fill="#FFFFFF" />

          {/* Blinking Lid */}
          <motion.path
            d="M -26 -26 L 26 -26 L 26 26 L -26 26 Z"
            fill={colors.body}
            transform="scale(1, 0)"
            style={{ transformOrigin: '0px -26px' }}
            animate={
              state === 'success' ? { scaleY: [0, 0.4] } :
              state === 'idle' ? { scaleY: [0, 1, 0] } : {}
            }
            transition={state === 'idle' ? blinkTransition : { duration: 0.2 }}
          />

          {/* Happy Eye Arch */}
          {state === 'success' && (
            <path d="M -15 5 Q 0 -10 15 5" stroke={colors.featherDark} strokeWidth="4.5" fill="none" strokeLinecap="round" />
          )}

          {/* Green Radar Scan Line */}
          {state === 'prospecting' && (
            <motion.line 
              x1="-22" y1="-22" x2="22" y2="-22" 
              stroke={colors.eyesGlow} strokeWidth="2.5" opacity="0.9"
              filter="url(#glowFilter)"
              animate={{ y: [5, 38, 5] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
            />
          )}
        </g>

        {/* ── BEAK ───────────────────────────────────────────────────────── */}
        <motion.polygon 
          points="92,94 108,94 100,107" 
          fill={colors.beak} 
          animate={state === 'success' ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 0.3 }}
        />

        {/* ── WINGS (Short, cute arms) ───────────────────────────────────── */}
        {/* Left Wing */}
        <motion.path 
          d="M 42 100 C 25 105, 22 125, 43 130 Z" 
          fill={colors.body} 
          style={{ transformOrigin: '42px 105px' }}
          animate={
            state === 'sending' ? { rotate: [0, -25, 0] } :
            state === 'success' ? { rotate: [0, -35, 10, -20, 0] } : {}
          }
          transition={{ duration: 0.8, repeat: state === 'success' ? 1 : 0 }}
        />

        {/* Right Wing */}
        <motion.path 
          d="M 158 100 C 175 105, 178 125, 157 130 Z" 
          fill={colors.body} 
          style={{ transformOrigin: '158px 105px' }}
          animate={
            state === 'sending' ? { rotate: [0, 25, 0] } :
            state === 'success' ? { rotate: [0, 35, -10, 20, 0] } : {}
          }
          transition={{ duration: 0.8, repeat: state === 'success' ? 1 : 0 }}
        />

        {/* ── FOOT / CLAWS ────────────────────────────────────────────────── */}
        <circle cx="86" cy="155" r="4.5" fill={colors.beak} />
        <circle cx="94" cy="156" r="4.5" fill={colors.beak} />
        
        <circle cx="106" cy="156" r="4.5" fill={colors.beak} />
        <circle cx="114" cy="155" r="4.5" fill={colors.beak} />

        {/* ── INTERACTIVE PROPS & TRIGGERS (Depending on State) ──────────── */}
        {/* 1. Sending: Envelope flying */}
        {state === 'sending' && (
          <motion.g
            initial={{ opacity: 0, x: 25, y: 110, scale: 0.4 }}
            animate={{ opacity: [0, 1, 1, 0], x: [25, -20, -50], y: [110, 90, 70], scale: [0.4, 0.8, 0.6] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeOut' }}
          >
            <rect x="0" y="0" width="22" height="15" rx="2" fill="#FFFFFF" stroke={colors.eyesGlow} strokeWidth="1.5" />
            <path d="M 0 0 L 11 8 L 22 0" stroke={colors.eyesGlow} strokeWidth="1.5" fill="none" />
          </motion.g>
        )}

        {/* 2. Success: Mini star popping */}
        {state === 'success' && (
          <motion.g
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.2, 0.9], opacity: [0, 1, 0.9] }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {/* Gold Star */}
            <polygon points="100,10 103,17 111,18 105,23 107,31 100,27 93,31 95,23 89,18 97,17" fill="#F59E0B" />
          </motion.g>
        )}

        {/* 3. Thinking: Lightbulb thought bubble */}
        {state === 'thinking' && (
          <motion.g
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 120 }}
            transform="translate(138, 25)"
          >
            {/* Thought cloud */}
            <ellipse cx="25" cy="20" rx="24" ry="18" fill="#FFFFFF" stroke="#e5e5e0" strokeWidth="1.5" />
            <circle cx="10" cy="35" r="4" fill="#FFFFFF" stroke="#e5e5e0" strokeWidth="1" />
            <circle cx="4" cy="42" r="2.5" fill="#FFFFFF" stroke="#e5e5e0" strokeWidth="1" />

            {/* Glowing Lightbulb */}
            <g transform="translate(18, 10)">
              <path d="M 3 10 C 3 6, 11 6, 11 10 C 11 13, 9 14, 9 16 L 5 16 C 5 14, 3 13, 3 10 Z" fill="#FCD34D" />
              <rect x="5" y="16" width="4" height="2" fill="#9CA3AF" />
              {/* Glow */}
              <circle cx="7" cy="10" r="8" fill="#FCD34D" opacity="0.35" filter="url(#glowFilter)" />
            </g>
          </motion.g>
        )}

        {/* 4. Debugging: Owl holding screwdriver working on chip */}
        {state === 'debugging' && (
          <g transform="translate(20, 120)">
            {/* Mini circuit board */}
            <rect x="0" y="0" width="30" height="22" rx="3" fill="#10B981" stroke="#047857" strokeWidth="1" />
            <line x1="5" y1="5" x2="15" y2="5" stroke="#FFFFFF" strokeWidth="1" />
            <line x1="15" y1="5" x2="15" y2="15" stroke="#FFFFFF" strokeWidth="1" />
            <circle cx="22" cy="14" r="2.5" fill="#F59E0B" />
            {/* Screwdriver */}
            <motion.g
              animate={{ rotate: [0, -15, 0], x: [0, 3, 0] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              style={{ transformOrigin: '5px 5px' }}
            >
              <rect x="-10" y="2" width="14" height="3" fill="#9CA3AF" />
              <rect x="-18" y="0" width="8" height="7" rx="1.5" fill="#EF4444" />
            </motion.g>
          </g>
        )}

        {/* 5. Update: Progress bar below owl */}
        {state === 'update' && (
          <g transform="translate(45, 175)">
            <rect x="0" y="0" width="110" height="7" rx="3.5" fill="#E5E7EB" />
            <motion.rect 
              x="0" y="0" width="110" height="7" rx="3.5" fill={colors.eyesGlow} 
              initial={{ width: 10 }}
              animate={{ width: 110 }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            />
          </g>
        )}
      </motion.svg>
    </div>
  );
}
