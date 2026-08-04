'use client';

import React, { useMemo } from 'react';
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useReach } from '@/lib/reach-context';

const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

const STAGE_COLORS: Record<string, string> = {
  'Nouveau': '#8A9098',
  'Contacté': '#4B5158',
  'RDV pris': '#E8A33D',
  'Client': '#167f5b',
  'Autres': '#14171A',
};

function stageLabel(status: string): keyof typeof STAGE_COLORS {
  if (status === 'New') return 'Nouveau';
  if (status === 'Contacted') return 'Contacté';
  if (status === 'Meeting Booked') return 'RDV pris';
  if (status === 'Won') return 'Client';
  return 'Autres';
}

export function TodayOverviewCharts() {
  const { leads } = useReach();

  const monthlyData = useMemo(() => {
    const months: { key: string; label: string; genere: number; contacte: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTH_LABELS[d.getMonth()], genere: 0, contacte: 0 });
    }
    const byKey = new Map(months.map((m) => [m.key, m]));
    leads.forEach((lead) => {
      if (!lead.createdAt) return;
      const d = new Date(lead.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const bucket = byKey.get(key);
      if (!bucket) return;
      bucket.genere += 1;
      if (lead.status !== 'New') bucket.contacte += 1;
    });
    return months;
  }, [leads]);

  const stageData = useMemo(() => {
    const counts: Record<string, number> = { 'Nouveau': 0, 'Contacté': 0, 'RDV pris': 0, 'Client': 0, 'Autres': 0 };
    leads.forEach((lead) => {
      counts[stageLabel(lead.status)] += 1;
    });
    return Object.entries(counts)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name, value, fill: STAGE_COLORS[name] }));
  }, [leads]);

  const totalLeads = leads.length;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Card className="border border-[#e5e5e0] bg-white shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="font-heading text-base font-medium">Leads générés vs contactés</CardTitle>
          <CardDescription className="text-xs">Derniers 6 mois</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyData} margin={{ left: -20, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="minervaGenereFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#167f5b" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#167f5b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="minervaContacteFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8A9098" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#8A9098" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#7a7a76' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#7a7a76' }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e5e0' }} />
              <Area type="monotone" dataKey="genere" name="Générés" stroke="#167f5b" fill="url(#minervaGenereFill)" strokeWidth={2} />
              <Area type="monotone" dataKey="contacte" name="Contactés" stroke="#8A9098" fill="url(#minervaContacteFill)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border border-[#e5e5e0] bg-white shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="font-heading text-base font-medium">Pipeline par étape</CardTitle>
          <CardDescription className="text-xs">{totalLeads} prospect{totalLeads > 1 ? 's' : ''} au total</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          {stageData.length === 0 ? (
            <p className="text-xs text-[#7a7a76] py-8 w-full text-center">Aucun prospect pour l&apos;instant.</p>
          ) : (
            <>
              <ResponsiveContainer width="45%" height={160}>
                <PieChart>
                  <Pie data={stageData} dataKey="value" cx="50%" cy="50%" innerRadius={38} outerRadius={62} paddingAngle={2}>
                    {stageData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e5e0' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2 text-xs flex-1 min-w-0">
                {stageData.map((s) => (
                  <div key={s.name} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-sm shrink-0" style={{ backgroundColor: s.fill }} />
                    <span className="text-[#4B5158] truncate">{s.name}</span>
                    <span className="font-bold text-[#14171A] ml-auto pl-2 tabular-nums">{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default TodayOverviewCharts;
