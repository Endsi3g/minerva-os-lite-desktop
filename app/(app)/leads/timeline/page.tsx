import { Clock } from 'lucide-react';
export const metadata = { title: 'Timeline — Leads' };
export default function TimelinePage() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <Clock className="h-10 w-10 text-[#e5e5e0] mb-3" />
      <p className="text-sm font-semibold text-[#26251e]">Timeline unifiée</p>
      <p className="text-xs text-[#7a7a76] mt-1 max-w-xs">Historique chronologique de toutes les interactions leads et comptes. Disponible prochainement.</p>
    </div>
  );
}
