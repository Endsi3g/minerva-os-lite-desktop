'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface EdgeBlurProps {
  position?: 'top' | 'bottom';
  height?: number;
  className?: string;
}

export function EdgeBlur({ position = 'bottom', height = 80, className }: EdgeBlurProps) {
  const isTop = position === 'top';
  
  return (
    <div
      className={cn(
        "pointer-events-none fixed left-0 right-0 z-40 select-none",
        isTop ? "top-0" : "bottom-0",
        className
      )}
      style={{
        height: `${height}px`,
      }}
    >
      {/* 4 layered backdrops with progressive blur and masking falloff */}
      <div 
        className="absolute inset-0 backdrop-blur-[1px]" 
        style={{ 
          maskImage: isTop 
            ? 'linear-gradient(to top, transparent, rgba(0, 0, 0, 0.1) 25%, rgba(0, 0, 0, 1))' 
            : 'linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.1) 25%, rgba(0, 0, 0, 1))',
          WebkitMaskImage: isTop 
            ? 'linear-gradient(to top, transparent, rgba(0, 0, 0, 0.1) 25%, rgba(0, 0, 0, 1))' 
            : 'linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.1) 25%, rgba(0, 0, 0, 1))'
        }}
      />
      <div 
        className="absolute inset-0 backdrop-blur-[3px]" 
        style={{ 
          maskImage: isTop 
            ? 'linear-gradient(to top, transparent, rgba(0, 0, 0, 0.3) 50%, rgba(0, 0, 0, 1))' 
            : 'linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.3) 50%, rgba(0, 0, 0, 1))',
          WebkitMaskImage: isTop 
            ? 'linear-gradient(to top, transparent, rgba(0, 0, 0, 0.3) 50%, rgba(0, 0, 0, 1))' 
            : 'linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.3) 50%, rgba(0, 0, 0, 1))'
        }}
      />
      <div 
        className="absolute inset-0 backdrop-blur-[8px]" 
        style={{ 
          maskImage: isTop 
            ? 'linear-gradient(to top, transparent, rgba(0, 0, 0, 0.6) 75%, rgba(0, 0, 0, 1))' 
            : 'linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.6) 75%, rgba(0, 0, 0, 1))',
          WebkitMaskImage: isTop 
            ? 'linear-gradient(to top, transparent, rgba(0, 0, 0, 0.6) 75%, rgba(0, 0, 0, 1))' 
            : 'linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.6) 75%, rgba(0, 0, 0, 1))'
        }}
      />
      <div 
        className="absolute inset-0 backdrop-blur-[16px]" 
        style={{ 
          maskImage: isTop 
            ? 'linear-gradient(to top, transparent, rgba(0, 0, 0, 1))' 
            : 'linear-gradient(to bottom, transparent, rgba(0, 0, 0, 1))',
          WebkitMaskImage: isTop 
            ? 'linear-gradient(to top, transparent, rgba(0, 0, 0, 1))' 
            : 'linear-gradient(to bottom, transparent, rgba(0, 0, 0, 1))'
        }}
      />
    </div>
  );
}

export function TopBlur({ height = 60, className }: { height?: number; className?: string }) {
  return <EdgeBlur position="top" height={height} className={className} />;
}

export function BottomBlur({ height = 60, className }: { height?: number; className?: string }) {
  return <EdgeBlur position="bottom" height={height} className={className} />;
}
