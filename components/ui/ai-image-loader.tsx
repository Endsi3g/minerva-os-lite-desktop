'use client';
import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

type Phase = 'generating' | 'reveal';

interface AiImageLoaderProps {
  src?: string;
  alt?: string;
  width?: number;
  height?: number;
  onReveal?: () => void;
  autoReveal?: boolean;
  className?: string;
}

const STATUS_LABELS = [
  'Initialisation…',
  'Création de l\'image…',
  'Affinement des détails…',
  'Dernière retouche…',
  'Révélation…',
];

function usePixelMosaic(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  active: boolean
) {
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const CELL = 8;
    let cols = Math.ceil(canvas.width / CELL);
    let rows = Math.ceil(canvas.height / CELL);

    // seed initial grid
    let grid: number[][] = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => Math.random())
    );

    let lastTime = 0;
    const FPS = 12;
    const INTERVAL = 1000 / FPS;

    function draw(time: number) {
      if (!ctx || !canvas) return;
      const delta = time - lastTime;
      if (delta >= INTERVAL) {
        lastTime = time;

        // Update a random subset of cells
        const numUpdates = Math.floor(cols * rows * 0.15);
        for (let i = 0; i < numUpdates; i++) {
          const r = Math.floor(Math.random() * rows);
          const c = Math.floor(Math.random() * cols);
          grid[r][c] = Math.random();
        }

        // Render
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const val = grid[r][c];
            // Mix of grays with occasional color tints
            let lightness = 85 + val * 12;
            let hue = 0;
            let saturation = 0;
            if (val > 0.85) {
              // Very light highlight
              lightness = 96;
            } else if (val < 0.1) {
              // Slight warm tint
              hue = 35;
              saturation = 8;
              lightness = 82;
            }
            ctx.fillStyle = `hsl(${hue},${saturation}%,${lightness}%)`;
            ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
          }
        }
      }
      animFrameRef.current = requestAnimationFrame(draw);
    }

    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [active, canvasRef]);
}

export function AiImageLoader({
  src,
  alt = '',
  width = 512,
  height = 512,
  onReveal,
  autoReveal = true,
  className,
}: AiImageLoaderProps) {
  const [phase, setPhase] = useState<Phase>('generating');
  const [statusIndex, setStatusIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const isGenerating = phase === 'generating';

  // Cycle status labels
  useEffect(() => {
    if (phase !== 'generating') return;
    const id = setInterval(() => {
      setStatusIndex((i) => (i + 1) % STATUS_LABELS.length);
    }, 1500);
    return () => clearInterval(id);
  }, [phase]);

  // Auto-reveal when src arrives
  useEffect(() => {
    if (src && autoReveal && phase === 'generating') {
      setPhase('reveal');
      const timer = setTimeout(() => {
        setRevealed(true);
        onReveal?.();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [src, autoReveal, phase, onReveal]);

  usePixelMosaic(canvasRef, isGenerating);

  const aspectRatio = `${width} / ${height}`;

  return (
    <div
      className={cn('relative overflow-hidden rounded-xl bg-[#f0f0ec]', className)}
      style={{ aspectRatio }}
    >
      {/* Mosaic canvas */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={cn(
          'absolute inset-0 w-full h-full transition-opacity duration-700',
          revealed ? 'opacity-0' : 'opacity-100'
        )}
      />

      {/* Real image */}
      {src && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={src}
          alt={alt}
          className={cn(
            'absolute inset-0 w-full h-full object-cover transition-opacity duration-700',
            revealed ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}

      {/* Status overlay */}
      {!revealed && (
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center pb-4 pt-12 bg-gradient-to-t from-black/30 to-transparent">
          {/* Spinner dots */}
          <div className="flex items-center gap-1 mb-2">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-white animate-bounce"
                style={{ animationDelay: `${i * 150}ms`, animationDuration: '800ms' }}
              />
            ))}
          </div>
          <p className="text-white text-xs font-medium drop-shadow-sm">
            {STATUS_LABELS[statusIndex]}
          </p>
        </div>
      )}
    </div>
  );
}

/** Static mosaic skeleton — use as a loading placeholder */
export function AiImageLoaderSkeleton({
  className,
  aspectRatio = '1 / 1',
}: {
  className?: string;
  aspectRatio?: string;
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl bg-[#e5e5e0] animate-pulse',
        className
      )}
      style={{ aspectRatio }}
    >
      {/* Static pixel-grid pattern using CSS */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 7px, #c8c8c4 7px, #c8c8c4 8px), repeating-linear-gradient(90deg, transparent, transparent 7px, #c8c8c4 7px, #c8c8c4 8px)',
        }}
      />
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center pb-3 pt-8 bg-gradient-to-t from-black/20 to-transparent">
        <p className="text-white/70 text-xs font-medium">Génération…</p>
      </div>
    </div>
  );
}

export default AiImageLoader;
