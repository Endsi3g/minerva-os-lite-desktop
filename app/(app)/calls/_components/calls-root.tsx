'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Phone, 
  Loader2, 
  Check, 
  MapPin, 
  Building2, 
  ArrowRight, 
  Calendar, 
  CheckSquare, 
  Square,
  ExternalLink,
  Search,
  Filter
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

  const callableLeads = useMemo(() => {
    return leads
      .filter((l) => !!l.phone)
      .sort((a, b) => (TEMP_ORDER[a.temperature] ?? 1) - (TEMP_ORDER[b.temperature] ?? 1));
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return callableLeads.filter((l) => {
      const matchesSearch = !searchQuery || 
        l.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.niche && l.niche.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (l.city && l.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (l.phone && l.phone.includes(searchQuery));
      
      const matchesTemp = selectedTemp === 'all' || l.temperature === selectedTemp;
      return matchesSearch && matchesTemp;
    });
  }, [callableLeads, searchQuery, selectedTemp]);

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
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-50 text-neutral-600 border border-neutral-200">{status}</span>;
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf8] font-sans text-[#26251e] pb-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        
        {/* Header Title & Info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Phone className="h-5 w-5 text-[#059669]" />
              Session d&apos;Appels & Téléprospection
            </h1>
            <p className="text-xs text-[#7a7a76] mt-1">
              Sélectionnez vos prospects qualifiés pour lancer une session guidée avec script IA et prise de notes en direct.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold bg-white border border-[#e5e5e0] px-3 py-1.5 rounded-lg text-[#26251e] shadow-2xs">
              {callableLeads.length} prospects joignables
            </span>
          </div>
        </div>

        {/* Stats Panel */}
        {activeWorkspace && <CallsStatsPanel workspaceId={activeWorkspace.id} />}

        {/* Filter & Search Bar */}
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

        {/* Compact Table View (Leads Style) */}
        <div className="border border-[#e5e5e0] rounded-xl bg-white overflow-hidden shadow-2xs">
          {filteredLeads.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#7a7a76]">
              <Phone className="h-8 w-8 mx-auto text-[#d4d4cb] mb-2" />
              <p className="font-bold text-[#26251e]">Aucun prospect trouvé</p>
              <p className="mt-1">Modifiez vos filtres ou enrichissez vos leads avec un numéro de téléphone.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#fafaf8] border-b border-[#e5e5e0] text-[#7a7a76] font-bold select-none">
                    <th className="py-3 px-3 w-10 text-center">
                      <button onClick={toggleSelectAll} className="p-0.5 hover:text-[#26251e] transition-colors">
                        {selected.size === filteredLeads.length && filteredLeads.length > 0 ? (
                          <CheckSquare className="h-4 w-4 text-[#059669]" />
                        ) : (
                          <Square className="h-4 w-4 text-[#7a7a76]" />
                        )}
                      </button>
                    </th>
                    <th className="py-3 px-3">Entreprise & Description</th>
                    <th className="py-3 px-3">Téléphone</th>
                    <th className="py-3 px-3">Ville</th>
                    <th className="py-3 px-3">Statut CRM</th>
                    <th className="py-3 px-3">Température</th>
                    <th className="py-3 px-3">Prochaine Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e5e0]">
                  {filteredLeads.map((lead) => {
                    const isSelected = selected.has(lead.id);
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
                            {lead.notes ? ` — ${lead.notes}` : ''}
                          </p>
                        </td>

                        {/* Phone */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <a
                            href={`tel:${lead.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-mono text-[11px] font-bold text-[#26251e] hover:text-[#059669] flex items-center gap-1"
                          >
                            <Phone className="h-3 w-3 text-[#059669] shrink-0" />
                            <span>{lead.phone}</span>
                          </a>
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

      {/* Floating Sticky Bottom Bar for Session Launch */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 bg-[#1e1e1e] text-white px-6 py-3 rounded-2xl shadow-2xl border border-neutral-700 flex items-center gap-6 animate-scale-up">
          <div className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold">{selected.size} prospect{selected.size > 1 ? 's' : ''} sélectionné{selected.size > 1 ? 's' : ''}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelected(new Set())}
              className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white font-medium transition-colors"
            >
              Désélectionner
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-2 px-4 py-2 bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Phone className="h-3.5 w-3.5" />}
              <span>Lancer la session d&apos;appels</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
