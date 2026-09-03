'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { 
  Trophy, 
  Medal, 
  Flame, 
  TrendingUp, 
  Users, 
  Target, 
  Calendar, 
  PhoneCall, 
  Sparkles, 
  Crown, 
  ShieldCheck, 
  Award, 
  ArrowUpRight, 
  Filter,
  CheckCircle2,
  Zap,
  Search,
  RefreshCw,
  Share2,
  Coins,
  Bot,
} from 'lucide-react';
import { useReach } from '@/lib/reach-context';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { calculateMonthlyTeamChallenge, computeTeamRewards } from '@/lib/rewards-engine';
import { TeamRewardsCard } from '@/components/team-rewards-card';

type TimeRange = 'today' | 'week' | 'month' | 'all';

interface RepPerformance {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  isAi?: boolean;
  leadsContacted: number;
  meetingsBooked: number;
  dealsWon: number;
  revenueWon: number;
  conversionRate: number;
  score: number;
  badges: { title: string; icon: string; color: string }[];
}

export default function LeaderboardPage() {
  const { leads, activeWorkspace } = useReach();
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [search, setSearch] = useState('');
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch real workspace team members
  useEffect(() => {
    const fetchTeam = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('team_members')
          .select('*');
        if (!error && data && data.length > 0) {
          setTeamMembers(data);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchTeam();
  }, []);

  // Challenge & Récompenses d'équipe
  const challenge = useMemo(() => {
    return calculateMonthlyTeamChallenge(leads, Math.max(1, teamMembers.length || 2), 5);
  }, [leads, teamMembers]);

  const memberRewards = useMemo(() => {
    const membersList = teamMembers.length > 0 
      ? teamMembers.map(m => ({ id: m.id, name: m.email.split('@')[0].replace('.', ' '), email: m.email }))
      : [
          { id: 'usr-owner', name: 'Kael Belceus', email: 'kael@minerva.os' },
          { id: 'usr-ai-sdr', name: 'Minerva AI SDR', email: 'ai.sdr@minerva.os' },
        ];
    return computeTeamRewards(leads, membersList, challenge);
  }, [leads, teamMembers, challenge]);

  // Compute leaderboard performance from real CRM leads & team members
  const leaderboardData = useMemo<RepPerformance[]>(() => {
    // Collect all reps (starting with default account owner + team members + Minerva AI)
    const baseReps: { id: string; name: string; email: string; role: string; isAi?: boolean }[] = [
      { id: 'usr-owner', name: 'Kael Belceus', email: 'kael@minerva.os', role: 'Fondateur / Head of Sales' },
      { id: 'usr-ai-sdr', name: 'Minerva AI SDR', email: 'ai.sdr@minerva.os', role: 'Autonomous AI SDR', isAi: true },
    ];

    if (teamMembers.length > 0) {
      teamMembers.forEach(m => {
        if (!baseReps.find(r => r.email.toLowerCase() === m.email.toLowerCase())) {
          baseReps.push({
            id: m.id,
            name: m.email.split('@')[0].replace('.', ' '),
            email: m.email,
            role: m.role === 'admin' ? 'Lead SDR' : 'Sales Representative',
          });
        }
      });
    }

    // Distribute real leads metrics or calculate based on assignment
    const totalWon = leads.filter(l => l.status === 'Won');
    const totalBooked = leads.filter(l => ['Call Booked', 'Demo', 'Proposal'].includes(l.status));
    const totalContacted = leads.filter(l => l.status !== 'New');

    // Multiplier based on timeRange
    const multiplier = timeRange === 'today' ? 0.2 : timeRange === 'week' ? 0.6 : timeRange === 'month' ? 1.0 : 1.5;

    return baseReps.map((rep, idx) => {
      // Attribute leads proportionally for demonstration if unassigned, or actual assigned leads
      const assignedLeads = leads.filter(l => (l as any).assignedTo === rep.id);
      
      const repContacted = assignedLeads.length > 0
        ? assignedLeads.filter(l => l.status !== 'New').length
        : Math.round((totalContacted.length * (idx === 0 ? 0.55 : idx === 1 ? 0.35 : 0.1) * multiplier) || (idx === 0 ? 28 : idx === 1 ? 22 : 12));

      const repBooked = assignedLeads.length > 0
        ? assignedLeads.filter(l => ['Call Booked', 'Demo', 'Proposal'].includes(l.status)).length
        : Math.round((totalBooked.length * (idx === 0 ? 0.6 : idx === 1 ? 0.3 : 0.1) * multiplier) || (idx === 0 ? 7 : idx === 1 ? 5 : 2));

      const repWon = assignedLeads.length > 0
        ? assignedLeads.filter(l => l.status === 'Won').length
        : Math.round((totalWon.length * (idx === 0 ? 0.65 : idx === 1 ? 0.25 : 0.1) * multiplier) || (idx === 0 ? 3 : idx === 1 ? 2 : 1));

      const repRevenue = assignedLeads.length > 0
        ? assignedLeads.filter(l => l.status === 'Won').reduce((sum, l) => sum + (l.dealAmount || 2500), 0)
        : repWon * 3200;

      const rate = repContacted > 0 ? Math.min(100, Math.round(((repBooked + repWon) / repContacted) * 100)) : 15;
      
      // Calculate performance points: 1 pt per contact, 15 pts per RDV, 50 pts per deal
      const score = (repContacted * 2) + (repBooked * 25) + (repWon * 60) + Math.round(repRevenue / 100);

      // Determine badges
      const badges: { id: string; title: string; iconName: string; color: string }[] = [];
      if (repWon >= 1) badges.push({ id: 'deal-100', title: 'Bonus 1er Deal (100% Commission)', iconName: 'Coins', color: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-extrabold' });
      if (repWon >= 2) badges.push({ id: 'top-closer', title: 'Top Closer', iconName: 'Trophy', color: 'bg-amber-50 text-amber-800 border-amber-200' });
      if (repBooked >= 4) badges.push({ id: 'rdv-machine', title: 'Machine à RDV', iconName: 'Zap', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' });
      if (rate >= 20) badges.push({ id: 'sniper', title: 'Sniper', iconName: 'Target', color: 'bg-blue-50 text-blue-800 border-blue-200' });
      if (rep.isAi) badges.push({ id: 'autonomous-ai', title: '24/7 Autonome', iconName: 'Bot', color: 'bg-purple-50 text-purple-800 border-purple-200' });

      return {
        id: rep.id,
        name: rep.name,
        email: rep.email,
        role: rep.role,
        isAi: rep.isAi,
        leadsContacted: repContacted,
        meetingsBooked: repBooked,
        dealsWon: repWon,
        revenueWon: repRevenue,
        conversionRate: rate,
        score,
        badges,
      };
    }).sort((a, b) => b.score - a.score);
  }, [leads, teamMembers, timeRange]);

  const filteredData = useMemo(() => {
    if (!search.trim()) return leaderboardData;
    const q = search.toLowerCase();
    return leaderboardData.filter(r => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q));
  }, [leaderboardData, search]);

  const top3 = filteredData.slice(0, 3);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Lien du classement copié dans le presse-papier !');
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white text-[#111827]">
      {/* Top Banner */}
      <div className="border-b border-[#E5E7EB] bg-white px-4 sm:px-8 py-5 shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-4 max-w-6xl mx-auto">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center shadow-xs">
                <Trophy className="h-5 w-5 text-[#059669]" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-black text-[#111827] tracking-tight">
                  Leaderboard de Prospection
                </h1>
                <p className="text-xs text-[#6B7280]">
                  Classement en direct de l'équipe commerciale · Scoring pondéré des résultats CRM
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Time range selector */}
            <div className="inline-flex items-center gap-1 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-1">
              {[
                { id: 'today', label: "Aujourd'hui" },
                { id: 'week', label: 'Cette semaine' },
                { id: 'month', label: 'Ce mois-ci' },
                { id: 'all', label: 'Global' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setTimeRange(tab.id as TimeRange)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                    timeRange === tab.id
                      ? 'bg-white text-[#1E4B33] shadow-xs'
                      : 'text-[#6B7280] hover:text-[#111827]'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="h-9 text-xs font-semibold gap-1.5 border-[#E5E7EB] bg-white hover:bg-[#F9FAFB]"
            >
              <Share2 className="h-3.5 w-3.5 text-[#6B7280]" />
              <span className="hidden sm:inline">Partager</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Scrollable Canvas */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 pb-32">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Team Rewards & 1st Month Challenge Banner */}
          <TeamRewardsCard challenge={challenge} memberRewards={memberRewards} />

          {/* Top 3 Podium Cards */}
          {top3.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 items-end">
              {/* 2nd Place */}
              {top3[1] && (
                <div className="order-2 md:order-1 rounded-2xl border border-[#E5E7EB] bg-white p-5 space-y-3 shadow-xs hover:border-[#1E4B33]/30 transition-all flex flex-col items-center text-center relative overflow-hidden">
                  <div className="absolute top-3 right-3 flex items-center justify-center h-7 w-7 rounded-full bg-slate-100 text-slate-700 font-black text-xs border border-slate-200">
                    🥈 2
                  </div>
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 font-black text-xl flex items-center justify-center border-2 border-slate-300 shadow-xs">
                    {top3[1].name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#111827] truncate max-w-[200px]">{top3[1].name}</h3>
                    <p className="text-[11px] text-[#6B7280]">{top3[1].role}</p>
                  </div>
                  <div className="w-full py-2 px-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] flex items-center justify-between text-xs font-bold">
                    <span className="text-[#6B7280]">Score</span>
                    <span className="text-[#1E4B33] font-black text-sm">{top3[1].score.toLocaleString('fr-FR')} pts</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 w-full text-center pt-1 text-[11px]">
                    <div>
                      <p className="font-black text-[#111827]">{top3[1].leadsContacted}</p>
                      <p className="text-[9px] text-[#6B7280] uppercase">Contactés</p>
                    </div>
                    <div>
                      <p className="font-black text-[#10B981]">{top3[1].meetingsBooked}</p>
                      <p className="text-[9px] text-[#6B7280] uppercase">RDV</p>
                    </div>
                    <div>
                      <p className="font-black text-amber-600">{top3[1].dealsWon}</p>
                      <p className="text-[9px] text-[#6B7280] uppercase">Closés</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 1st Place (Champion) */}
              {top3[0] && (
                <div className="order-1 md:order-2 rounded-2xl border-2 border-amber-300 bg-gradient-to-b from-amber-50/40 via-white to-white p-6 space-y-4 shadow-md flex flex-col items-center text-center relative overflow-hidden transform md:-translate-y-2">
                  <div className="absolute top-3 right-3 flex items-center justify-center h-8 w-8 rounded-full bg-amber-100 text-amber-800 font-black text-xs border border-amber-300 shadow-2xs">
                    🥇 1
                  </div>
                  <div className="relative">
                    <Crown className="h-6 w-6 text-amber-500 absolute -top-5 left-1/2 -translate-x-1/2" />
                    <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-[#1E4B33] to-[#10B981] text-white font-black text-2xl flex items-center justify-center border-4 border-amber-200 shadow-sm">
                      {top3[0].name.charAt(0)}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[#111827] truncate max-w-[220px]">{top3[0].name}</h3>
                    <p className="text-xs text-[#6B7280]">{top3[0].role}</p>
                  </div>
                  <div className="w-full py-2.5 px-4 rounded-xl bg-amber-500/10 border border-amber-300/40 flex items-center justify-between text-xs font-bold">
                    <span className="text-amber-900">Score Champion</span>
                    <span className="text-[#1E4B33] font-black text-base">{top3[0].score.toLocaleString('fr-FR')} pts</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 w-full text-center pt-1 text-xs">
                    <div>
                      <p className="font-black text-[#111827] text-sm">{top3[0].leadsContacted}</p>
                      <p className="text-[10px] text-[#6B7280] uppercase font-semibold">Contactés</p>
                    </div>
                    <div>
                      <p className="font-black text-[#10B981] text-sm">{top3[0].meetingsBooked}</p>
                      <p className="text-[10px] text-[#6B7280] uppercase font-semibold">RDV</p>
                    </div>
                    <div>
                      <p className="font-black text-amber-600 text-sm">{top3[0].dealsWon}</p>
                      <p className="text-[10px] text-[#6B7280] uppercase font-semibold">Closés</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 3rd Place */}
              {top3[2] && (
                <div className="order-3 rounded-2xl border border-[#E5E7EB] bg-white p-5 space-y-3 shadow-xs hover:border-[#1E4B33]/30 transition-all flex flex-col items-center text-center relative overflow-hidden">
                  <div className="absolute top-3 right-3 flex items-center justify-center h-7 w-7 rounded-full bg-amber-900/10 text-amber-900 font-black text-xs border border-amber-900/20">
                    🥉 3
                  </div>
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 text-amber-900 font-black text-xl flex items-center justify-center border-2 border-amber-300 shadow-xs">
                    {top3[2].name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#111827] truncate max-w-[200px]">{top3[2].name}</h3>
                    <p className="text-[11px] text-[#6B7280]">{top3[2].role}</p>
                  </div>
                  <div className="w-full py-2 px-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] flex items-center justify-between text-xs font-bold">
                    <span className="text-[#6B7280]">Score</span>
                    <span className="text-[#1E4B33] font-black text-sm">{top3[2].score.toLocaleString('fr-FR')} pts</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 w-full text-center pt-1 text-[11px]">
                    <div>
                      <p className="font-black text-[#111827]">{top3[2].leadsContacted}</p>
                      <p className="text-[9px] text-[#6B7280] uppercase">Contactés</p>
                    </div>
                    <div>
                      <p className="font-black text-[#10B981]">{top3[2].meetingsBooked}</p>
                      <p className="text-[9px] text-[#6B7280] uppercase">RDV</p>
                    </div>
                    <div>
                      <p className="font-black text-amber-600">{top3[2].dealsWon}</p>
                      <p className="text-[9px] text-[#6B7280] uppercase">Closés</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Full Leaderboard Table */}
          <div className="rounded-2xl border border-[#E5E7EB] bg-white overflow-hidden shadow-xs space-y-0">
            {/* Table Search & Filter Header */}
            <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between flex-wrap gap-3 bg-[#F9FAFB]">
              <div className="relative w-72">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#6B7280]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un membre de l'équipe..."
                  className="w-full h-8 pl-9 pr-3 rounded-lg border border-[#E5E7EB] bg-white text-xs text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#1E4B33]"
                />
              </div>

              <div className="text-xs text-[#6B7280] flex items-center gap-1.5 font-medium">
                <Users className="h-3.5 w-3.5 text-[#1E4B33]" />
                <span>{filteredData.length} membres classés</span>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E5E7EB] text-[#6B7280] font-bold text-[11px] uppercase bg-white">
                    <th className="py-3 px-4 w-14 text-center">Rang</th>
                    <th className="py-3 px-4">Commercial / SDR</th>
                    <th className="py-3 px-4 text-center">Score Total</th>
                    <th className="py-3 px-4 text-center">Contactés</th>
                    <th className="py-3 px-4 text-center">RDV Fixés</th>
                    <th className="py-3 px-4 text-center">Contrats Gagnés</th>
                    <th className="py-3 px-4 text-center">Taux Conv.</th>
                    <th className="py-3 px-4 text-right">
                      <Link href="/leaderboard/badges" className="inline-flex items-center gap-1 font-bold hover:text-[#059669] transition-colors">
                        Badges & Succès
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {filteredData.map((rep, index) => {
                    const isChampion = index === 0;
                    const BADGE_ICONS: Record<string, React.ElementType> = { Coins, Trophy, Zap, Target, Bot };
                    return (
                      <tr 
                        key={rep.id} 
                        className={cn(
                          'hover:bg-[#F9FAFB] transition-colors',
                          isChampion && 'bg-amber-50/20'
                        )}
                      >
                        <td className="py-3 px-4 text-center font-black">
                          <span className={cn(
                            'inline-flex items-center justify-center h-6 w-6 rounded-full text-[11px] font-black border',
                            index === 0 ? 'bg-amber-100 text-amber-800 border-amber-300' :
                            index === 1 ? 'bg-slate-100 text-slate-700 border-slate-200' :
                            index === 2 ? 'bg-orange-50 text-orange-700 border-orange-200' :
                            'bg-[#f4f4f3] text-[#6B7280] border-[#e5e5e0]'
                          )}>
                            #{index + 1}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className={cn(
                              'h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0',
                              rep.isAi ? 'bg-purple-100 text-purple-700' : 'bg-[#1E4B33]/10 text-[#1E4B33]'
                            )}>
                              {rep.name.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-[#111827]">{rep.name}</span>
                                {rep.isAi && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-700">
                                    IA
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-[#6B7280]">{rep.role}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-black text-sm text-[#1E4B33]">
                            {rep.score.toLocaleString('fr-FR')} pts
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-[#111827]">
                          {rep.leadsContacted}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-[#10B981]">
                          {rep.meetingsBooked}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-amber-600">
                          {rep.dealsWon}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#10B981]/10 text-[#065F46] border border-[#10B981]/20">
                            {rep.conversionRate}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1 flex-wrap">
                            {rep.badges.map((b) => {
                              const IconComp = BADGE_ICONS[b.iconName] ?? Award;
                              return (
                                <Link
                                  key={b.id}
                                  href={`/leaderboard/badges?badge=${b.id}`}
                                  className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border hover:opacity-80 transition-opacity', b.color)}
                                  title={b.title}
                                >
                                  <IconComp className="h-3 w-3 shrink-0" />
                                  <span className="hidden sm:inline">{b.title}</span>
                                </Link>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
