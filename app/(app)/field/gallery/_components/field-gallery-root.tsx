'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useReach } from '@/lib/reach-context';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { ArrowLeft, Camera, Loader2, X, MapPin, Flame } from 'lucide-react';

type VisitOutcome = 'visited' | 'absent' | 'meeting_booked' | 'not_interested';

interface ProofRow {
  id: string;
  lead_id: string;
  outcome: VisitOutcome;
  contact_met: string | null;
  interest_level: string | null;
  proof_image: string;
  visited_at: string;
}

const OUTCOME_LABEL: Record<VisitOutcome, string> = {
  visited: 'Visité', absent: 'Absent', meeting_booked: 'RDV pris', not_interested: 'Non intéressé',
};
const OUTCOME_COLOR: Record<VisitOutcome, string> = {
  visited: '#059669', absent: '#f59e0b', meeting_booked: '#3b82f6', not_interested: '#ef4444',
};
const INTEREST_LABEL: Record<string, string> = { Hot: 'Chaud', Warm: 'Tiède', Cold: 'Froid' };

export function FieldGalleryRoot() {
  const router = useRouter();
  const { leads, activeWorkspace } = useReach();
  const [rows, setRows] = useState<ProofRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    if (!activeWorkspace) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('field_visits')
          .select('id, lead_id, outcome, contact_met, interest_level, proof_image, visited_at')
          .eq('workspace_id', activeWorkspace.id)
          .not('proof_image', 'is', null)
          .order('visited_at', { ascending: false });
        if (!cancelled) setRows((data as ProofRow[] | null) ?? []);
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [activeWorkspace]);

  const leadName = (id: string) => leads.find(l => l.id === id)?.businessName || 'Prospect';
  const leadCity = (id: string) => leads.find(l => l.id === id)?.city;

  // Group by month for a clean gallery
  const groups = useMemo(() => {
    const map: Record<string, ProofRow[]> = {};
    for (const r of rows) {
      const d = new Date(r.visited_at);
      const key = d.toLocaleDateString('fr-CA', { month: 'long', year: 'numeric' });
      (map[key] ||= []).push(r);
    }
    return Object.entries(map);
  }, [rows]);

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-5xl mx-auto px-4 py-6 md:px-6 md:py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/map')} className="p-2 rounded-lg border border-border bg-card hover:bg-muted transition-colors">
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#059669]/10 flex items-center justify-center">
              <Camera className="h-4.5 w-4.5 text-[#059669]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">Preuves de visite</h1>
              <p className="text-xs text-muted-foreground">Photos des passages terrain de l&apos;équipe.</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-[#059669]" /></div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <Camera className="h-7 w-7 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-semibold text-foreground">Aucune preuve de visite</p>
            <p className="text-xs text-muted-foreground mt-1">Les photos jointes aux comptes-rendus terrain apparaîtront ici.</p>
          </div>
        ) : (
          groups.map(([month, items]) => (
            <div key={month} className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{month} · {items.length}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {items.map(r => (
                  <div key={r.id} className="rounded-xl border border-border bg-card overflow-hidden group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={r.proof_image}
                      alt={leadName(r.lead_id)}
                      onClick={() => setLightbox(r.proof_image)}
                      className="w-full h-36 object-cover cursor-zoom-in group-hover:opacity-90 transition-opacity"
                    />
                    <div className="p-2.5 space-y-1.5">
                      <p className="text-xs font-bold text-foreground truncate">{leadName(r.lead_id)}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: OUTCOME_COLOR[r.outcome] }}>
                          {OUTCOME_LABEL[r.outcome] ?? r.outcome}
                        </span>
                        {r.interest_level && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-border text-muted-foreground inline-flex items-center gap-0.5">
                            <Flame className="h-2.5 w-2.5" /> {INTEREST_LABEL[r.interest_level] ?? r.interest_level}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                        {leadCity(r.lead_id) ? <span className="inline-flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{leadCity(r.lead_id)}</span> : <span />}
                        <span>{new Date(r.visited_at).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })}</span>
                      </div>
                      {r.contact_met && <p className="text-[9px] text-muted-foreground truncate">Contact : {r.contact_met}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6" onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 h-9 w-9 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="preuve" onClick={e => e.stopPropagation()} className="max-w-full max-h-full rounded-xl object-contain shadow-2xl" />
        </div>
      )}
    </div>
  );
}

export default FieldGalleryRoot;
