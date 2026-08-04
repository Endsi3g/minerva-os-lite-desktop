'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryState, parseAsString } from 'nuqs';
import { useReach } from '@/lib/reach-context';
import { getApiUrl } from '@/lib/api-helper';
import { cachedFetch } from '@/lib/fetch-cache';
import { Lead } from '@/lib/mock-data';
import {
  Users, Search, Mail, Phone, ChevronRight, MessageSquareText, PhoneCall, AtSign,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LeadsAssignCell } from '../../leads/_components/leads-assign-cell';

interface WorkspaceMember {
  id: string;
  email: string;
  member_user_id: string | null;
  profile?: { full_name: string | null; company_name: string | null } | null;
}

interface Contact {
  id: string;
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  company: string;
  city: string;
  niche: string;
  score?: number;
  leadId: string;
  status: Lead['status'];
  lastActivityAt?: string;
  lead: Lead;
}

const STATUS_DOT: Record<Lead['status'], string> = {
  'New': '#8A9098',
  'Contacted': '#4B5158',
  'Meeting Booked': '#E8A33D',
  'Proposal Sent': '#E8A33D',
  'Negotiation': '#E8A33D',
  'Won': '#167f5b',
  'Lost': '#D64545',
};

const STATUS_LABEL: Record<Lead['status'], string> = {
  'New': 'Nouveau',
  'Contacted': 'Contacté',
  'Meeting Booked': 'RDV fixé',
  'Proposal Sent': 'Proposition envoyée',
  'Negotiation': 'Négociation',
  'Won': 'Gagné',
  'Lost': 'Perdu',
};

const SORT_OPTIONS: { value: 'name' | 'company' | 'score'; label: string }[] = [
  { value: 'name', label: 'Nom (A→Z)' },
  { value: 'company', label: 'Entreprise (A→Z)' },
  { value: 'score', label: 'Score (décroissant)' },
];

const CHANNEL_META: Record<NonNullable<Lead['preferredChannel']>, { label: string; icon: typeof MessageSquareText }> = {
  sms: { label: 'SMS', icon: MessageSquareText },
  cold_call: { label: 'Cold Call', icon: PhoneCall },
  instagram_dm: { label: 'Instagram DM', icon: AtSign },
};

