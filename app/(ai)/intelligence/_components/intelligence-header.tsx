'use client';

import React, { useState } from 'react';
import { RefreshCw, Brain } from 'lucide-react';

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
    <div className="flex items-start justify-between gap-4 flex-wrap border-b border-[#e5e5e0] pb-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Brain className="h-5 w-5 text-[#059669]" />
          <h1 className="text-xl font-bold text-[#26251e]">Intelligence</h1>
        </div>
        <p className="text-xs text-[#7a7a76]">
          Signaux IA, opportunités et copilote commercial en temps réel.
        </p>
      </div>

      <button
        disabled={analyzing}
        onClick={handleRefreshClick}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#e5e5e0] text-xs font-bold text-[#555552] hover:bg-[#f4f4f3] hover:text-[#26251e] transition-colors disabled:opacity-60 shrink-0"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${analyzing ? 'animate-spin' : ''}`} />
        {analyzing ? 'Analyse…' : 'Relancer'}
      </button>
    </div>
  );
}

export default IntelligenceHeader;
