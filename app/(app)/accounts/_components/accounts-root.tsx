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
import { useLanguage } from '@/lib/language-context';
import { LeadsSubNav } from '../../leads/_components/leads-sub-nav';

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

export function AccountsRoot() {
  const router = useRouter();
  const { leads, activeWorkspace } = useReach();
  const { t, locale } = useLanguage();

  const OUTCOME_LABEL: Record<string, string> = {
    visited: t('accounts.outcome_visited'),
    absent: t('accounts.outcome_absent'),
    meeting_booked: t('accounts.outcome_meeting_booked'),
    not_interested: t('accounts.outcome_not_interested'),
  };
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
    <div className="h-full overflow-hidden bg-white text-[#26251e] font-sans selection:bg-[#059669]/10 relative animate-page-enter flex flex-col">
      <LeadsSubNav />
      <div className="absolute inset-0 opacity-[0.25] pointer-events-none bg-grid-pattern-20 z-0" />

      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center gap-3 shrink-0 relative z-10 bg-white">
        <div className="h-10 w-10 rounded-xl bg-[#059669]/10 flex items-center justify-center">
          <Building2 className="h-5 w-5 text-[#059669]" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[#26251e] tracking-tight">{t('accounts.title')}</h1>
          <p className="text-xs text-neutral-500 font-medium">{accounts.length} {t('accounts.subtitle_suffix')}</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[300px_minmax(0,1fr)] relative z-10">
        {/* List */}
        <div className="border-r border-border flex flex-col min-h-0 bg-white">
          <div className="p-3 border-b border-border bg-[#f4f4f3]/30">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('accounts.search_placeholder')}
                className="w-full h-9 pl-8 pr-3 text-xs bg-white border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#059669] text-[#26251e]" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.map(a => (
              <button key={a.key} onClick={() => setSelectedKey(a.key)}
                className={cn('w-full text-left px-4 py-3 border-b border-border/60 hover:bg-[#f4f4f3]/50 transition-colors cursor-pointer bg-transparent',
                  selected?.key === a.key && 'bg-[#059669]/5 border-l-2 border-l-[#059669]')}>
                <p className="text-xs font-bold text-[#26251e] truncate">{a.name}</p>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">{a.domain || `${a.leads.length} contact${a.leads.length > 1 ? 's' : ''}`}</p>
              </button>
            ))}
            {filtered.length === 0 && <p className="p-4 text-xs text-muted-foreground text-center">{t('accounts.no_accounts')}</p>}
          </div>
        </div>

        {/* 360° detail */}
        <div className="overflow-y-auto p-6 bg-white/60">
          {!selected || !agg ? (
            <div className="h-full flex items-center justify-center text-xs text-[#807d72] font-semibold">{t('accounts.select_prompt')}</div>
          ) : (
            <div className="max-w-3xl space-y-6">
              {/* Account header */}
              <div className="rounded-xl border border-border bg-white p-5 space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-[#26251e] tracking-tight">{selected.name}</h2>
                  {selected.domain && (
                    <a href={`https://${selected.domain}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[#059669] hover:underline inline-flex items-center gap-1 font-semibold mt-1">
                      <Globe className="h-3 w-3" />{selected.domain}
                    </a>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg border border-border p-3 text-center bg-[#f4f4f3]/10">
                    <Users className="h-4 w-4 text-[#807d72] mx-auto mb-1" />
                    <div className="text-base font-bold text-[#26251e] font-mono">{agg.count}</div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">{t('accounts.contacts_section')}</div>
                  </div>
                  <div className="rounded-lg border border-border p-3 text-center bg-[#f4f4f3]/10">
                    <BarChart3 className="h-4 w-4 text-[#807d72] mx-auto mb-1" />
                    <div className="text-base font-bold text-[#26251e] font-mono">{agg.dealTotal > 0 ? `${(agg.dealTotal / 1000).toFixed(0)}k$` : '—'}</div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">Pipeline</div>
                  </div>
                  <div className="rounded-lg border border-border p-3 text-center bg-[#f4f4f3]/10">
                    <MapPin className="h-4 w-4 text-[#807d72] mx-auto mb-1" />
                    <div className="text-base font-bold text-[#26251e] font-mono">{visits.length}</div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">{t('accounts.visits_section')}</div>
                  </div>
                </div>
                {/* Status breakdown */}
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(agg.byStatus).map(([s, n]) => (
                    <span key={s} className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#f4f4f3] text-[#26251e] border border-border">{s}: {n}</span>
                  ))}
                </div>
              </div>

              {/* Contacts */}
              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{t('accounts.contacts_section')}</div>
                {selected.leads.map(l => (
                  <div key={l.id} className="flex items-center gap-3 rounded-xl border border-border bg-white p-4 hover:border-[#10b981]/40 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#26251e] truncate">{l.contactName || l.businessName}</p>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1 flex-wrap font-semibold">
                        <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border border-[#e5e5e0] bg-[#f4f4f3] text-[#807d72]">{l.status}</span>
                        {l.rating ? <span className="inline-flex items-center gap-0.5 text-amber-600"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{l.rating}</span> : null}
                        {l.phone && <span className="inline-flex items-center gap-1"><Phone className="h-2.5 w-2.5" />{l.phone}</span>}
                      </div>
                    </div>
                    <button onClick={() => router.push(`/leads/${l.id}`)} className="h-8 w-8 flex items-center justify-center rounded-lg border border-border bg-white text-[#807d72] hover:text-[#26251e] hover:bg-[#f4f4f3] shrink-0 cursor-pointer">
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Field visits */}
              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{t('accounts.visits_section')}</div>
                {visitsLoading ? (
                  <div className="py-4 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-[#059669]" /></div>
                ) : visits.length === 0 ? (
                  <p className="text-xs text-[#807d72] font-semibold bg-white border border-border p-4 rounded-xl">{t('accounts.no_visits')}</p>
                ) : visits.map((v, i) => (
                  <div key={i} className="rounded-xl border border-border bg-white p-4 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#26251e]">{OUTCOME_LABEL[v.outcome] ?? v.outcome}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{new Date(v.visited_at).toLocaleDateString(locale)}</span>
                    </div>
                    {v.notes && <p className="text-[11px] text-[#807d72] font-medium leading-relaxed">{v.notes}</p>}
                  </div>
                ))}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" />{t('accounts.notes_section')}</div>
                {agg.notes.length === 0 ? (
                  <p className="text-xs text-[#807d72] font-semibold bg-white border border-border p-4 rounded-xl">{t('accounts.no_notes')}</p>
                ) : agg.notes.slice(0, 20).map((n, i) => (
                  <div key={i} className="rounded-xl border border-border bg-white p-4 text-[11px] text-[#26251e] leading-relaxed">
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
