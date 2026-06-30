'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Play } from 'lucide-react';

interface IntelligenceHeaderProps {
  onRefresh: () => void;
}

export function IntelligenceHeader({ onRefresh }: IntelligenceHeaderProps) {
  const [analyzing, setAnalyzing] = useState(false);

  const handleRefreshClick = () => {
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      onRefresh();
    }, 1200);
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border">
      {/* Title block */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Intelligence / IA</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Outils d&apos;intelligence et copilote IA pour optimiser ta prospection et tes actions commerciales.
        </p>
      </div>

      {/* Action button */}
      <div>
        <Button 
          size="sm" 
          variant="outline"
          disabled={analyzing}
          onClick={handleRefreshClick}
          className="gap-1.5 h-8.5 font-semibold text-xs text-primary border-primary/20 hover:bg-primary/5 shrink-0"
        >
          {analyzing ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>Analyse en cours...</span>
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Relancer l&apos;analyse</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default IntelligenceHeader;
