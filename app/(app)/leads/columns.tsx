'use client';

import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Lead } from '@/lib/mock-data';
import { ArrowUpDown, ArrowUpRight, Mail, MapPin, TrendingUp, Zap } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getTemperatureStyle, getTemperatureLabel } from '@/lib/lead-badges';
import { computeLeadScore } from '@/lib/lead-score';
import { LeadsAssignCell } from './_components/leads-assign-cell';
export { TEAM_ASSIGN_VALUE } from './_components/leads-assign-cell';

interface WorkspaceMember {
  id: string;
  email: string;
  member_user_id: string | null;
  profile?: { full_name: string | null; company_name: string | null } | null;
}

// Helper for status badge styling
const getStatusStyle = (status: Lead['status']) => {
  switch (status) {
    case 'New':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Contacted':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Meeting Booked':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'Proposal Sent':
      return 'bg-violet-50 text-violet-700 border-violet-200';
    case 'Negotiation':
      return 'bg-amber-50 text-amber-600 border-amber-200';
    case 'Won':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Lost':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
};

const getStatusLabel = (status: Lead['status']) => {
  switch (status) {
    case 'New': return 'Nouveau';
    case 'Contacted': return 'Contacté';
    case 'Meeting Booked': return 'RDV Fixé';
    case 'Proposal Sent': return 'Proposition envoyée';
    case 'Negotiation': return 'Négociation';
    case 'Won': return 'Gagné';
    case 'Lost': return 'Perdu';
    default: return status;
  }
};

export function buildColumns(workspaceMembers: WorkspaceMember[], lastVisitedLeadId?: string | null): ColumnDef<Lead>[] { return [
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
          className="flex items-center gap-1 hover:text-[#26251e] text-left font-semibold"
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
      const isLastVisited = lastVisitedLeadId && row.original.id === lastVisitedLeadId;
      return (
        <div className="flex items-center gap-3 py-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#059669]/10 text-[#059669] text-[10px] font-bold shrink-0">
            {initial}
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-[#26251e] leading-tight">{name}</span>
              {isLastVisited && (
                <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#059669]/10 text-[#059669] border border-[#059669]/20 whitespace-nowrap">Récemment visité</span>
              )}
            </div>
            <span className="text-[10px] text-[#7a7a76] flex items-center gap-1">
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
      return <span className="text-xs text-[#7a7a76]">{row.getValue('niche')}</span>;
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
          <span className="text-xs text-[#26251e] font-medium">{name || 'Non spécifié'}</span>
          {email && (
            <span className="text-[10px] text-[#7a7a76] flex items-center gap-1">
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
      if (!action) return <span className="text-xs text-[#7a7a76]/50 italic">Aucune</span>;
      return (
        <div className="flex flex-col gap-0.5 max-w-[180px]">
          <span className="text-xs text-[#26251e] font-medium truncate">{action}</span>
          {date && (
            <span className="text-[10px] text-[#7a7a76]">
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
        className="flex items-center gap-1 hover:text-[#26251e] font-semibold"
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
      if (!score) return <span className="text-[10px] text-[#7a7a76]/40">—</span>;
      return (
        <div className={`inline-flex items-center justify-center w-10 h-6 rounded border text-[10px] font-black ${colorClass}`}>
          {score}
        </div>
      );
    },
  },
  // Intent Score
  {
    accessorKey: 'intentScore',
    header: ({ column }) => (
      <button
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="flex items-center gap-1 hover:text-[#26251e] font-semibold"
      >
        <TrendingUp className="h-3 w-3" />
        Intent
        <ArrowUpDown className="h-3 w-3" />
      </button>
    ),
    cell: ({ row }) => {
      const intent = (row.getValue('intentScore') as number) ?? 0;
      const colorClass = intent >= 80
        ? 'bg-rose-100 text-rose-700 border-rose-200'
        : intent >= 50
        ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
        : 'bg-slate-100 text-slate-500 border-slate-200';
      if (!intent) return <span className="text-[10px] text-[#7a7a76]/40">—</span>;
      return (
        <div className={`inline-flex items-center justify-center w-10 h-6 rounded border text-[10px] font-black ${colorClass}`}>
          {intent}%
        </div>
      );
    },
  },
  // Opportunity Score (computed, not from DB)
  {
    id: 'opportunityScore',
    header: ({ column }) => (
      <button
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="flex items-center gap-1 hover:text-[#26251e] font-semibold"
      >
        <Zap className="h-3 w-3" />
        Opportunité
        <ArrowUpDown className="h-3 w-3" />
      </button>
    ),
    accessorFn: (row) => row.score || computeLeadScore(row),
    cell: ({ row }) => {
      const oppScore = row.original.score || computeLeadScore(row.original);
      const colorStyle =
        oppScore >= 70
          ? { bg: '#059669' + '1a', text: '#059669', border: '#059669' + '33' }
          : oppScore >= 40
          ? { bg: '#059669' + '1a', text: '#059669', border: '#059669' + '33' }
          : { bg: '#7a7a76' + '1a', text: '#7a7a76', border: '#7a7a76' + '33' };
      if (oppScore === 0) return <span className="text-[10px] text-[#7a7a76]/40">—</span>;
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="inline-flex items-center justify-center w-10 h-6 rounded border text-[10px] font-black cursor-help"
              style={{ backgroundColor: colorStyle.bg, color: colorStyle.text, borderColor: colorStyle.border }}
            >
              {oppScore}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Score d'opportunité: {oppScore}/100<br />Plus le score est élevé, plus ce lead est une opportunité de service.</p>
          </TooltipContent>
        </Tooltip>
      );
    },
    enableSorting: true,
  },
  // Tags (potentiel, secteur, etc. — posés manuellement ou par l'agent IA)
  {
    id: 'tags',
    header: 'Tags',
    accessorFn: (row) => row.tags ?? [],
    cell: ({ row }) => {
      const tags = row.original.tags ?? [];
      if (tags.length === 0) return <span className="text-[10px] text-[#7a7a76]/40">—</span>;
      return (
        <div className="flex flex-wrap gap-1 max-w-[160px]">
          {tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#059669]/10 text-[#059669] border border-[#059669]/20 whitespace-nowrap">
              {tag}
            </span>
          ))}
          {tags.length > 3 && <span className="text-[9px] text-[#7a7a76]">+{tags.length - 3}</span>}
        </div>
      );
    },
    enableSorting: false,
  },
  // Assignment
  {
    id: 'assignedTo',
    header: 'Assigné à',
    cell: ({ row }) => (
      <LeadsAssignCell lead={row.original} workspaceMembers={workspaceMembers} />
    ),
    enableSorting: false,
  },
  // Actions
  {
    id: 'actions',
    header: () => <div className="text-right pr-2">Détails</div>,
    cell: ({ row }) => {
      const lead = row.original;
      return (
        <div className="text-right pr-2">
          <Button asChild variant="ghost" size="icon" className="h-7 w-7 text-[#7a7a76] hover:text-[#059669] hover:bg-[#059669]/5">
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
]; }

