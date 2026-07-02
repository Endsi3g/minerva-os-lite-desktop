'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useReach } from '@/lib/reach-context';
import {
  Users, Search, Mail, Phone, MapPin, Building2, ChevronRight, Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company: string;
  city: string;
  niche: string;
  score?: number;
  leadId: string;
  status: string;
}

const STATUS_COLOR: Record<string, string> = {
  'Won':           'text-[#059669]',
  'Negotiation':   'text-blue-600',
  'Proposal Sent': 'text-indigo-500',
  'Meeting Booked':'text-purple-500',
  'Contacted':     'text-amber-600',
  'New':           'text-[#7a7a76]',
  'Lost':          'text-red-400',
};

export function ContactsRoot() {
  const { leads } = useReach();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'company' | 'score'>('name');

  const contacts: Contact[] = useMemo(() =>
    leads
      .filter(l => l.contactName)
      .map(l => ({
        id: `${l.id}-contact`,
        name: l.contactName,
        email: l.contactEmail,
        phone: l.phone,
        company: l.businessName,
        city: l.city,
        niche: l.niche,
        score: l.score,
        leadId: l.id,
        status: l.status,
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
        if (sortBy === 'name') return a.name.localeCompare(b.name, 'fr');
        if (sortBy === 'company') return a.company.localeCompare(b.company, 'fr');
        return (b.score ?? 0) - (a.score ?? 0);
      });
  }, [contacts, search, sortBy]);

  // Group alphabetically when sorted by name
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
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[#059669]" />
              <h1 className="text-xl font-bold tracking-tight text-[#26251e]">Contacts</h1>
            </div>
            <p className="text-xs text-[#7a7a76] mt-0.5">
              {contacts.length} contact{contacts.length !== 1 ? 's' : ''} · {withEmail} avec email · {withPhone} avec téléphone
            </p>
          </div>
        </div>

        {/* Stats chips */}
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Total', value: contacts.length, color: 'text-[#26251e]' },
            { label: 'Avec email', value: withEmail, color: 'text-sky-600' },
            { label: 'Avec tél.', value: withPhone, color: 'text-[#059669]' },
            { label: 'Clients gagnés', value: contacts.filter(c => c.status === 'Won').length, color: 'text-[#059669]' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-[#e5e5e0]">
              <span className={cn('text-sm font-black', s.color)}>{s.value}</span>
              <span className="text-[10px] text-[#7a7a76]">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Search + sort */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#7a7a76]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un contact, email, entreprise…"
              className="w-full h-9 pl-8 pr-3 rounded-lg border border-[#e5e5e0] bg-white text-xs text-[#26251e] placeholder:text-[#7a7a76] focus:outline-none focus:border-[#059669]/50 transition-colors"
            />
          </div>
          <div className="flex items-center gap-1">
            {(['name', 'company', 'score'] as const).map(s => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={cn(
                  'h-9 px-3 rounded-lg text-xs font-semibold border transition-colors',
                  sortBy === s
                    ? 'bg-[#059669] text-white border-[#059669]'
                    : 'bg-white text-[#555552] border-[#e5e5e0] hover:border-[#059669]/50'
                )}
              >
                {s === 'name' ? 'Nom' : s === 'company' ? 'Entreprise' : 'Score'}
              </button>
            ))}
          </div>
        </div>

        {/* Contact list */}
        {contacts.length === 0 ? (
          <EmptyState />
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#7a7a76]">Aucun contact ne correspond à la recherche.</div>
        ) : (
          <div className="space-y-5">
            {grouped.map(group => (
              <div key={group.letter}>
                {group.letter && (
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#7a7a76] mb-2 sticky top-0 bg-[#fafaf8]/90 backdrop-blur-sm py-1">
                    {group.letter}
                  </p>
                )}
                <div className="space-y-1.5">
                  {group.items.map(c => (
                    <Link key={c.leadId} href={`/leads/${c.leadId}`}>
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-[#e5e5e0] hover:border-[#059669]/30 hover:shadow-sm transition-all cursor-pointer group">
                        {/* Avatar */}
                        <div className="h-9 w-9 rounded-full bg-[#059669]/10 flex items-center justify-center shrink-0 text-xs font-black text-[#059669]">
                          {c.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-[#26251e] truncate">{c.name}</p>
                            {c.score !== undefined && (
                              <span className="flex items-center gap-0.5 text-[9px] font-bold text-[#059669] shrink-0">
                                <Star className="h-2.5 w-2.5" />
                                {c.score}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="flex items-center gap-1 text-[10px] text-[#7a7a76]">
                              <Building2 className="h-2.5 w-2.5 shrink-0" />
                              <span className="truncate max-w-32">{c.company}</span>
                            </span>
                            {c.city && (
                              <span className="flex items-center gap-1 text-[10px] text-[#7a7a76]">
                                <MapPin className="h-2.5 w-2.5 shrink-0" />
                                {c.city}
                              </span>
                            )}
                            <span className={cn('text-[10px] font-semibold', STATUS_COLOR[c.status] ?? 'text-[#7a7a76]')}>
                              {c.status}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          {c.email && (
                            <a
                              href={`mailto:${c.email}`}
                              onClick={e => e.stopPropagation()}
                              className="h-7 w-7 rounded-lg flex items-center justify-center text-[#7a7a76] hover:bg-sky-50 hover:text-sky-600 transition-colors"
                              title={c.email}
                            >
                              <Mail className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {c.phone && (
                            <a
                              href={`tel:${c.phone}`}
                              onClick={e => e.stopPropagation()}
                              className="h-7 w-7 rounded-lg flex items-center justify-center text-[#7a7a76] hover:bg-[#059669]/10 hover:text-[#059669] transition-colors"
                              title={c.phone}
                            >
                              <Phone className="h-3.5 w-3.5" />
                            </a>
                          )}
                          <ChevronRight className="h-3.5 w-3.5 text-[#e5e5e0] group-hover:text-[#7a7a76] transition-colors" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
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
        <Users className="h-6 w-6 text-[#7a7a76]/40" />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-[#26251e]">Aucun contact</h3>
        <p className="text-xs text-[#7a7a76] max-w-xs leading-relaxed">
          Les contacts sont extraits automatiquement de vos leads. Importez ou créez des leads pour les voir ici.
        </p>
      </div>
      <Link
        href="/prospecting"
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold transition-colors"
      >
        Aller à la prospection
      </Link>
    </div>
  );
}
