'use client';
import dynamic from 'next/dynamic';

const MapRoot = dynamic(() => import('./map-root'), { ssr: false });

export function MapLoader() {
  return <MapRoot />;
}
