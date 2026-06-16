'use client';

import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Lead } from '@/lib/mock-data';
import { ArrowUpDown, ArrowUpRight, Mail, MapPin, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getTemperatureStyle, getTemperatureLabel } from '@/lib/lead-badges';

// Helper for status badge styling
const getStatusStyle = (status: Lead['status']) => {
  switch (status) {
    case 'New':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800';
    case 'Contacted':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800';
    case 'Meeting Booked':
      return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800';
    case 'Won':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800';
    case 'Lost':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800';
  }
};

const getStatusLabel = (status: Lead['status']) => {
  switch (status) {
    case 'New': return 'Nouveau';
    case 'Contacted': return 'Contacté';
    case 'Meeting Booked': return 'RDV Fixé';
    case 'Won': return 'Gagné';
    case 'Lost': return 'Perdu';
    default: return status;
  }
};

export const columns: ColumnDef<Lead>[] = [
  // Checkbox row select
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Sélectionner tout"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Sélectionner la ligne"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  // Business Cell
  {
    accessorKey: 'businessName',
    header: ({ column }) => {
      return (
        <button
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="flex items-center gap-1 hover:text-foreground text-left font-semibold"
        >
          Entreprise
          <ArrowUpDown className="h-3 w-3" />
        </button>
      );
    },
    cell: ({ row }) => {
      const name = row.getValue('businessName') as string;
      const city = row.original.city;
      const initial = name ? name.charAt(0).toUpperCase() : 'M';
      return (
        <div className="flex items-center gap-3 py-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0">
            {initial}
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold text-foreground leading-tight">{name}</span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <MapPin className="h-2.5 w-2.5" />
              {city}
            </span>
          </div>
        </div>
      );
    },
  },
  // Niche
  {
    accessorKey: 'niche',
    header: 'Secteur',
    cell: ({ row }) => {
      return <span className="text-xs text-muted-foreground">{row.getValue('niche')}</span>;
    },
  },
  // Contact info
  {
    accessorKey: 'contactName',
    header: 'Contact',
    cell: ({ row }) => {
      const name = row.getValue('contactName') as string;
      const email = row.original.contactEmail;
      return (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-foreground font-medium">{name || 'Non spécifié'}</span>
          {email && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Mail className="h-2.5 w-2.5" />
              {email}
            </span>
          )}
        </div>
      );
    },
  },
  // Status badge
  {
    accessorKey: 'status',
    header: 'Statut',
    cell: ({ row }) => {
      const status = row.getValue('status') as Lead['status'];
      return (
        <Badge variant="outline" className={cn("text-[9px] font-bold uppercase rounded px-2 py-0.5", getStatusStyle(status))}>
          {getStatusLabel(status)}
        </Badge>
      );
    },
  },
  // Temperature badge
  {
    accessorKey: 'temperature',
    header: 'Température',
    cell: ({ row }) => {
      const temp = row.getValue('temperature') as Lead['temperature'];
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={cn("text-[9px] font-bold rounded px-2 py-0.5 cursor-help", getTemperatureStyle(temp))}>
              {getTemperatureLabel(temp)}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">
              {temp === 'Hot' ? '🔥 Lead très chaud : engagement immédiat recommandé.' : temp === 'Warm' ? '☀️ Intérêt modéré ou à nurturer.' : '❄️ Froid : pas d\'interaction active.'}
            </p>
          </TooltipContent>
        </Tooltip>
      );
    },
  },
  // Next action
  {
    accessorKey: 'nextAction',
    header: 'Action Suivante',
    cell: ({ row }) => {
      const action = row.getValue('nextAction') as string;
      const date = row.original.nextActionDate;
      if (!action) return <span className="text-xs text-muted-foreground/50 italic">Aucune</span>;
      return (
        <div className="flex flex-col gap-0.5 max-w-[180px]">
          <span className="text-xs text-foreground font-medium truncate">{action}</span>
          {date && (
            <span className="text-[10px] text-muted-foreground">
              Pour le : {new Date(date).toLocaleDateString('fr-FR')}
            </span>
          )}
        </div>
      );
    },
  },
  // Score
  {
    accessorKey: 'score',
    header: ({ column }) => (
      <button
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="flex items-center gap-1 hover:text-foreground font-semibold"
      >
        <TrendingUp className="h-3 w-3" />
        Score
        <ArrowUpDown className="h-3 w-3" />
      </button>
    ),
    cell: ({ row }) => {
      const score = (row.getValue('score') as number) ?? 0;
      const colorClass = score >= 80
        ? 'bg-[#10b981]/10 text-[#059669] border-[#10b981]/20'
        : score >= 60
        ? 'bg-[#26251e]/10 text-[#26251e] border-[#26251e]/20'
        : 'bg-[#e5e5e0] text-[#807d72] border-[#e5e5e0]';
      if (!score) return <span className="text-[10px] text-muted-foreground/40">—</span>;
      return (
        <div className={`inline-flex items-center justify-center w-10 h-6 rounded border text-[10px] font-black ${colorClass}`}>
          {score}
        </div>
      );
    },
  },
  // Actions
  {
    id: 'actions',
    header: () => <div className="text-right pr-2">Détails</div>,
    cell: ({ row }) => {
      const lead = row.original;
      return (
        <div className="text-right pr-2">
          <Button asChild variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/5">
            <Link href={`/leads/${lead.id}`}>
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
];

