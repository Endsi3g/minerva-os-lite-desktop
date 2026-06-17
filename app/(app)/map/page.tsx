import dynamic from 'next/dynamic';

const MapRoot = dynamic(() => import('./_components/map-root'), { ssr: false });

export const metadata = {
  title: 'Carte des leads - Minerva Reach',
  description: 'Visualisez vos prospects sur une carte interactive.',
};

export default function MapPage() {
  return <MapRoot />;
}
