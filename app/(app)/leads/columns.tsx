'use client';

import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { Lead } from '@/lib/mock-data';
import { ArrowUpDown, ArrowUpRight, Mail, TrendingUp, Zap, MapPin } from 'lucide-react';
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

// Statut prospection — petit carré coloré + label, jamais un badge plein (règle Minerva).
// Source unique pour tout l'écosystème Leads/Pipeline (kanban, forecast, revenue bar).
export const STATUS_DOT: Record<Lead['status'], string> = {
  'New': '#8A9098',
  'Contacted': '#4B5158',
  'Meeting Booked': '#E8A33D',
  'Proposal Sent': '#E8A33D',
  'Negotiation': '#E8A33D',
  'Won': '#167f5b',
  'Lost': '#D64545',
};

export const STATUS_LABEL: Record<Lead['status'], string> = {
  'New': 'Nouveau',
  'Contacted': 'Contacté',
  'Meeting Booked': 'RDV fixé',
  'Proposal Sent': 'Proposition envoyée',
  'Negotiation': 'Négociation',
  'Won': 'Gagné',
  'Lost': 'Perdu',
};

export type EnrichmentStatus = 'enriched' | 'pending' | 'none';

export function getEnrichmentStatus(lead: Lead): EnrichmentStatus {
  if (lead.enrichmentReview) return 'pending';
  if (lead.enrichedAt) return 'enriched';
  return 'none';
}

const ENRICHMENT_LABEL: Record<EnrichmentStatus, string> = {
  enriched: 'Enrichi',
  pending: 'À valider',
  none: 'Non enrichi',
};

const ENRICHMENT_DOT: Record<EnrichmentStatus, string> = {
  enriched: '#167f5b',
  pending: '#E8A33D',
  none: '#8A9098',
};

function domainFromWebsite(website?: string): string | null {
  if (!website) return null;
  try {
    const url = website.startsWith('http') ? website : `https://${website}`;
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, '');
  }
}

// Distance haversine (km), 1 décimale.
function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const VISITABLE_RADIUS_KM = 15;

