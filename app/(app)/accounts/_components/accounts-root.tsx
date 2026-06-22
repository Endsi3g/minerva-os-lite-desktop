'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useReach } from '@/lib/reach-context';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import type { Lead } from '@/lib/mock-data';
import {
  Building2, Search, Users, BarChart3, FileText, MapPin, Globe, Phone,
  Star, ArrowUpRight, Loader2,
} from 'lucide-react';

interface Account {
  key: string;
  name: string;
  domain?: string;
  leads: Lead[];
}

interface VisitRow {
  lead_id: string;
  outcome: string;
  notes: string | null;
  visited_at: string;
}

function domainOf(website?: string): string | undefined {
  if (!website) return undefined;
  try {
    return new URL(website.startsWith('http') ? website : `https://${website}`).hostname.replace(/^www\./, '');
  } catch { return undefined; }
}

const OUTCOME_LABEL: Record<string, string> = {
  visited: 'Visité', absent: 'Absent', meeting_booked: 'RDV pris', not_interested: 'Non intéressé',
};

export function AccountsRoot() {
  const router = useRouter();
  const { leads, activeWorkspace } = useReach();
  const [query, setQuery] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(false);

  // Group leads into accounts by domain (fallback: normalized company name)
  const accounts = useMemo<Account[]>(() => {
    const map = new Map<string, Account>();
    for (const l of leads) {
      const dom = domainOf(l.website);
      const key = dom || l.businessName.trim().toLowerCase();
      if (!key) continue;
      const existing = map.get(key);
      if (existing) existing.leads.push(l);
      else map.set(key, { key, name: l.businessName, domain: dom, leads: [l] });
    }
    return Array.from(map.values()).sort((a, b) => b.leads.length - a.leads.length || a.name.localeCompare(b.name));
  }, [leads]);

  const filtered = accounts.filter(a =>
    !query || a.name.toLowerCase().includes(query.toLowerCase()) || (a.domain || '').includes(query.toLowerCase())
  );

  const selected = accounts.find(a => a.key === selectedKey) || filtered[0] || null;

  // Load field visits for the selected account's leads
  useEffect(() => {
    if (!selected || !activeWorkspace) { setVisits([]); return; }
    let cancelled = false;
    (async () => {
      setVisitsLoading(true);
      try {
        const supabase = createClient();
        const ids = selected.leads.map(l => l.id);
        const { data } = await supabase
          .from('field_visits')
          .select('lead_id, outcome, notes, visited_at')
          .in('lead_id', ids)
          .order('visited_at', { ascending: false });
        if (!cancelled) setVisits((data as VisitRow[] | null) ?? []);
      } catch { /* ignore */ }
      finally { if (!cancelled) setVisitsLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [selected, activeWorkspace]);

  // Aggregates for the selected account
  const agg = useMemo(() => {
    if (!selected) return null;
    const ls = selected.leads;
    const dealTotal = ls.reduce((s, l) => s + (l.dealAmount || 0), 0);
    const byStatus: Record<string, number> = {};
    ls.forEach(l => { byStatus[l.status] = (byStatus[l.status] || 0) + 1; });
    const notes = ls.flatMap(l => (l.notes || []).map(n => ({ lead: l.businessName, content: n.content, type: n.type })));
    return { dealTotal, byStatus, notes, count: ls.length };
  }, [selected]);

  return (
    <div className="h-full overflow-hidden bg-background flex flex-col">
      {/* Header */}
      <div className="px-4 md:px-6 py-4 border-b border-border flex items-center gap-3 shrink-0">
        <div className="h-9 w-9 rounded-xl bg-[#059669]/10 flex items-center justify-center">
          <Building2 className="h-4.5 w-4.5 text-[#059669]" />
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground tracking-tight">Comptes / Entreprises</h1>
          <p className="text-xs text-muted-foreground">{accounts.length} comptes · vue 360° par entreprise</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[300px_minmax(0,1fr)]">
        {/* List */}
        <div className="border-r border-border flex flex-col min-h-0">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher une entreprise…"
                className="w-full h-9 pl-8 pr-3 text-xs bg-card border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#059669]" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.map(a => (
              <button key={a.key} onClick={() => setSelectedKey(a.key)}
                className={cn('w-full text-left px-3 py-2.5 border-b border-border/60 hover:bg-muted/40 transition-colors',
                  selected?.key === a.key && 'bg-[#059669]/5 border-l-2 border-l-[#059669]')}>
                <p className="text-xs font-bold text-foreground truncate">{a.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{a.domain || `${a.leads.length} contact${a.leads.length > 1 ? 's' : ''}`}</p>
              </button>
            ))}
            {filtered.length === 0 && <p className="p-4 text-xs text-muted-foreground text-center">Aucun compte.</p>}
          </div>
        </div>

        {/* 360° detail */}
        <div className="overflow-y-auto p-4 md:p-6">
          {!selected || !agg ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Sélectionnez un compte.</div>
          ) : (
            <div className="max-w-3xl space-y-5">
              {/* Account header */}
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{selected.name}</h2>
                    {selected.domain && (
                      <a href={`https://${selected.domain}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[#059669] hover:underline inline-flex items-center gap-1">
                        <Globe className="h-3 w-3" />{selected.domain}
                      </a>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="rounded-lg bg-background border border-border p-3 text-center">
                    <Users className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                    <div className="text-base font-bold text-foreground">{agg.count}</div>
                    <div className="text-[10px] text-muted-foreground">Contacts</div>
                  </div>
                  <div className="rounded-lg bg-background border border-border p-3 text-center">
                    <BarChart3 className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                    <div className="text-base font-bold text-foreground">{agg.dealTotal > 0 ? `${(agg.dealTotal / 1000).toFixed(0)}k$` : '—'}</div>
                    <div className="text-[10px] text-muted-foreground">Pipeline</div>
                  </div>
                  <div className="rounded-lg bg-background border border-border p-3 text-center">
                    <MapPin className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                    <div className="text-base font-bold text-foreground">{visits.length}</div>
                    <div className="text-[10px] text-muted-foreground">Visites</div>
                  </div>
                </div>
                {/* Status breakdown */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {Object.entries(agg.byStatus).map(([s, n]) => (
                    <span key={s} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">{s}: {n}</span>
                  ))}
                </div>
              </div>

              {/* Contacts */}
              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />Contacts</div>
                {selected.leads.map(l => (
                  <div key={l.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{l.contactName || l.businessName}</p>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5 flex-wrap">
                        <span>{l.status}</span>
                        {l.rating ? <span className="inline-flex items-center gap-0.5"><Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />{l.rating}</span> : null}
                        {l.phone && <span className="inline-flex items-center gap-0.5"><Phone className="h-2.5 w-2.5" />{l.phone}</span>}
                      </div>
                    </div>
                    <button onClick={() => router.push(`/leads/${l.id}`)} className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted shrink-0">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Field visits */}
              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />Visites terrain</div>
                {visitsLoading ? (
                  <div className="py-4 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-[#059669]" /></div>
                ) : visits.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Aucune visite enregistrée.</p>
                ) : visits.map((v, i) => (
                  <div key={i} className="rounded-lg border border-border bg-card p-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">{OUTCOME_LABEL[v.outcome] ?? v.outcome}</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(v.visited_at).toLocaleDateString('fr-CA')}</span>
                    </div>
                    {v.notes && <p className="text-[11px] text-muted-foreground mt-1">{v.notes}</p>}
                  </div>
                ))}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" />Notes</div>
                {agg.notes.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Aucune note.</p>
                ) : agg.notes.slice(0, 20).map((n, i) => (
                  <div key={i} className="rounded-lg border border-border bg-card p-3 text-[11px] text-foreground leading-relaxed">
                    {n.content}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AccountsRoot;
