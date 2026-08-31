'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Phone, 
  Loader2, 
  Check, 
  MapPin, 
  ArrowRight, 
  CheckSquare, 
  Square,
  ExternalLink,
  Search,
  Filter,
  Sparkles,
  PhoneCall,
  Plus
} from 'lucide-react';
import { useReach } from '@/lib/reach-context';
import { getApiUrl } from '@/lib/api-helper';
import { cn } from '@/lib/utils';
import { LeadHeatBadge } from '@/components/lead-heat-badge';
import { CallsStatsPanel } from './calls-stats-panel';
import type { Lead } from '@/lib/mock-data';

const TEMP_ORDER: Record<Lead['temperature'], number> = { Hot: 0, Warm: 1, Cold: 2 };

export function CallsRoot() {
  const router = useRouter();
  const { leads, activeWorkspace } = useReach();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemp, setSelectedTemp] = useState<string>('all');
  const [phoneFilter, setPhoneFilter] = useState<'all' | 'with_phone' | 'without_phone'>('all');

  const withPhoneCount = useMemo(() => leads.filter(l => Boolean(l.phone && l.phone.trim())).length, [leads]);
  const withoutPhoneCount = useMemo(() => leads.length - withPhoneCount, [leads, withPhoneCount]);

  const sortedLeads = useMemo(() => {
    return [...leads].sort((a, b) => {
      // 1. Leads with phone first
      const hasPhoneA = Boolean(a.phone && a.phone.trim()) ? 0 : 1;
      const hasPhoneB = Boolean(b.phone && b.phone.trim()) ? 0 : 1;
      if (hasPhoneA !== hasPhoneB) return hasPhoneA - hasPhoneB;

      // 2. Temperature order (Hot -> Warm -> Cold)
      return (TEMP_ORDER[a.temperature] ?? 1) - (TEMP_ORDER[b.temperature] ?? 1);
    });
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return sortedLeads.filter((l) => {
      // Search query filter
      const matchesSearch = !searchQuery || 
        l.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.niche && l.niche.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (l.city && l.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (l.phone && l.phone.includes(searchQuery));
      
      // Temperature filter
      const matchesTemp = selectedTemp === 'all' || l.temperature === selectedTemp;

      // Phone filter
      const hasPhone = Boolean(l.phone && l.phone.trim());
      const matchesPhone = phoneFilter === 'all' || 
        (phoneFilter === 'with_phone' && hasPhone) || 
        (phoneFilter === 'without_phone' && !hasPhone);

      return matchesSearch && matchesTemp && matchesPhone;
    });
  }, [sortedLeads, searchQuery, selectedTemp, phoneFilter]);

  const toggleSelectAll = () => {
    if (selected.size === filteredLeads.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredLeads.map((l) => l.id)));
    }
  };

  const toggleOne = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    if (selected.size === 0 || !activeWorkspace) return;
    setCreating(true);
    const selectedIds = Array.from(selected);
    const localPlanId = `call_${Date.now()}`;

    // Store in sessionStorage immediately so the plan view is always accessible
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`calls_session_${localPlanId}`, JSON.stringify(selectedIds));
    }

    try {
      const res = await fetch(getApiUrl('/api/route-plans'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: activeWorkspace.id,
          lead_ids: selectedIds,
          channel: 'call',
        }),
      });
      const plan = await res.json().catch(() => null);
      if (res.ok && plan?.id) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(`calls_session_${plan.id}`, JSON.stringify(selectedIds));
        }
        router.push(`/calls/${plan.id}`);
        return;
      }
    } catch {
      // ignore network errors and fallback to local plan
    }

    // Fallback navigation using local generated plan ID
    router.push(`/calls/${localPlanId}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'New':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Nouveau</span>;
      case 'Contacted':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Contacté</span>;
      case 'Meeting Booked':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">RDV Pris</span>;
      case 'Won':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Gagné</span>;
      case 'Lost':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">Perdu</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-700">{status}</span>;
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      <div className="flex-1 overflow-y-auto bg-white text-[#26251e] font-sans p-4 sm:p-6 md:p-8 space-y-6">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5e5e0] pb-4">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-[#26251e] tracking-tight flex items-center gap-2">
              <Phone className="h-5 w-5 text-[#059669]" />
              Sessions d&apos;Appels Commerciales
            </h1>
            <p className="text-xs text-[#7a7a76]">
              {leads.length} prospects dans votre base — {withPhoneCount} prêts à être appelés
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCreate}
              disabled={selected.size === 0 || creating}
              className="flex items-center gap-1.5 px-4 h-9 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold transition-all disabled:opacity-50 border-0 cursor-pointer shadow-2xs"
            >
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PhoneCall className="h-3.5 w-3.5" />}
              <span>Lancer session ({selected.size})</span>
            </button>
          </div>
        </div>

        {/* Dense Team Stats Panel */}
        {activeWorkspace && <CallsStatsPanel workspaceId={activeWorkspace.id} />}

        {/* Filter Tabs & Search Bar */}
        <div className="space-y-3">
          {/* Quick Phone Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setPhoneFilter('all')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border cursor-pointer",
                phoneFilter === 'all'
                  ? "bg-[#26251e] text-white border-[#26251e]"
                  : "bg-white text-[#7a7a76] border-[#e5e5e0] hover:bg-[#fafaf8] hover:text-[#26251e]"
              )}
            >
              Tous les prospects ({leads.length})
            </button>
            <button
              onClick={() => setPhoneFilter('with_phone')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border cursor-pointer flex items-center gap-1.5",
                phoneFilter === 'with_phone'
                  ? "bg-[#059669] text-white border-[#059669]"
                  : "bg-white text-[#7a7a76] border-[#e5e5e0] hover:bg-[#fafaf8] hover:text-[#26251e]"
              )}
            >
              <Phone className="h-3 w-3" /> Avec téléphone ({withPhoneCount})
            </button>
            <button
              onClick={() => setPhoneFilter('without_phone')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border cursor-pointer",
                phoneFilter === 'without_phone'
                  ? "bg-[#26251e] text-white border-[#26251e]"
                  : "bg-white text-[#7a7a76] border-[#e5e5e0] hover:bg-[#fafaf8] hover:text-[#26251e]"
              )}
            >
              Sans numéro ({withoutPhoneCount})
            </button>
          </div>

          {/* Search + Temp */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#e5e5e0] shadow-2xs">
            <div className="flex items-center gap-2 flex-1 relative">
              <Search className="h-4 w-4 text-[#7a7a76] absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par entreprise, secteur, ville ou téléphone..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#fafaf8] border border-[#e5e5e0] rounded-lg focus:outline-hidden focus:border-[#059669] text-[#26251e]"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Filter className="h-3.5 w-3.5 text-[#7a7a76]" />
              <select
                value={selectedTemp}
                onChange={(e) => setSelectedTemp(e.target.value)}
                className="text-xs bg-[#fafaf8] border border-[#e5e5e0] rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:border-[#059669] font-medium"
              >
                <option value="all">Toutes les températures</option>
                <option value="Hot">🔥 Chauds uniquement</option>
                <option value="Warm">🌤️ Tièdes</option>
                <option value="Cold">❄️ Froids</option>
              </select>
            </div>
          </div>
        </div>

        {/* Compact Table View (Leads Style) */}
        <div className="border border-[#e5e5e0] rounded-xl bg-white overflow-hidden shadow-2xs">
          {filteredLeads.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#7a7a76]">
              <Phone className="h-8 w-8 mx-auto text-[#d4d4cb] mb-2" />
              <p className="font-bold text-[#26251e]">Aucun prospect ne correspond à vos filtres</p>
              <p className="mt-1">Modifiez vos critères de recherche ou réinitialisez les filtres.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#fafaf8] border-b border-[#e5e5e0] text-[#7a7a76] font-bold select-none">
                    <th className="py-3 px-3 w-10 text-center">
                      <button onClick={toggleSelectAll} className="p-0.5 hover:text-[#26251e] transition-colors cursor-pointer">
                        {selected.size === filteredLeads.length && filteredLeads.length > 0 ? (
                          <CheckSquare className="h-4 w-4 text-[#059669]" />
                        ) : (
                          <Square className="h-4 w-4 text-[#7a7a76]" />
                        )}
                      </button>
                    </th>
                    <th className="py-3 px-3">Entreprise & Fiche</th>
                    <th className="py-3 px-3">Numéro de Téléphone</th>
                    <th className="py-3 px-3">Ville</th>
                    <th className="py-3 px-3">Statut CRM</th>
                    <th className="py-3 px-3">Température</th>
                    <th className="py-3 px-3">Prochaine Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e5e0]">
                  {filteredLeads.map((lead) => {
                    const isSelected = selected.has(lead.id);
                    const hasPhone = Boolean(lead.phone && lead.phone.trim());

                    return (
                      <tr
                        key={lead.id}
                        onClick={() => toggleOne(lead.id)}
                        className={cn(
                          "hover:bg-[#fafaf8] transition-colors cursor-pointer group",
                          isSelected && "bg-emerald-50/40"
                        )}
                      >
                        {/* Checkbox */}
                        <td className="py-3 px-3 text-center" onClick={(e) => toggleOne(lead.id, e)}>
                          <span
                            className={cn(
                              'inline-flex h-4 w-4 items-center justify-center rounded border transition-colors',
                              isSelected ? 'bg-[#059669] border-[#059669]' : 'border-[#d4d4cb] bg-white group-hover:border-[#059669]'
                            )}
                          >
                            {isSelected && <Check className="h-3 w-3 text-white" />}
                          </span>
                        </td>

                        {/* Company & Description */}
                        <td className="py-3 px-3 min-w-[220px]">
                          <div className="flex items-center gap-1.5">
                            <Link
                              href={`/leads/${lead.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="font-bold text-[#26251e] hover:text-[#059669] hover:underline flex items-center gap-1"
                            >
                              <span>{lead.businessName}</span>
                              <ExternalLink className="h-2.5 w-2.5 opacity-40 group-hover:opacity-100" />
                            </Link>
                          </div>
                          <p className="text-[11px] text-[#7a7a76] mt-0.5 line-clamp-1">
                            {lead.niche ? `${lead.niche} · ` : ''}{lead.contactName || 'Responsable'}
                            {lead.notes && lead.notes.length > 0 ? ` — ${lead.notes[0].content}` : ''}
                          </p>
                        </td>

                        {/* Phone */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {hasPhone ? (
                            <a
                              href={`tel:${lead.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="font-mono text-[11px] font-bold text-[#26251e] hover:text-[#059669] flex items-center gap-1.5 py-0.5 px-2 rounded bg-[#fafaf8] border border-[#e5e5e0] hover:border-[#059669] transition-colors"
                              title="Appeler directement"
                            >
                              <Phone className="h-3 w-3 text-[#059669] shrink-0" />
                              <span>{lead.phone}</span>
                            </a>
                          ) : (
                            <Link
                              href={`/leads/${lead.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-[10px] text-amber-700 hover:text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200/80 inline-flex items-center gap-1 hover:bg-amber-100/60 transition-colors"
                              title="Ajouter un numéro sur la fiche"
                            >
                              <Plus className="h-2.5 w-2.5" /> Ajouter numéro
                            </Link>
                          )}
                        </td>

                        {/* City */}
                        <td className="py-3 px-3 whitespace-nowrap text-[#7a7a76]">
                          {lead.city ? (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span>{lead.city}</span>
                            </span>
                          ) : (
                            <span className="text-[#a8a8a2]">-</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {getStatusBadge(lead.status)}
                        </td>

                        {/* Temperature */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <LeadHeatBadge lead={lead} showScore={false} />
                        </td>

                        {/* Next Action */}
                        <td className="py-3 px-3 min-w-[180px] text-[#7a7a76] text-[11px]">
                          {lead.nextAction ? (
                            <span className="line-clamp-1 font-medium text-[#26251e]">
                              {lead.nextAction}
                            </span>
                          ) : (
                            <span className="text-[#a8a8a2] italic">Aucune action définie</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom Floating Bar for Active Selection */}
      {selected.size > 0 && (
        <div className="shrink-0 border-t border-[#e5e5e0] bg-[#fafaf8] px-4 py-3 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#26251e]">
              {selected.size} prospect{selected.size > 1 ? 's' : ''} sélectionné{selected.size > 1 ? 's' : ''}
            </span>
            <button
              onClick={() => setSelected(new Set())}
              className="text-[11px] text-[#7a7a76] hover:text-[#26251e] underline cursor-pointer bg-transparent border-0"
            >
              Tout désélectionner
            </button>
          </div>

          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
            <span>Démarrer la session d&apos;appels</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default CallsRoot;
