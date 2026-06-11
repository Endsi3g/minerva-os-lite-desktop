'use client';

import React from 'react';
import { Check } from 'lucide-react';

interface SettingsSectionWrapperProps {
  title: string;
  description: string;
  isSaving?: boolean;
  children: React.ReactNode;
}

export function SettingsSectionWrapper({
  title,
  description,
  isSaving = false,
  children
}: SettingsSectionWrapperProps) {
  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h2 className="text-base font-bold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        
        {/* Floating save indicator */}
        <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-0.5 rounded border border-emerald-100 dark:border-emerald-900/30 transition-all duration-300 ${
          isSaving ? 'opacity-100 scale-100 translate-x-0' : 'opacity-0 scale-95 translate-x-1 pointer-events-none'
        }`}>
          <Check className="h-3 w-3 stroke-[2.5]" />
          <span>Enregistré</span>
        </div>
      </div>
      
      {/* Content wrapper */}
      <div className="space-y-5">
        {children}
      </div>
    </div>
  );
}

export default SettingsSectionWrapper;