function PreferredChannelCell({ contact }: { contact: Contact }) {
  const { updateLead } = useReach();
  const value = contact.lead.preferredChannel;

  return (
    <Select
      value={value ?? 'none'}
      onValueChange={(v) => updateLead(contact.leadId, { preferredChannel: v === 'none' ? undefined : (v as Lead['preferredChannel']) })}
    >
      <SelectTrigger className="h-7 w-auto gap-1.5 border-none bg-transparent px-1.5 text-xs shadow-none text-[#4B5158] hover:bg-[#f4f4f3] focus:ring-0 [&_svg]:h-3.5 [&_svg]:w-3.5">
        <SelectValue placeholder="—">
          {value ? (
            <span className="flex items-center gap-1.5">
              {React.createElement(CHANNEL_META[value].icon, { className: 'h-3.5 w-3.5 text-[#8A9098]' })}
              {CHANNEL_META[value].label}
            </span>
          ) : (
            <span className="text-[#8A9098]">—</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none" className="text-xs">—</SelectItem>
        <SelectItem value="sms" className="text-xs">SMS</SelectItem>
        <SelectItem value="cold_call" className="text-xs">Cold Call</SelectItem>
        <SelectItem value="instagram_dm" className="text-xs">Instagram DM</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function ContactsRoot() {
  const { leads, activeWorkspace } = useReach();
  const router = useRouter();

  // Recherche + tri dans l'URL — même pattern que /leads : une vue devient un lien partageable.
  const [search, setSearch] = useQueryState('q', parseAsString.withDefault(''));
  const [sortBy, setSortBy] = useQueryState('sort', parseAsString.withDefault('name'));

  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const fetchMembers = useCallback(async () => {
    if (!activeWorkspace) return;
    const ownerParam = activeWorkspace.owner_id ? `?ownerUserId=${activeWorkspace.owner_id}` : '';
    try {
      const data = await cachedFetch<{ members: WorkspaceMember[] }>(
        getApiUrl(`/api/team/members${ownerParam}`),
        undefined,
        30_000
      );
      setWorkspaceMembers(data.members || []);
    } catch {}
  }, [activeWorkspace?.id]);
  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const contacts: Contact[] = useMemo(() =>
    leads
      .filter(l => l.contactName)
      .map(l => ({
        id: `${l.id}-contact`,
        name: l.contactName,
        title: l.decisionMakerRole,
        email: l.contactEmail,
        phone: l.phone,
        company: l.businessName,
        city: l.city,
        niche: l.niche,
        score: l.score,
        leadId: l.id,
        status: l.status,
        lastActivityAt: l.lastActivityAt,
        lead: l,
      })),
    [leads]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return contacts
      .filter(c =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.niche.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        if (sortBy === 'company') return a.company.localeCompare(b.company, 'fr');
        if (sortBy === 'score') return (b.score ?? 0) - (a.score ?? 0);
        return a.name.localeCompare(b.name, 'fr');
      });
  }, [contacts, search, sortBy]);

  // Regroupement alphabétique — uniquement pertinent quand trié par nom.
  const grouped = useMemo(() => {
    if (sortBy !== 'name') return [{ letter: '', items: filtered }];
    const map: Record<string, Contact[]> = {};
    for (const c of filtered) {
      const l = c.name[0]?.toUpperCase() ?? '#';
      if (!map[l]) map[l] = [];
      map[l].push(c);
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b, 'fr'))
      .map(([letter, items]) => ({ letter, items }));
  }, [filtered, sortBy]);

  const withEmail = contacts.filter(c => c.email).length;
  const withPhone = contacts.filter(c => c.phone).length;

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf8] relative">
      <div className="absolute inset-0 opacity-[0.25] pointer-events-none bg-grid-pattern-20 z-0" />
      <div className="relative z-10 w-full p-3 sm:p-4 md:p-6 space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#e5e5e0]">
          <div>
            <h1 className="text-2xl font-heading font-medium tracking-tight text-[#14171A]">Contacts</h1>
            <p className="text-xs text-[#4B5158] mt-0.5">
              Toutes les personnes-contacts de tes prospects ({contacts.length} au total).
            </p>
          </div>
        </div>

        {/* Stats chips */}
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Total', value: contacts.length, color: '#14171A' },
            { label: 'Avec email', value: withEmail, color: '#4B5158' },
            { label: 'Avec tél.', value: withPhone, color: '#167f5b' },
            { label: 'Clients gagnés', value: contacts.filter(c => c.status === 'Won').length, color: '#167f5b' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-[#e5e5e0]">
              <span className="text-sm font-black" style={{ color: s.color }}>{s.value}</span>
              <span className="text-[10px] text-[#8A9098]">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Sort (aligné à droite) */}
        <div className="flex items-center justify-end">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v === 'name' ? null : v)}>
            <SelectTrigger className="h-8 min-w-[160px] text-xs bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Recherche — un seul champ pleine largeur */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8A9098]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value || null)}
            placeholder="Rechercher un contact, email, entreprise…"
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-[#e5e5e0] bg-white text-xs text-[#14171A] placeholder:text-[#8A9098] focus:outline-none focus:border-[#167f5b]/50 transition-colors"
          />
        </div>

        {/* Table de contacts */}
        {contacts.length === 0 ? (
          <EmptyState />
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#8A9098]">Aucun contact ne correspond à la recherche.</div>
        ) : (
          <div className="rounded-md border border-[#e5e5e0] bg-white overflow-x-auto">
            <Table>
              <TableHeader className="bg-[#f4f4f3]/40">
                <TableRow>
                  <TableHead className="h-10 text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">Contact</TableHead>
                  <TableHead className="h-10 text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">Titre</TableHead>
                  <TableHead className="h-10 text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">Email / Téléphone</TableHead>
                  <TableHead className="h-10 text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">Entreprise</TableHead>
                  <TableHead className="h-10 text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">Owner</TableHead>
                  <TableHead className="h-10 text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">Canal préféré</TableHead>
                  <TableHead className="h-10 text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">Statut</TableHead>
                  <TableHead className="h-10 text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">Dernière activité</TableHead>
                  <TableHead className="h-10 text-right pr-4 text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">Score</TableHead>
                  <TableHead className="h-10 w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {grouped.map((group) => (
                  <React.Fragment key={group.letter || 'all'}>
                    {group.letter && (
                      <TableRow className="hover:bg-transparent border-b-0">
                        <TableCell colSpan={10} className="py-1.5 px-4 bg-[#fafaf8] text-[10px] font-black uppercase tracking-widest text-[#8A9098]">
                          {group.letter}
                        </TableCell>
                      </TableRow>
                    )}
                    {group.items.map((c) => (
                      <TableRow
                        key={c.id}
                        className="hover:bg-[#f4f4f3]/70 transition-colors border-b border-[#e5e5e0] last:border-0 cursor-pointer"
                        onClick={(e) => {
                          const target = e.target as HTMLElement;
                          if (target.closest('button') || target.closest('a') || target.closest('[role="combobox"]')) return;
                          router.push(`/leads/${c.leadId}`);
                        }}
                      >
                        <TableCell className="py-2.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#8A9098]/15 text-[#14171A] text-[10px] font-bold shrink-0">
                              {c.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <span className="text-xs font-semibold text-[#14171A] truncate">{c.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5 px-4 text-xs text-[#4B5158]">
                          {c.title || <span className="text-[#8A9098]">—</span>}
                        </TableCell>
                        <TableCell className="py-2.5 px-4">
                          <div className="flex flex-col gap-0.5">
                            {c.email
                              ? <span className="text-xs text-[#4B5158] truncate">{c.email}</span>
                              : <span className="text-xs text-[#8A9098]">—</span>}
                            {c.phone && <span className="text-[10px] text-[#8A9098]">{c.phone}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5 px-4 text-xs text-[#4B5158] truncate max-w-[160px]">{c.company}</TableCell>
                        <TableCell className="py-2.5 px-4">
                          <LeadsAssignCell lead={c.lead} workspaceMembers={workspaceMembers} />
                        </TableCell>
                        <TableCell className="py-2.5 px-2">
                          <PreferredChannelCell contact={c} />
                        </TableCell>
                        <TableCell className="py-2.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-sm shrink-0" style={{ backgroundColor: STATUS_DOT[c.status] }} />
                            <span className="text-xs text-[#4B5158]">{STATUS_LABEL[c.status] ?? c.status}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5 px-4 text-xs text-[#4B5158]">
                          {c.lastActivityAt ? new Date(c.lastActivityAt).toLocaleDateString('fr-FR') : <span className="text-[#8A9098]">—</span>}
                        </TableCell>
                        <TableCell className="py-2.5 px-4 text-right pr-4 tabular-nums text-xs font-bold text-[#14171A]">
                          {c.score ?? <span className="text-[#8A9098] font-normal">—</span>}
                        </TableCell>
                        <TableCell className="py-2.5 px-2">
                          <div className="flex items-center gap-1 shrink-0 justify-end">
                            {c.email && (
                              <a
                                href={`mailto:${c.email}`}
                                onClick={e => e.stopPropagation()}
                                className="h-7 w-7 rounded-lg flex items-center justify-center text-[#8A9098] hover:bg-[#4B5158]/10 hover:text-[#4B5158] transition-colors"
                                title={c.email}
                              >
                                <Mail className="h-3.5 w-3.5" />
                              </a>
                            )}
                            {c.phone && (
                              <a
                                href={`tel:${c.phone}`}
                                onClick={e => e.stopPropagation()}
                                className="h-7 w-7 rounded-lg flex items-center justify-center text-[#8A9098] hover:bg-[#167f5b]/10 hover:text-[#167f5b] transition-colors"
                                title={c.phone}
                              >
                                <Phone className="h-3.5 w-3.5" />
                              </a>
                            )}
                            <ChevronRight className="h-3.5 w-3.5 text-[#e5e5e0]" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <div className="h-14 w-14 rounded-2xl border border-[#e5e5e0] bg-white flex items-center justify-center">
        <Users className="h-6 w-6 text-[#8A9098]/50" />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-[#14171A]">Aucun contact</h3>
        <p className="text-xs text-[#8A9098] max-w-xs leading-relaxed">
          Les contacts sont extraits automatiquement de vos leads. Importez ou créez des leads pour les voir ici.
        </p>
      </div>
      <Link
        href="/prospecting"
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#167f5b] hover:bg-[#0f6b4c] text-white text-xs font-bold transition-colors"
      >
        Aller à la prospection
      </Link>
    </div>
  );
}
