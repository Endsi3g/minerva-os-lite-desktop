'use client';
import dynamic from 'next/dynamic';
import { MapPin, Loader2 } from 'lucide-react';

const MapRoot = dynamic(() => import('./map-root'), {
  ssr: false,
  loading: () => (
    <div className="relative w-full h-full flex items-center justify-center bg-[#f4f4f3]">
      <div className="flex flex-col items-center gap-4 text-center select-none">
        <div className="relative">
          <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: '#059669' }} />
          <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: '#05966920' }}>
            <MapPin className="h-7 w-7" style={{ color: '#059669' }} />
          </div>
        </div>
        <div>
          <p className="text-sm font-bold text-[#26251e]">Chargement de la carte…</p>
          <p className="text-xs text-[#7a7a76] mt-1">Récupération des tuiles depuis CartoCDN</p>
        </div>
        <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#059669' }} />
      </div>
    </div>
  ),
});

export function MapLoader() {
  return <MapRoot />;
}
