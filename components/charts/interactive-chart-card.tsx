'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Maximize2,
  Minimize2,
  ArrowUpRight,
  BarChart3,
  TrendingUp,
  PieChart as PieIcon,
  Sparkles,
  Layers,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export type ChartType = 'bar' | 'area' | 'line' | 'pie' | 'donut';

export interface ChartDataPoint {
  name: string;
  value: number;
  secondaryValue?: number;
  color?: string;
  [key: string]: any;
}

export interface InteractiveChartCardProps {
  title: string;
  subtitle?: string;
  type?: ChartType;
  data: ChartDataPoint[];
  dataKeys?: { key: string; name: string; color: string }[];
  deepLink?: {
    label: string;
    href: string;
  };
  height?: number;
  className?: string;
  showLegend?: boolean;
  valuePrefix?: string;
  valueSuffix?: string;
  compact?: boolean;
}

const DEFAULT_COLORS = ['#059669', '#3b82f6', '#d97706', '#7c3aed', '#ec4899', '#10b981', '#6366f1'];

export function InteractiveChartCard({
  title,
  subtitle,
  type = 'bar',
  data,
  dataKeys,
  deepLink,
  height = 240,
  className,
  showLegend = false,
  valuePrefix = '',
  valueSuffix = '',
  compact = false,
}: InteractiveChartCardProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const keys = dataKeys || [
    { key: 'value', name: 'Valeur', color: '#059669' },
    ...(data[0]?.secondaryValue !== undefined ? [{ key: 'secondaryValue', name: 'Objectif / Précédent', color: '#a3a197' }] : []),
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-md border border-[#e5e5e0] rounded-xl p-3 shadow-lg text-xs space-y-1 z-50">
          <p className="font-bold text-[#26251e] border-b border-[#f4f4f3] pb-1">{label || payload[0]?.name}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-[#7a7a76]">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.payload?.color }} />
                {entry.name} :
              </span>
              <span className="font-black text-[#26251e]">
                {valuePrefix}{typeof entry.value === 'number' ? entry.value.toLocaleString('fr-CA') : entry.value}{valueSuffix}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChartContent = (chartHeight: number) => {
    if (!data || data.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-[#7a7a76] text-xs py-8">
          <BarChart3 className="h-8 w-8 text-[#e5e5e0] mb-1.5" />
          <p className="font-bold">Aucune donnée disponible</p>
        </div>
      );
    }

    if (type === 'area') {
      return (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="areaGradientPrimary" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#059669" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0efea" vertical={false} />
            <XAxis dataKey="name" stroke="#a3a197" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#a3a197" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />}
            {keys.map((k) => (
              <Area
                key={k.key}
                type="monotone"
                dataKey={k.key}
                name={k.name}
                stroke={k.color}
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#areaGradientPrimary)"
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    if (type === 'line') {
      return (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0efea" vertical={false} />
            <XAxis dataKey="name" stroke="#a3a197" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#a3a197" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />}
            {keys.map((k) => (
              <Line
                key={k.key}
                type="monotone"
                dataKey={k.key}
                name={k.name}
                stroke={k.color}
                strokeWidth={2.5}
                dot={{ r: 3, fill: k.color }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (type === 'pie' || type === 'donut') {
      return (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <PieChart>
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />}
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={type === 'donut' ? 45 : 0}
              outerRadius={75}
              paddingAngle={type === 'donut' ? 3 : 1}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      );
    }

    // Default: Bar Chart
    return (
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0efea" vertical={false} />
          <XAxis dataKey="name" stroke="#a3a197" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="#a3a197" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          {showLegend && <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />}
          {keys.map((k) => (
            <Bar
              key={k.key}
              dataKey={k.key}
              name={k.name}
              fill={k.color}
              radius={[4, 4, 0, 0]}
              maxBarSize={36}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <>
      <div
        className={cn(
          'bg-white border border-[#e5e5e0] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between transition-all group hover:border-[#059669]/30',
          compact && 'p-3 rounded-xl',
          className
        )}
      >
        {/* Card Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[#f4f4f3] pb-3 mb-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-[#059669]/10 text-[#059669] flex items-center justify-center shrink-0">
                {type === 'area' || type === 'line' ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : type === 'pie' || type === 'donut' ? (
                  <PieIcon className="h-3.5 w-3.5" />
                ) : (
                  <BarChart3 className="h-3.5 w-3.5" />
                )}
              </div>
              <h3 className="text-xs font-black uppercase tracking-wider text-[#26251e] truncate">{title}</h3>
            </div>
            {subtitle && <p className="text-[11px] text-[#7a7a76] mt-0.5 font-medium truncate">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              className="p-1.5 rounded-lg border border-[#e5e5e0] hover:bg-[#fafaf8] text-[#7a7a76] hover:text-[#26251e] transition-colors"
              title="Agrandir en plein écran"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="flex-1 w-full pt-1">{renderChartContent(height)}</div>

        {/* Deep Link Footer */}
        {deepLink && (
          <div className="pt-3 mt-2 border-t border-[#f4f4f3] flex items-center justify-between">
            <span className="text-[10px] text-[#a3a197] font-medium flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-[#059669]" /> Données CRM en direct
            </span>
            <Link
              href={deepLink.href}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#059669] hover:underline bg-[#059669]/8 px-2.5 py-1 rounded-lg border border-[#059669]/20 transition-all hover:bg-[#059669]/15"
            >
              <span>{deepLink.label}</span>
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </div>

      {/* Fullscreen Dialog Modal */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-4xl w-[92vw] bg-white border border-[#e5e5e0] p-6 rounded-2xl">
          <DialogHeader className="border-b border-[#e5e5e0] pb-4 flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-base font-black text-[#26251e] flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-[#059669]" />
                {title}
              </DialogTitle>
              {subtitle && <p className="text-xs text-[#7a7a76] mt-1 font-medium">{subtitle}</p>}
            </div>
            {deepLink && (
              <Link
                href={deepLink.href}
                onClick={() => setIsFullscreen(false)}
                className="inline-flex items-center gap-1 text-xs font-bold text-white bg-[#059669] hover:bg-[#047857] px-3.5 py-2 rounded-xl transition-colors shadow-xs mr-6"
              >
                <span>{deepLink.label}</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </DialogHeader>
          <div className="py-6">{renderChartContent(420)}</div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default InteractiveChartCard;
