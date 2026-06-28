'use client';

import React, { useMemo } from 'react';
import { useReach } from '@/lib/reach-context';
import { useRouter } from 'next/navigation';
import { TrendingUp, DollarSign, Target, Calendar } from 'lucide-react';

function formatCAD(amount: number) {
  return amount.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 });
}

const STATUS_FR: Record<string, string> = {
  'New': 'Nouveau',
  'Contacted': 'Contacté',
  'Meeting Booked': 'RDV fixé',
  'Proposal Sent': 'Proposition envoyée',
  'Negotiation': 'Négociation',
  'Won': 'Gagné',
  'Lost': 'Perdu',
};

const STATUS_COLOR: Record<string, string> = {
  'Proposal Sent': '#7c3aed',
  'Negotiation': '#d97706',
  'Won': '#059669',
};

export function PipelineForecastView() {
  const { leads } = useReach();
  const router = useRouter();

  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const wonLeads = leads.filter(l => l.status === 'Won' && l.dealAmount);
  const lostLeads = leads.filter(l => l.status === 'Lost');
  const closedCount = wonLeads.length + lostLeads.length;
  const winRate = closedCount > 0 ? Math.round((wonLeads.length / closedCount) * 100) : 0;
  const avgDealSize = wonLeads.length > 0 ? wonLeads.reduce((s, l) => s + (l.dealAmount || 0), 0) / wonLeads.length : 0;

  const pipeline30d = leads.filter(l => {
    if (!l.dealClosingDate || l.status === 'Won' || l.status === 'Lost') return false;
    const closeDate = new Date(l.dealClosingDate);
    return closeDate >= now && closeDate <= thirtyDaysLater;
  });
  const pipeline30dValue = pipeline30d.reduce((s, l) => s + ((l.dealAmount || 0) * (l.dealProbability || 50) / 100), 0);

  const activeDeals = leads.filter(l => l.dealAmount && l.status !== 'Won' && l.status !== 'Lost');

  // Monthly chart data (next 6 months)
  const months = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('fr-CA', { month: 'short' }),
      value: 0,
    };
  }), []);

  useMemo(() => {
    // Reset values
    months.forEach(m => { m.value = 0; });
    leads.forEach(l => {
      if (!l.dealClosingDate || !l.dealAmount || l.status === 'Won' || l.status === 'Lost') return;
      const d = new Date(l.dealClosingDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const month = months.find(m => m.key === key);
      if (month) month.value += (l.dealAmount * (l.dealProbability || 50) / 100);
    });
  }, [leads, months]);

  const maxMonthValue = Math.max(...months.map(m => m.value), 1);

  const sortedDeals = [...activeDeals]
    .filter(l => l.dealClosingDate)
    .sort((a, b) => new Date(a.dealClosingDate!).getTime() - new Date(b.dealClosingDate!).getTime());

  return (
    <div className="space-y-6 p-4 sm:p-6 overflow-y-auto max-h-[calc(100vh-280px)]">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Taux de closing', value: `${winRate}%`, icon: Target, color: '#059669' },
          { label: 'Valeur moy. deal gagné', value: formatCAD(avgDealSize), icon: DollarSign, color: '#059669' },
          { label: 'Pipeline à 30j (pondéré)', value: formatCAD(pipeline30dValue), icon: Calendar, color: '#7c3aed' },
          { label: 'Deals actifs', value: String(activeDeals.length), icon: TrendingUp, color: '#d97706' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-[#e5e5e0] bg-white p-4 space-y-1">
            <div className="flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5" style={{ color }} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">{label}</span>
            </div>
            <p className="text-xl font-bold text-[#26251e]">{value}</p>
          </div>
        ))}
      </div>

      {/* Monthly forecast chart */}
      <div className="rounded-xl border border-[#e5e5e0] bg-white p-5 space-y-4">
        <h3 className="text-sm font-bold text-[#26251e]">Closes prévus par mois (pondéré par probabilité)</h3>
        <div className="flex items-end gap-3 h-32">
          {months.map(m => (
            <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[9px] font-bold text-[#059669]">
                {m.value > 0 ? formatCAD(m.value) : ''}
              </span>
              <div className="w-full rounded-t" style={{
                height: `${Math.max((m.value / maxMonthValue) * 96, m.value > 0 ? 4 : 0)}px`,
                backgroundColor: m.value > 0 ? '#059669' : '#e5e5e0',
                minHeight: m.value > 0 ? '4px' : '2px',
                transition: 'height 0.3s ease',
              }} />
              <span className="text-[10px] text-[#7a7a76]">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Deals table */}
      {sortedDeals.length > 0 && (
        <div className="rounded-xl border border-[#e5e5e0] bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-[#e5e5e0]">
            <h3 className="text-sm font-bold text-[#26251e]">Deals avec date de clôture</h3>
          </div>
          <div className="divide-y divide-[#e5e5e0]">
            {sortedDeals.map(lead => (
              <button
                key={lead.id}
                onClick={() => router.push(`/leads/${lead.id}`)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#f7f7f4] transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#26251e] truncate">{lead.businessName}</p>
                    <p className="text-[10px] text-[#7a7a76]">{lead.city} · {lead.niche}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-xs font-bold text-[#059669]">{formatCAD(lead.dealAmount || 0)}</span>
                  <span className="text-[10px] text-[#7a7a76]">{lead.dealProbability ?? 50}%</span>
                  <span className="text-[10px] text-[#7a7a76]">
                    {new Date(lead.dealClosingDate!).toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' })}
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${STATUS_COLOR[lead.status] || '#e5e5e0'}20`,
                      color: STATUS_COLOR[lead.status] || '#555552',
                    }}>
                    {STATUS_FR[lead.status] || lead.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {sortedDeals.length === 0 && activeDeals.length === 0 && (
        <div className="rounded-xl border border-[#e5e5e0] bg-white p-8 text-center">
          <TrendingUp className="h-8 w-8 text-[#e5e5e0] mx-auto mb-2" />
          <p className="text-sm font-semibold text-[#26251e]">Aucun deal actif avec montant</p>
          <p className="text-xs text-[#7a7a76] mt-1">Ajoute des montants et des dates de clôture sur tes leads pour voir les prévisions ici.</p>
        </div>
      )}
    </div>
  );
}

export default PipelineForecastView;
