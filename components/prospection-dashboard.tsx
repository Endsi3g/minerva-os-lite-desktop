'use client';

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useReach } from '@/lib/reach-context';
import { Lead } from '@/lib/mock-data';
import { Users, TrendingUp, Calendar, Trophy } from 'lucide-react';

const STATUS_ORDER: Lead['status'][] = ['New', 'Contacted', 'Meeting Booked', 'Won', 'Lost'];
const STATUS_LABELS: Record<Lead['status'], string> = {
  New: 'Nouveaux',
  Contacted: 'Contactés',
  'Meeting Booked': 'RDV fixés',
  Won: 'Gagnés',
  Lost: 'Perdus',
};
const FUNNEL_COLORS = ['#10b981', '#059669', '#047857', '#065f46', '#26251e'];
const SOURCE_COLORS = ['#10b981', '#059669', '#047857', '#065f46', '#26251e', '#807d72'];

function pct(num: number, den: number) {
  if (!den) return '0%';
  return `${Math.round((num / den) * 100)}%`;
}

export function ProspectionDashboard() {
  const { leads } = useReach();

  const stats = useMemo(() => {
    const total = leads.length;
    const contacted = leads.filter(l => l.status !== 'New').length;
    const meeting = leads.filter(l => l.status === 'Meeting Booked' || l.status === 'Won').length;
    const won = leads.filter(l => l.status === 'Won').length;

    // Funnel data
    const funnelData = STATUS_ORDER.map((s, i) => ({
      name: STATUS_LABELS[s],
      count: leads.filter(l => l.status === s).length,
      fill: FUNNEL_COLORS[i],
    }));

    // Source breakdown
    const sourceMap: Record<string, number> = {};
    leads.forEach(l => {
      const src = (l.source || 'Manuel').split(' ').slice(0, 2).join(' ');
      sourceMap[src] = (sourceMap[src] || 0) + 1;
    });
    const sourceData = Object.entries(sourceMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value], i) => ({ name, value, fill: SOURCE_COLORS[i] }));

    // Niche performance
    const nicheMap: Record<string, { total: number; won: number }> = {};
    leads.forEach(l => {
      const n = l.niche || 'Autre';
      if (!nicheMap[n]) nicheMap[n] = { total: 0, won: 0 };
      nicheMap[n].total += 1;
      if (l.status === 'Won') nicheMap[n].won += 1;
    });
    const nicheData = Object.entries(nicheMap)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 8)
      .map(([niche, d]) => ({ niche: niche.length > 18 ? niche.slice(0, 16) + '…' : niche, ...d }));

    // Owner performance
    const ownerMap: Record<string, { total: number; contacted: number; meeting: number; won: number }> = {};
    leads.forEach(l => {
      const o = l.owner || 'Moi';
      if (!ownerMap[o]) ownerMap[o] = { total: 0, contacted: 0, meeting: 0, won: 0 };
      ownerMap[o].total += 1;
      if (l.status !== 'New') ownerMap[o].contacted += 1;
      if (l.status === 'Meeting Booked' || l.status === 'Won') ownerMap[o].meeting += 1;
      if (l.status === 'Won') ownerMap[o].won += 1;
    });
    const ownerData = Object.entries(ownerMap).map(([owner, d]) => ({ owner, ...d }));

    return { total, contacted, meeting, won, funnelData, sourceData, nicheData, ownerData };
  }, [leads]);

  const kpis = [
    { label: 'Total leads', value: stats.total, sub: 'dans le pipeline', icon: Users, color: 'text-[#10b981]' },
    { label: 'Taux de contact', value: pct(stats.contacted, stats.total), sub: `${stats.contacted} contactés`, icon: TrendingUp, color: 'text-[#10b981]' },
    { label: 'Taux de RDV', value: pct(stats.meeting, stats.total), sub: `${stats.meeting} rendez-vous`, icon: Calendar, color: 'text-[#26251e]' },
    { label: 'Taux de conversion', value: pct(stats.won, stats.total), sub: `${stats.won} gagnés`, icon: Trophy, color: 'text-[#10b981]' },
  ];

  if (stats.total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <TrendingUp className="h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">Aucun lead dans le pipeline</p>
        <p className="text-xs text-muted-foreground/60">Importe des prospects via l&apos;onglet Prospection pour voir le funnel.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border border-border bg-card">
            <CardContent className="p-4 flex items-start gap-3">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0 ${kpi.color}`}>
                <kpi.icon className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xl font-black text-foreground leading-tight">{kpi.value}</div>
                <div className="text-[10px] font-bold text-foreground uppercase tracking-wide">{kpi.label}</div>
                <div className="text-[10px] text-muted-foreground">{kpi.sub}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel */}
        <Card className="border border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">Funnel de prospection</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.funnelData} layout="vertical" margin={{ left: 8, right: 24 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8 }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {stats.funnelData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sources */}
        <Card className="border border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">Leads par source</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={160}>
              <PieChart>
                <Pie data={stats.sourceData} dataKey="value" cx="50%" cy="50%" outerRadius={60} innerRadius={30}>
                  {stats.sourceData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-1.5 text-[10px]">
              {stats.sourceData.map((s, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.fill }} />
                  <span className="text-muted-foreground truncate max-w-[100px]">{s.name}</span>
                  <span className="font-bold text-foreground ml-auto pl-2">{s.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Niche performance */}
      {stats.nicheData.length > 0 && (
        <Card className="border border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">Performance par secteur</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.nicheData} margin={{ left: 0, right: 8 }}>
                <XAxis dataKey="niche" tick={{ fontSize: 9 }} interval={0} />
                <YAxis hide />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="total" name="Total" fill="#26251e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="won" name="Gagnés" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Owner performance */}
      {stats.ownerData.length > 1 && (
        <Card className="border border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">Performance par membre</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-muted-foreground font-bold uppercase tracking-wide text-[10px]">Membre</th>
                    <th className="text-center py-2 text-muted-foreground font-bold uppercase tracking-wide text-[10px]">Leads</th>
                    <th className="text-center py-2 text-muted-foreground font-bold uppercase tracking-wide text-[10px]">Contactés</th>
                    <th className="text-center py-2 text-muted-foreground font-bold uppercase tracking-wide text-[10px]">RDV</th>
                    <th className="text-center py-2 text-muted-foreground font-bold uppercase tracking-wide text-[10px]">Gagnés</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.ownerData.map((row) => (
                    <tr key={row.owner} className="border-b border-border/40 hover:bg-muted/30">
                      <td className="py-2 font-medium text-foreground">{row.owner}</td>
                      <td className="py-2 text-center text-foreground">{row.total}</td>
                      <td className="py-2 text-center text-[#10b981] font-semibold">{row.contacted}</td>
                      <td className="py-2 text-center text-[#26251e] font-semibold">{row.meeting}</td>
                      <td className="py-2 text-center text-emerald-600 font-bold">{row.won}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ProspectionDashboard;
