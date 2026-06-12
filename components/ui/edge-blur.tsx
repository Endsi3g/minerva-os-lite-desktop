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
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.height = `${height}px`;
    }
  }, [height]);
  
  return (
    <div
      ref={containerRef}
      className={cn(
        "pointer-events-none fixed left-0 right-0 z-40 select-none",
        isTop ? "top-0" : "bottom-0",
        className
      )}
    >
      {/* 4 layered backdrops with progressive blur and masking falloff */}
      <div 
        className={cn(
          "absolute inset-0 backdrop-blur-[1px]",
          isTop ? "mask-top-blur-1" : "mask-bottom-blur-1"
        )} 
      />
      <div 
        className={cn(
          "absolute inset-0 backdrop-blur-[3px]",
          isTop ? "mask-top-blur-2" : "mask-bottom-blur-2"
        )} 
      />
      <div 
        className={cn(
          "absolute inset-0 backdrop-blur-[8px]",
          isTop ? "mask-top-blur-3" : "mask-bottom-blur-3"
        )} 
      />
      <div 
        className={cn(
          "absolute inset-0 backdrop-blur-[16px]",
          isTop ? "mask-top-blur-4" : "mask-bottom-blur-4"
        )} 
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
