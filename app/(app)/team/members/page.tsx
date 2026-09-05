'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Search, Users, Trophy, Zap, Target, Coins, Award,
  MapPin, Loader2, TrendingUp, CheckCircle2, CalendarDays,
  Shield, Star, Eye, Mail, UserPlus, SortAsc, SortDesc,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getApiUrl } from '@/lib/api-helper';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Member {
  id: string;
  email: string;
  role: string;
  status: string;
  isOwner?: boolean;
  member_user_id?: string | null;
  invited_at?: string;
  joined_at?: string | null;
  profile?: { full_name?: string; company_name?: string; avatar_base64?: string | null } | null;
}

interface MemberWithStats extends Member {
  leadCount: number;
  booked: number;
  won: number;
  revenue: number;
  rate: number;
  score: number;
  badges: { id: string; label: string; iconName: string; color: string }[];
  loadingStats: boolean;
}

const ROLE_CONFIG = {
  admin:  { label: 'Admin',      icon: Shield, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  editor: { label: 'Éditeur',    icon: Star,   color: 'bg-blue-50 text-blue-700 border-blue-200' },
  viewer: { label: 'Observateur',icon: Eye,    color: 'bg-stone-50 text-stone-600 border-stone-200' },
};

const SORT_OPTIONS = [
  { id: 'score',  label: 'Score' },
  { id: 'name',   label: 'Nom' },
  { id: 'leads',  label: 'Leads' },
  { id: 'won',    label: 'Deals' },
];

function BadgePill({ id, label, icon, color }: { id: string; label: string; icon: React.ReactNode; color: string }) {
  return (
    <Link
      href={`/leaderboard/badges?badge=${id}`}
      className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg border text-[9px] font-black hover:opacity-75 transition-opacity', color)}
      title={label}
    >
      {icon}
      <span className="hidden sm:inline truncate max-w-[80px]">{label}</span>
    </Link>
  );
}

export default function TeamMembersPage() {
  const [members, setMembers] = useState<MemberWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'score' | 'name' | 'leads' | 'won'>('score');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(getApiUrl('/api/team/members'));
        const data = await res.json();
        const raw: Member[] = data.members ?? [];

        // Initialize members with empty stats
        const membersWithStats: MemberWithStats[] = raw.map(m => ({
          ...m,
          leadCount: 0, booked: 0, won: 0, revenue: 0, rate: 0, score: 0,
          badges: [],
          loadingStats: true,
        }));
        setMembers(membersWithStats);
        setLoading(false);

        // Fetch CRM stats for each member with a user_id
        const supabase = createClient();
        await Promise.all(
          membersWithStats.map(async (m) => {
            if (!m.member_user_id) {
              setMembers(prev => prev.map(p => p.id === m.id ? { ...p, loadingStats: false } : p));
              return;
            }
            try {
              const { data: leads } = await supabase
                .from('leads')
                .select('id, status, revenue')
                .eq('user_id', m.member_user_id);

              const allLeads = leads ?? [];
              const leadCount = allLeads.length;
              const booked = allLeads.filter((l: { status: string }) => ['Call Booked', 'Meeting Booked', 'Demo', 'Proposal'].includes(l.status)).length;
              const won = allLeads.filter((l: { status: string }) => l.status === 'Won').length;
              const revenue = allLeads.filter((l: { status: string }) => l.status === 'Won').reduce((s: number, l: { revenue: number | null }) => s + (Number(l.revenue) || 0), 0);
              const contacted = allLeads.filter((l: { status: string }) => l.status !== 'New').length;
              const rate = contacted > 0 ? Math.round(((booked + won) / contacted) * 100) : 0;
              const score = (leadCount * 2) + (booked * 25) + (won * 60) + Math.round(revenue / 100);

              const badges: MemberWithStats['badges'] = [];
              if (won >= 1) badges.push({ id: 'deal-100', label: 'Bonus 1er Deal', iconName: 'Coins', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' });
              if (won >= 2) badges.push({ id: 'top-closer', label: 'Top Closer', iconName: 'Trophy', color: 'bg-amber-50 text-amber-800 border-amber-200' });
              if (booked >= 4) badges.push({ id: 'rdv-machine', label: 'Machine à RDV', iconName: 'Zap', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' });
              if (rate >= 20) badges.push({ id: 'sniper', label: 'Sniper', iconName: 'Target', color: 'bg-blue-50 text-blue-800 border-blue-200' });
              if (leadCount >= 3) badges.push({ id: 'field-explorer', label: 'Explorateur', iconName: 'MapPin', color: 'bg-orange-50 text-orange-800 border-orange-200' });

              setMembers(prev => prev.map(p =>
                p.id === m.id ? { ...p, leadCount, booked, won, revenue, rate, score, badges, loadingStats: false } : p
              ));
            } catch {
              setMembers(prev => prev.map(p => p.id === m.id ? { ...p, loadingStats: false } : p));
            }
          })
        );
      } catch {
        setLoading(false);
      }
    }
    load();
  }, []);

  const BADGE_ICONS: Record<string, React.ReactNode> = {
    Coins:   <Coins className="h-2.5 w-2.5" />,
    Trophy:  <Trophy className="h-2.5 w-2.5" />,
    Zap:     <Zap className="h-2.5 w-2.5" />,
    Target:  <Target className="h-2.5 w-2.5" />,
    MapPin:  <MapPin className="h-2.5 w-2.5" />,
  };

  const filtered = useMemo(() => {
    let list = members.filter(m => {
      const name = m.profile?.full_name || m.email || '';
      return name.toLowerCase().includes(search.toLowerCase()) ||
        m.email.toLowerCase().includes(search.toLowerCase()) ||
        m.role.toLowerCase().includes(search.toLowerCase());
    });
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'score')  cmp = b.score - a.score;
      if (sortBy === 'leads')  cmp = b.leadCount - a.leadCount;
      if (sortBy === 'won')    cmp = b.won - a.won;
      if (sortBy === 'name') {
        const an = a.profile?.full_name || a.email || '';
        const bn = b.profile?.full_name || b.email || '';
        cmp = an.localeCompare(bn, 'fr');
      }
      return sortAsc ? -cmp : cmp;
    });
    return list;
  }, [members, search, sortBy, sortAsc]);

  const activeCount = members.filter(m => m.status === 'active').length;

  return (
    <div className="flex flex-col min-h-full bg-[#fafaf8] text-[#111827]">
      {/* Header */}
      <div className="bg-white border-b border-[#e5e5e0] px-4 sm:px-8 py-5 shrink-0">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
            <div>
              <Link
                href="/team"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7a7a76] hover:text-[#26251e] transition-colors mb-2"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Retour à l'équipe
              </Link>
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center shadow-xs">
                  <Users className="h-5 w-5 text-[#059669]" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-[#111827] tracking-tight">Annuaire des Profils</h1>
                  <p className="text-xs text-[#6B7280]">
                    <span className="font-bold text-[#059669]">{activeCount}</span> membres actifs · {members.length} au total
                  </p>
                </div>
              </div>
            </div>
            <Link
              href="/team/invite"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#059669] text-white text-xs font-black hover:bg-[#047857] transition-colors shadow-xs shrink-0"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Inviter un membre
            </Link>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white border-b border-[#e5e5e0] px-4 sm:px-8 py-3 shrink-0">
        <div className="max-w-6xl mx-auto flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#7a7a76]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un membre…"
              className="w-full h-8 pl-9 pr-3 rounded-xl bg-[#fafaf8] border border-[#e5e5e0] text-xs font-medium text-[#111827] placeholder:text-[#7a7a76] outline-none focus:ring-1 focus:ring-[#059669]"
            />
          </div>

          {/* Sort */}
          <div className="inline-flex items-center gap-1 rounded-xl border border-[#e5e5e0] bg-[#fafaf8] p-1 overflow-x-auto">
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => {
                  if (sortBy === opt.id) setSortAsc(a => !a);
                  else { setSortBy(opt.id as typeof sortBy); setSortAsc(false); }
                }}
                className={cn(
                  'px-3 py-1 rounded-lg text-[10px] font-black transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer',
                  sortBy === opt.id ? 'bg-[#059669] text-white' : 'text-[#6B7280] hover:text-[#111827]'
                )}
              >
                {opt.label}
                {sortBy === opt.id && (sortAsc ? <SortAsc className="h-2.5 w-2.5" /> : <SortDesc className="h-2.5 w-2.5" />)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 px-4 sm:px-8 py-6">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-[#059669]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-[#e5e5e0]">
              <Users className="h-8 w-8 text-[#a3a197] mx-auto mb-2" />
              <p className="text-sm font-bold text-[#26251e]">Aucun membre trouvé</p>
              <p className="text-xs text-[#7a7a76] mt-0.5">Essayez un autre terme de recherche.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((m, index) => {
                const displayName = m.profile?.full_name || m.email?.split('@')[0] || 'Membre';
                const avatar = m.profile?.avatar_base64;
                const roleConf = ROLE_CONFIG[m.role as keyof typeof ROLE_CONFIG] ?? ROLE_CONFIG.editor;
                const RoleIcon = roleConf.icon;
                const lastSeen = m.joined_at
                  ? formatDistanceToNow(parseISO(m.joined_at), { addSuffix: true, locale: fr })
                  : m.invited_at ? `Invité ${formatDistanceToNow(parseISO(m.invited_at), { addSuffix: true, locale: fr })}` : null;
                const rank = index + 1;

                return (
                  <Link
                    key={m.id}
                    href={`/team/member/${m.id}`}
                    className="group block rounded-2xl border border-[#e5e5e0] bg-white p-5 shadow-xs hover:shadow-md hover:border-[#059669]/30 transition-all duration-200"
                  >
                    {/* Top row: rank + name + status */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="relative shrink-0">
                          <div className="w-11 h-11 rounded-full bg-[#1E4B33]/10 text-[#1E4B33] font-black text-lg flex items-center justify-center border-2 border-white shadow-xs overflow-hidden">
                            {avatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={avatar} alt={displayName} className="w-full h-full object-cover" />
                            ) : (
                              displayName.charAt(0).toUpperCase()
                            )}
                          </div>
                          {/* Online dot */}
                          <div className={cn(
                            'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white',
                            m.status === 'active' ? 'bg-[#059669]' : 'bg-[#d4d4cd]'
                          )} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-[#111827] truncate group-hover:text-[#059669] transition-colors">
                            {displayName}
                          </p>
                          <p className="text-[10px] text-[#6B7280] truncate">{m.email}</p>
                        </div>
                      </div>

                      {/* Rank badge */}
                      <span className={cn(
                        'shrink-0 inline-flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-black border',
                        rank === 1 ? 'bg-amber-100 text-amber-800 border-amber-300' :
                        rank === 2 ? 'bg-slate-100 text-slate-700 border-slate-200' :
                        rank === 3 ? 'bg-orange-50 text-orange-700 border-orange-200' :
                        'bg-[#f4f4f3] text-[#6B7280] border-[#e5e5e0]'
                      )}>
                        #{rank}
                      </span>
                    </div>

                    {/* Role badge + status */}
                    <div className="flex items-center gap-1.5 mb-4">
                      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[9px] font-black', roleConf.color)}>
                        <RoleIcon className="h-2.5 w-2.5" />
                        {roleConf.label}
                      </span>
                      {m.isOwner && (
                        <span className="px-2 py-0.5 rounded-lg text-[9px] font-black bg-[#059669]/8 text-[#059669] border border-[#059669]/15">
                          Propriétaire
                        </span>
                      )}
                      {m.status === 'pending' && (
                        <span className="px-2 py-0.5 rounded-lg text-[9px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                          En attente
                        </span>
                      )}
                    </div>

                    {/* CRM Metrics row */}
                    <div className="grid grid-cols-4 gap-1 mb-4">
                      {[
                        { label: 'Leads',  value: m.leadCount,  icon: <Users className="h-2.5 w-2.5" />, color: 'text-[#059669]' },
                        { label: 'RDV',    value: m.booked,     icon: <CalendarDays className="h-2.5 w-2.5" />, color: 'text-blue-600' },
                        { label: 'Deals',  value: m.won,        icon: <Trophy className="h-2.5 w-2.5" />, color: 'text-amber-600' },
                        { label: 'Conv.',  value: m.rate > 0 ? `${m.rate}%` : '—', icon: <TrendingUp className="h-2.5 w-2.5" />, color: 'text-[#059669]' },
                      ].map(({ label, value, icon, color }) => (
                        <div key={label} className="flex flex-col items-center p-1.5 rounded-xl bg-[#fafaf8] border border-[#f0f0ec]">
                          <div className={cn('mb-0.5', color)}>{icon}</div>
                          <p className={cn('text-sm font-black', m.loadingStats ? 'text-[#d4d4cd]' : color)}>
                            {m.loadingStats ? '…' : value}
                          </p>
                          <p className="text-[8px] font-bold text-[#a3a197] uppercase">{label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Score bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-[9px] font-black text-[#7a7a76] mb-1">
                        <span>Score</span>
                        <span className="text-[#059669]">{m.loadingStats ? '…' : m.score.toLocaleString('fr-FR')} pts</span>
                      </div>
                      <div className="h-1 w-full rounded-full bg-[#f0f0ec] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#059669] transition-all duration-700"
                          style={{ width: `${Math.min(100, (m.score / Math.max(1, filtered[0]?.score || 1)) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Badges */}
                    {m.badges.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {m.badges.slice(0, 3).map(b => (
                          <BadgePill
                            key={b.id}
                            id={b.id}
                            label={b.label}
                            icon={BADGE_ICONS[b.iconName]}
                            color={b.color}
                          />
                        ))}
                        {m.badges.length > 3 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-lg bg-[#f4f4f3] border border-[#e5e5e0] text-[9px] font-black text-[#7a7a76]">
                            +{m.badges.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Footer: joined */}
                    {lastSeen && (
                      <p className="text-[9px] text-[#a3a197] font-semibold mt-1 flex items-center gap-1">
                        <CheckCircle2 className="h-2.5 w-2.5 text-[#059669]" />
                        Membre {lastSeen}
                      </p>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