export function buildColumns(
  workspaceMembers: WorkspaceMember[],
  lastVisitedLeadId?: string | null,
  userLocation?: { lat: number; lon: number } | null
): ColumnDef<Lead>[] { return [
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
  // Entreprise (avatar initiales)
  {
    accessorKey: 'businessName',
    header: ({ column }) => (
      <button
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="flex items-center gap-1 hover:text-[#14171A] text-left font-semibold"
      >
        Entreprise
        <ArrowUpDown className="h-3 w-3" />
      </button>
    ),
    cell: ({ row }) => {
      const name = row.getValue('businessName') as string;
      const city = row.original.city;
      const initial = name ? name.charAt(0).toUpperCase() : 'M';
      const isLastVisited = lastVisitedLeadId && row.original.id === lastVisitedLeadId;
      return (
        <div className="flex items-center gap-3 py-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#8A9098]/15 text-[#14171A] text-[10px] font-bold shrink-0">
            {initial}
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-[#14171A] leading-tight truncate">{name}</span>
              {isLastVisited && (
                <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#167f5b]/10 text-[#167f5b] border border-[#167f5b]/20 whitespace-nowrap shrink-0">Récent</span>
              )}
            </div>
            {city && <span className="text-[10px] text-[#8A9098]">{city}</span>}
          </div>
        </div>
      );
    },
    enableHiding: false,
  },
  // Domaine
  {
    id: 'domain',
    header: 'Domaine',
    accessorFn: (row) => domainFromWebsite(row.website) ?? '',
    cell: ({ row }) => {
      const domain = domainFromWebsite(row.original.website);
      if (!domain) return <span className="text-xs text-[#8A9098]">—</span>;
      return (
        <a
          href={row.original.website}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-xs text-[#4B5158] hover:text-[#167f5b] hover:underline"
        >
          {domain}
        </a>
      );
    },
  },
  // Industrie (secteur / niche)
  {
    accessorKey: 'niche',
    header: 'Industrie',
    cell: ({ row }) => {
      const niche = row.getValue('niche') as string;
      return <span className="text-xs text-[#4B5158]">{niche || <span className="text-[#8A9098]">—</span>}</span>;
    },
  },
  // Owner (assignation d'équipe réelle — Lead.owner n'est pas utilisé ailleurs dans l'app)
  {
    id: 'assignedTo',
    header: 'Owner',
    accessorFn: (row) => row.assignedTo ?? '',
    filterFn: 'equalsString',
    cell: ({ row }) => (
      <LeadsAssignCell lead={row.original} workspaceMembers={workspaceMembers} />
    ),
    enableSorting: false,
  },
  // Contact (le modèle de données n'a qu'un contact par lead, pas une liste de contacts liés)
  {
    accessorKey: 'contactName',
    header: 'Contact',
    cell: ({ row }) => {
      const name = row.getValue('contactName') as string;
      const email = row.original.contactEmail;
      return (
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-xs text-[#14171A] truncate">{name || <span className="text-[#8A9098]">—</span>}</span>
          {email && (
            <span className="text-[10px] text-[#8A9098] flex items-center gap-1 truncate">
              <Mail className="h-2.5 w-2.5 shrink-0" />
              {email}
            </span>
          )}
        </div>
      );
    },
  },
  // Statut prospection — petit carré coloré + label
  {
    accessorKey: 'status',
    header: 'Statut prospection',
    cell: ({ row }) => {
      const status = row.getValue('status') as Lead['status'];
      return (
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm shrink-0" style={{ backgroundColor: STATUS_DOT[status] }} />
          <span className="text-xs text-[#4B5158]">{STATUS_LABEL[status] ?? status}</span>
        </div>
      );
    },
  },
  // Dernière activité
  {
    id: 'lastActivityAt',
    header: ({ column }) => (
      <button
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="flex items-center gap-1 hover:text-[#14171A] font-semibold"
      >
        Dernière activité
        <ArrowUpDown className="h-3 w-3" />
      </button>
    ),
    accessorFn: (row) => row.lastActivityAt ?? '',
    cell: ({ row }) => {
      const date = row.original.lastActivityAt;
      if (!date) return <span className="text-xs text-[#8A9098]">—</span>;
      return <span className="text-xs text-[#4B5158]">{new Date(date).toLocaleDateString('fr-FR')}</span>;
    },
  },
  // Visitable — distance depuis la position de l'utilisateur, si disponible (ajout Minerva, lien avec la carte de tournées)
  {
    id: 'visitable',
    header: 'Visitable',
    accessorFn: (row) => {
      if (!userLocation || row.latitude == null || row.longitude == null) return null;
      return distanceKm(userLocation.lat, userLocation.lon, row.latitude, row.longitude);
    },
    cell: ({ row }) => {
      const lat = row.original.latitude;
      const lon = row.original.longitude;
      if (!userLocation || lat == null || lon == null) {
        return <span className="text-xs text-[#8A9098]">—</span>;
      }
      const km = distanceKm(userLocation.lat, userLocation.lon, lat, lon);
      if (km <= VISITABLE_RADIUS_KM) {
        return (
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm shrink-0 bg-[#167f5b]" />
            <span className="text-xs text-[#167f5b] font-medium">Visitable · {km.toFixed(1)} km</span>
          </div>
        );
      }
      return (
        <span className="text-xs text-[#8A9098] flex items-center gap-1">
          <MapPin className="h-2.5 w-2.5" />
          {km.toFixed(0)} km
        </span>
      );
    },
    enableSorting: true,
  },
  // Température
  {
    accessorKey: 'temperature',
    header: 'Température',
    cell: ({ row }) => {
      const temp = row.getValue('temperature') as Lead['temperature'];
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn("inline-flex items-center rounded px-2 py-0.5 text-[9px] font-bold border cursor-help", getTemperatureStyle(temp))}>
              {getTemperatureLabel(temp)}
            </span>
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
  // Canal Préféré
  {
    accessorKey: 'preferredChannel',
    header: 'Canal Préféré',
    cell: ({ row }) => {
      const channel = (row.original.preferredChannel || 'cold_call') as string;
      const label = channel === 'sms' ? 'SMS' : channel === 'instagram_dm' ? 'Instagram DM' : 'Cold Call';
      const color = channel === 'sms'
        ? 'text-[#059669] bg-[#059669]/10 border-[#059669]/20'
        : channel === 'instagram_dm'
        ? 'text-purple-700 bg-purple-50 border-purple-200'
        : 'text-blue-700 bg-blue-50 border-blue-200';
      return (
        <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[9px] font-bold border", color)}>
          {label}
        </span>
      );
    },
  },
  // Action Suivante
  {
    accessorKey: 'nextAction',
    header: 'Action Suivante',
    cell: ({ row }) => {
      const action = row.getValue('nextAction') as string;
      const date = row.original.nextActionDate;
      if (!action) return <span className="text-xs text-[#8A9098]">—</span>;
      return (
        <div className="flex flex-col gap-0.5 max-w-[180px]">
          <span className="text-xs text-[#14171A] truncate">{action}</span>
          {date && (
            <span className="text-[10px] text-[#8A9098]">
              Pour le : {new Date(date).toLocaleDateString('fr-FR')}
            </span>
          )}
        </div>
      );
    },
  },
  // Statut d'enrichissement (dérivé — pas de champ dédié en base)
  {
    id: 'enrichmentStatus',
    header: 'Enrichissement',
    accessorFn: (row) => getEnrichmentStatus(row),
    filterFn: 'equalsString',
    cell: ({ row }) => {
      const status = getEnrichmentStatus(row.original);
      return (
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm shrink-0" style={{ backgroundColor: ENRICHMENT_DOT[status] }} />
          <span className="text-xs text-[#4B5158]">{ENRICHMENT_LABEL[status]}</span>
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
        className="flex items-center gap-1 hover:text-[#14171A] font-semibold justify-end w-full"
      >
        <TrendingUp className="h-3 w-3" />
        Score
        <ArrowUpDown className="h-3 w-3" />
      </button>
    ),
    cell: ({ row }) => {
      const score = (row.getValue('score') as number) ?? 0;
      const colorClass = score >= 80
        ? 'bg-[#167f5b]/10 text-[#167f5b] border-[#167f5b]/20'
        : score >= 60
        ? 'bg-[#14171A]/10 text-[#14171A] border-[#14171A]/20'
        : 'bg-[#8A9098]/10 text-[#8A9098] border-[#8A9098]/20';
      if (!score) return <div className="text-right pr-2 text-[10px] text-[#8A9098]">—</div>;
      return (
        <div className="flex justify-end pr-2 tabular-nums">
          <div className={`inline-flex items-center justify-center w-10 h-6 rounded border text-[10px] font-black ${colorClass}`}>
            {score}
          </div>
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
        className="flex items-center gap-1 hover:text-[#14171A] font-semibold justify-end w-full"
      >
        <TrendingUp className="h-3 w-3" />
        Intent
        <ArrowUpDown className="h-3 w-3" />
      </button>
    ),
    cell: ({ row }) => {
      const intent = (row.getValue('intentScore') as number) ?? 0;
      const colorClass = intent >= 80
        ? 'bg-[#D64545]/10 text-[#D64545] border-[#D64545]/20'
        : intent >= 50
        ? 'bg-[#167f5b]/10 text-[#167f5b] border-[#167f5b]/20'
        : 'bg-[#8A9098]/10 text-[#8A9098] border-[#8A9098]/20';
      if (!intent) return <div className="text-right pr-2 text-[10px] text-[#8A9098]">—</div>;
      return (
        <div className="flex justify-end pr-2 tabular-nums">
          <div className={`inline-flex items-center justify-center w-10 h-6 rounded border text-[10px] font-black ${colorClass}`}>
            {intent}%
          </div>
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
        className="flex items-center gap-1 hover:text-[#14171A] font-semibold justify-end w-full"
      >
        <Zap className="h-3 w-3" />
        Opportunité
        <ArrowUpDown className="h-3 w-3" />
      </button>
    ),
    accessorFn: (row) => row.score || computeLeadScore(row),
    cell: ({ row }) => {
      const oppScore = row.original.score || computeLeadScore(row.original);
      const colorClass = oppScore >= 40
        ? 'bg-[#167f5b]/10 text-[#167f5b] border-[#167f5b]/20'
        : 'bg-[#8A9098]/10 text-[#8A9098] border-[#8A9098]/20';
      if (oppScore === 0) return <div className="text-right pr-2 text-[10px] text-[#8A9098]">—</div>;
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex justify-end pr-2 tabular-nums">
              <div className={`inline-flex items-center justify-center w-10 h-6 rounded border text-[10px] font-black cursor-help ${colorClass}`}>
                {oppScore}
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Score d&apos;opportunité: {oppScore}/100<br />Plus le score est élevé, plus ce lead est une opportunité de service.</p>
          </TooltipContent>
        </Tooltip>
      );
    },
    enableSorting: true,
  },
  // Tags
  {
    id: 'tags',
    header: 'Tags',
    accessorFn: (row) => row.tags ?? [],
    cell: ({ row }) => {
      const tags = row.original.tags ?? [];
      if (tags.length === 0) return <span className="text-[10px] text-[#8A9098]">—</span>;
      return (
        <div className="flex flex-wrap gap-1 max-w-[160px]">
          {tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#167f5b]/10 text-[#167f5b] border border-[#167f5b]/20 whitespace-nowrap">
              {tag}
            </span>
          ))}
          {tags.length > 3 && <span className="text-[9px] text-[#8A9098]">+{tags.length - 3}</span>}
        </div>
      );
    },
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
          <Button asChild variant="ghost" size="icon" className="h-7 w-7 text-[#8A9098] hover:text-[#167f5b] hover:bg-[#167f5b]/5">
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
