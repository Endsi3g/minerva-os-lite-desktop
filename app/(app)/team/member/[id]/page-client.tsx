'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Shield, Star, Eye, Check, Loader2, AlertCircle,
  Users, Search, BarChart3, Inbox, Megaphone, Mail, LineChart,
  Bot, Brain, Map, Wrench, Tag, BookOpen, ListChecks, ShieldCheck,
  CreditCard, Plug, Compass, CalendarDays, TrendingUp, Trophy,
  Target, Activity, CheckCircle2, Clock, Coins, Zap, MapPin, Award,
} from 'lucide-react';
import { getApiUrl } from '@/lib/api-helper';
import { DEFAULT_ROLE_PERMISSIONS, PERMISSION_MODULES, type PermissionModule } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { format, parseISO, eachDayOfInterval, subDays } from 'date-fns';
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

type ProfileTab = 'overview' | 'stats' | 'tasks' | 'access';

const DEFAULT_ROLE_CONFIG = [
  { key: 'admin',  label: 'Administrateur', icon: Shield, color: '#059669', desc: 'Accès complet sauf facturation et configuration avancée.' },
  { key: 'editor', label: 'Éditeur',        icon: Star,   color: '#059669', desc: 'Leads, pipeline, campagnes, IA et carte terrain.' },
  { key: 'viewer', label: 'Observateur',    icon: Eye,    color: '#6366f1', desc: 'Lecture seule — leads, pipeline et carte.' },
] as const;

const MODULE_ICONS: Record<PermissionModule, React.ComponentType<{ className?: string }>> = {
  leads: Users, prospecting: Search, pipeline: BarChart3, inbox: Inbox,
  campaigns: Megaphone, sequences: Mail, analytics: LineChart, team: Users,
  settings: Wrench, agents: Bot, assistant: Brain, map: Map, billing: CreditCard,
  integrations: Plug, services: Tag, library: BookOpen, roadmap: Compass,
  tasks: ListChecks, audit: ShieldCheck,
};

const CATEGORY_COLORS: Record<string, string> = {
  'Follow-up': '#3b82f6',
  'Preparation': '#f59e0b',
  'Meeting': '#059669',
  'General': '#8b8b85',
};

interface MemberTask {
  id: string;
  title: string;
  completed: boolean;
  category: string;
  due_date: string | null;
  created_at: string;
}

interface DailyCount {
  day: string;
  date: string;
  leads: number;
  tasks: number;
}

export default function MemberProfilePage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.id as string;

  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');

  // Role management
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [selectedRole, setSelectedRole] = useState('editor');

  // Real stats from DB
  const [memberTasks, setMemberTasks] = useState<MemberTask[]>([]);
  const [memberLeadCount, setMemberLeadCount] = useState<number>(0);
  const [dailyActivity, setDailyActivity] = useState<DailyCount[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [memberCrmStats, setMemberCrmStats] = useState({ booked: 0, won: 0, revenue: 0, rate: 0 });

  const fetchMember = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/team/members'));
      const data = await res.json();
      const found = (data.members || []).find((m: Member) => m.id === memberId);
      if (!found) { setError('Membre introuvable.'); setLoading(false); return; }
      setMember(found);
      setSelectedRole(found.role || 'editor');
    } catch { setError('Erreur de chargement.'); }
    finally { setLoading(false); }
  }, [memberId]);

  const fetchMemberStats = useCallback(async (m: Member) => {
    if (!m.member_user_id) return;
    setLoadingStats(true);
    try {
      const supabase = createClient();
      const userId = m.member_user_id;

      const [
        { data: tasks },
        { data: allLeads },
        { data: recentLeads },
        { data: recentTasks },
      ] = await Promise.all([
        // All tasks assigned to this member
        supabase.from('tasks')
          .select('id, title, completed, category, due_date, created_at')
          .eq('assigned_to', userId)
          .order('created_at', { ascending: false })
          .limit(100),

        // All leads owned by this member (with status for CRM metrics)
        supabase.from('leads')
          .select('id, status, revenue, created_at')
          .eq('user_id', userId),

        // Leads created in last 14 days for activity chart
        supabase.from('leads')
          .select('created_at')
          .eq('user_id', userId)
          .gte('created_at', subDays(new Date(), 14).toISOString()),

        // Tasks created in last 14 days for activity chart
        supabase.from('tasks')
          .select('created_at')
          .eq('assigned_to', userId)
          .gte('created_at', subDays(new Date(), 14).toISOString()),
      ]);

      setMemberTasks(tasks ?? []);
      const leads = allLeads ?? [];
      setMemberLeadCount(leads.length);

      // Compute CRM stats
      const booked = leads.filter((l: { status: string }) => ['Call Booked', 'Meeting Booked', 'Demo', 'Proposal'].includes(l.status)).length;
      const won = leads.filter((l: { status: string }) => l.status === 'Won').length;
      const revenue = leads.filter((l: { status: string }) => l.status === 'Won').reduce((sum: number, l: { revenue: number | null }) => sum + (Number(l.revenue) || 0), 0);
      const contacted = leads.filter((l: { status: string }) => l.status !== 'New').length;
      const rate = contacted > 0 ? Math.round(((booked + won) / contacted) * 100) : 0;
      setMemberCrmStats({ booked, won, revenue, rate });

      // Build 14-day activity from real data
      const days = eachDayOfInterval({ start: subDays(new Date(), 13), end: new Date() });
      const activity: DailyCount[] = days.map(d => {
        const dayStr = format(d, 'yyyy-MM-dd');
        const leads = (recentLeads ?? []).filter((l: { created_at: string | null }) =>
          l.created_at?.startsWith(dayStr)
        ).length;
        const tasksForDay = (recentTasks ?? []).filter((t: { created_at: string | null }) =>
          t.created_at?.startsWith(dayStr)
        ).length;
        return {
          day: format(d, 'EEE', { locale: fr }),
          date: dayStr,
          leads,
          tasks: tasksForDay,
        };
      });
      setDailyActivity(activity);
    } catch (e) {
      console.error('fetchMemberStats error:', e);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => { fetchMember(); }, [fetchMember]);
  useEffect(() => { if (member) fetchMemberStats(member); }, [member, fetchMemberStats]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(getApiUrl('/api/team/members'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, role: selectedRole }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        const d = await res.json();
        setError(d.error || 'Erreur lors de la sauvegarde.');
      }
    } catch { setError('Erreur réseau.'); }
    finally { setSaving(false); }
  };

  const effectivePerms = DEFAULT_ROLE_PERMISSIONS[selectedRole] ?? [];
  const displayName = member?.profile?.full_name || member?.email?.split('@')[0] || 'Membre';
  const avatar = member?.profile?.avatar_base64;
  const activeRoleConfig = DEFAULT_ROLE_CONFIG.find(r => r.key === selectedRole);
  const joinedAt = member?.joined_at || member?.invited_at;
  const joinedLabel = joinedAt ? format(parseISO(joinedAt), 'd MMMM yyyy', { locale: fr }) : null;

  const completedTasks = memberTasks.filter(t => t.completed);
  const pendingTasks = memberTasks.filter(t => !t.completed);
  const completionRate = memberTasks.length > 0
    ? Math.round((completedTasks.length / memberTasks.length) * 100)
    : 0;

  const tasksByCategory = memberTasks.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const categoryPieData = Object.entries(tasksByCategory).map(([name, value]) => ({
    name, value: value as number, color: CATEGORY_COLORS[name] ?? '#8b8b85',
  }));

  const tabs: { id: ProfileTab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Aperçu',       icon: Users },
    { id: 'stats',    label: 'Statistiques', icon: TrendingUp },
    { id: 'tasks',    label: 'Tâches',       icon: ListChecks },
    { id: 'access',   label: 'Accès',        icon: Shield },
  ];

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#fafaf8]">
        <Loader2 className="h-6 w-6 animate-spin text-[#7a7a76]" />
      </div>
    );
  }

  if (error && !member) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-[#fafaf8] px-6 text-center">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="text-sm font-bold text-[#26251e]">{error}</p>
        <button onClick={() => router.back()} className="text-xs font-black text-[#059669] hover:underline">
          ← Retour
        </button>
      </div>
    );
  }

  const totalActivity = dailyActivity.reduce((s, d) => s + d.leads + d.tasks, 0);

  return (
    <div className="relative min-h-full bg-[#fafaf8] text-[#26251e] font-sans overflow-x-hidden selection:bg-[#059669]/10">
      {/* Background orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-[#059669]/6 blur-[120px]" />
        <div className="absolute top-1/2 -left-24 w-[360px] h-[360px] rounded-full bg-[#059669]/4 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #26251e 1px, transparent 1px), linear-gradient(to bottom, #26251e 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <div className="relative z-10">
        {/* ── HERO ── */}
        <div className="relative overflow-hidden">
          <div className="h-36 sm:h-44 bg-gradient-to-br from-[#059669]/10 via-[#fafaf8] to-[#059669]/4 border-b border-[#e5e5e0]" />

          <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8">
            <div className="absolute top-4 left-4 sm:left-6 md:left-8">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#e5e5e0] bg-white/80 backdrop-blur-md hover:bg-white hover:shadow-xs transition-all text-xs font-black text-[#26251e]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Retour
              </button>
            </div>

            <div className="flex flex-col items-center -mt-16 sm:-mt-20 pb-4">
              <div className="relative">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-[#e5e5e2] flex items-center justify-center transition-transform duration-300 hover:scale-[1.02]">
                  {avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatar} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl sm:text-5xl font-black text-[#807d72]">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className={cn(
                  'absolute bottom-2 right-2 w-5 h-5 rounded-full border-4 border-white shadow-sm',
                  member?.status === 'active' ? 'bg-[#059669]' : 'bg-[#d4d4cd]'
                )} />
              </div>

              <div className="text-center mt-4 space-y-1.5">
                <h1 className="text-xl sm:text-2xl font-black text-[#26251e] tracking-tight">{displayName}</h1>
                <p className="text-xs font-semibold text-[#7a7a76]">{member?.email}</p>
                <div className="flex items-center justify-center gap-2 flex-wrap mt-2.5">
                  {member?.isOwner && (
                    <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border bg-[#059669]/8 text-[#059669] border-[#059669]/15">
                      Propriétaire
                    </span>
                  )}
                  <span className={cn(
                    'text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border',
                    member?.status === 'active'
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                      : 'bg-stone-50 text-stone-500 border-stone-200'
                  )}>
                    {member?.status === 'active' ? 'Actif' : 'En attente'}
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-stone-100 border border-stone-200 text-stone-600">
                    {DEFAULT_ROLE_CONFIG.find(r => r.key === member?.role)?.label ?? member?.role ?? 'Éditeur'}
                  </span>
                </div>
                {joinedLabel && (
                  <p className="text-xs font-semibold text-[#7a7a76] flex items-center justify-center gap-1.5 mt-2">
                    <CalendarDays className="h-3.5 w-3.5 text-[#059669]" />
                    A rejoint le {joinedLabel}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="border-b border-[#e5e5e0] bg-white/80 backdrop-blur-md sticky top-0 z-20 shadow-xs">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8">
            <div className="flex gap-2">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-4 text-xs font-black whitespace-nowrap border-b-2 transition-all duration-200',
                      isActive
                        ? 'border-[#059669] text-[#059669]'
                        : 'border-transparent text-[#7a7a76] hover:text-[#26251e]'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2.5 p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-bold shadow-xs">
              <AlertCircle className="h-4.5 w-4.5 shrink-0" />
              {error}
            </div>
          )}

          {/* ── OVERVIEW TAB ── */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* ── CRM KPI Cards ── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Leads',        value: memberLeadCount,           icon: Target,       color: '#059669' },
                  { label: 'RDV Fixés',    value: memberCrmStats.booked,     icon: CalendarDays, color: '#3b82f6' },
                  { label: 'Deals Gagnés', value: memberCrmStats.won,        icon: Trophy,       color: '#d97706' },
                  { label: 'Revenus',      value: memberCrmStats.revenue > 0 ? `${memberCrmStats.revenue.toLocaleString('fr-FR')} \$` : '—', icon: TrendingUp, color: '#059669' },
                  { label: 'Taux Conv.',   value: memberCrmStats.rate > 0 ? `${memberCrmStats.rate}%` : '—', icon: CheckCircle2, color: memberCrmStats.rate >= 20 ? '#059669' : '#d97706' },
                  { label: 'Tâches',       value: memberTasks.length,        icon: ListChecks,   color: '#26251e' },
                  { label: 'Complétées',   value: completedTasks.length,     icon: CheckCircle2, color: '#059669' },
                  { label: 'Complétion',   value: memberTasks.length > 0 ? `${completionRate}%` : '—', icon: Activity, color: completionRate >= 70 ? '#059669' : '#d97706' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="relative group overflow-hidden rounded-2xl border border-[#e5e5e0] bg-white p-4 flex flex-col gap-2 transition-all duration-300 hover:shadow-md hover:border-[#059669]/20 hover:-translate-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[9px] font-black uppercase tracking-wider text-[#7a7a76]">{label}</p>
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}12` }}>
                        <Icon className="h-3.5 w-3.5" style={{ color }} />
                      </div>
                    </div>
                    <p className="text-xl font-black leading-none" style={{ color }}>{loadingStats ? '…' : value}</p>
                  </div>
                ))}
              </div>

              {/* ── Badges & Succès ── */}
              {!loadingStats && (
                <div className="rounded-2xl border border-[#e5e5e0] bg-white p-5 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="flex items-center justify-between mb-4 border-b border-[#f4f4f3] pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-amber-50 border border-amber-200/60 flex items-center justify-center">
                        <Award className="h-3.5 w-3.5 text-amber-600" />
                      </div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-[#26251e]">Badges & Succès</h3>
                    </div>
                    <Link href="/leaderboard/badges" className="text-[10px] font-black text-[#059669] hover:underline">
                      Voir tout →
                    </Link>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {memberCrmStats.won >= 1 && (
                      <Link href="/leaderboard/badges?badge=deal-100" className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black hover:opacity-80 transition-opacity">
                        <Coins className="h-3 w-3 text-amber-600" /> Bonus 1er Deal
                      </Link>
                    )}
                    {memberCrmStats.won >= 2 && (
                      <Link href="/leaderboard/badges?badge=top-closer" className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-black hover:opacity-80 transition-opacity">
                        <Trophy className="h-3 w-3 text-amber-600" /> Top Closer
                      </Link>
                    )}
                    {memberCrmStats.booked >= 4 && (
                      <Link href="/leaderboard/badges?badge=rdv-machine" className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black hover:opacity-80 transition-opacity">
                        <Zap className="h-3 w-3 text-[#059669]" /> Machine à RDV
                      </Link>
                    )}
                    {memberCrmStats.rate >= 20 && (
                      <Link href="/leaderboard/badges?badge=sniper" className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-black hover:opacity-80 transition-opacity">
                        <Target className="h-3 w-3 text-blue-600" /> Sniper
                      </Link>
                    )}
                    {memberLeadCount >= 3 && (
                      <Link href="/leaderboard/badges?badge=field-explorer" className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-orange-50 text-orange-800 border border-orange-200 text-[10px] font-black hover:opacity-80 transition-opacity">
                        <MapPin className="h-3 w-3 text-orange-600" /> Explorateur Terrain
                      </Link>
                    )}
                    {memberCrmStats.won === 0 && memberCrmStats.booked === 0 && memberCrmStats.rate === 0 && memberLeadCount < 3 && (
                      <p className="text-xs text-[#7a7a76] font-semibold py-1">Aucun badge débloqué encore — continue à prospecter !</p>
                    )}
                  </div>
                </div>
              )}

              {/* 14-day activity from real data */}
              <div className="rounded-2xl border border-[#e5e5e0] bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between mb-5 border-b border-[#f4f4f3] pb-3">
                  <div>
                    <h3 className="text-sm font-black text-[#26251e]">Activité — 14 derniers jours</h3>
                    <p className="text-[10px] text-[#7a7a76] mt-0.5 font-semibold">{totalActivity} actions enregistrées</p>
                  </div>
                  <div className="h-7 w-7 rounded-lg bg-[#059669]/8 flex items-center justify-center text-[#059669]">
                    <Activity className="h-4 w-4" />
                  </div>
                </div>
                {loadingStats ? (
                  <div className="h-28 rounded-xl bg-[#f4f4f3] animate-pulse" />
                ) : dailyActivity.every(d => d.leads === 0 && d.tasks === 0) ? (
                  <div className="h-28 flex items-center justify-center text-xs text-[#7a7a76] font-semibold">
                    Aucune activité sur les 14 derniers jours
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={140}>
                      <AreaChart data={dailyActivity} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="leadsGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#059669" stopOpacity={0.2} />
                            <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0ec" />
                        <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#7a7a76', fontWeight: 600 }} />
                        <YAxis tick={{ fontSize: 9, fill: '#7a7a76', fontWeight: 600 }} allowDecimals={false} />
                        <ReTooltip
                          contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e5e0', background: '#fff' }}
                          labelStyle={{ fontWeight: 700 }}
                        />
                        <Area type="monotone" dataKey="leads" stroke="#059669" strokeWidth={2} fill="url(#leadsGrad)" dot={false} name="Leads" />
                        <Area type="monotone" dataKey="tasks" stroke="#3b82f6" strokeWidth={2} fill="transparent" dot={false} strokeDasharray="4 2" name="Tâches" />
                      </AreaChart>
                    </ResponsiveContainer>
                    <div className="flex items-center gap-4 mt-3 justify-center">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#7a7a76]">
                        <div className="w-3 h-0.5 bg-[#059669] rounded" />
                        Leads créés
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#7a7a76]">
                        <div className="w-3 border-t-2 border-dashed border-[#3b82f6]" />
                        Tâches assignées
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Pending tasks preview */}
              {pendingTasks.length > 0 && (
                <div className="rounded-2xl border border-[#e5e5e0] bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#f4f4f3] pb-2.5">
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#7a7a76]">Tâches en cours</h3>
                    <button onClick={() => setActiveTab('tasks')} className="text-[10px] font-black uppercase tracking-wider text-[#059669] hover:underline decoration-wavy">
                      Voir tout →
                    </button>
                  </div>
                  <div className="space-y-3">
                    {pendingTasks.slice(0, 4).map(t => (
                      <div key={t.id} className="flex items-center gap-3 py-1 hover:translate-x-0.5 transition-transform duration-200">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: CATEGORY_COLORS[t.category] ?? '#8b8b85' }} />
                        <p className="text-xs font-semibold text-[#26251e] flex-1 truncate">{t.title}</p>
                        {t.due_date && (
                          <span className="text-[10px] text-amber-600 shrink-0 flex items-center gap-1 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-100/30">
                            <Clock className="h-3 w-3" />
                            {t.due_date}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!loadingStats && member?.member_user_id && memberTasks.length === 0 && memberLeadCount === 0 && (
                <div className="rounded-2xl border border-[#e5e5e0] bg-white p-8 text-center space-y-3 shadow-xs">
                  <Users className="h-10 w-10 text-[#d4d4cd] mx-auto animate-pulse" />
                  <p className="text-sm font-black text-[#7a7a76]">Aucune activité enregistrée</p>
                  <p className="text-xs text-[#b0b0a8] font-semibold">Ce membre n&apos;a pas encore de leads ni de tâches assignées.</p>
                </div>
              )}

              {!member?.member_user_id && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 text-center space-y-1.5 shadow-xs">
                  <p className="text-xs font-black text-amber-700 uppercase tracking-wider">Invitation en attente</p>
                  <p className="text-xs text-amber-600 font-semibold">Ce membre n&apos;a pas encore accepté son invitation — aucune activité disponible.</p>
                </div>
              )}
            </div>
          )}

          {/* ── STATS TAB ── */}
          {activeTab === 'stats' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {loadingStats ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <div key={i} className="h-40 rounded-2xl bg-[#f4f4f3] animate-pulse" />)}
                </div>
              ) : (
                <>
                  {/* Daily bar chart — real data */}
                  <div className="rounded-2xl border border-[#e5e5e0] bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="flex items-center justify-between mb-5 border-b border-[#f4f4f3] pb-3">
                      <div>
                        <h3 className="text-sm font-black text-[#26251e]">Activité journalière</h3>
                        <p className="text-[10px] text-[#7a7a76] mt-0.5 font-semibold">14 derniers jours — leads + tâches</p>
                      </div>
                      <div className="h-7 w-7 rounded-lg bg-[#059669]/8 flex items-center justify-center text-[#059669]">
                        <BarChart3 className="h-4 w-4" />
                      </div>
                    </div>
                    {totalActivity === 0 ? (
                      <div className="h-32 flex items-center justify-center text-xs text-[#7a7a76] font-semibold">
                        Aucune donnée d&apos;activité disponible
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={dailyActivity} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barSize={16} barGap={2}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0ec" vertical={false} />
                          <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#7a7a76', fontWeight: 600 }} />
                          <YAxis tick={{ fontSize: 9, fill: '#7a7a76', fontWeight: 600 }} allowDecimals={false} />
                          <ReTooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e5e0', background: '#fff' }} />
                          <Bar dataKey="leads" name="Leads" fill="#059669" radius={[3, 3, 0, 0]} opacity={0.85} />
                          <Bar dataKey="tasks" name="Tâches" fill="#3b82f6" radius={[3, 3, 0, 0]} opacity={0.7} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  {/* Task category donut + completion rate */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-[#e5e5e0] bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
                      <div className="flex items-center justify-between mb-4 border-b border-[#f4f4f3] pb-2.5">
                        <h3 className="text-xs font-black uppercase tracking-wider text-[#7a7a76]">Types de tâches</h3>
                        <div className="h-6 w-6 rounded-lg bg-[#059669]/8 flex items-center justify-center text-[#059669]">
                          <ListChecks className="h-3.5 w-3.5" />
                        </div>
                      </div>
                      {categoryPieData.length > 0 ? (
                        <>
                          <ResponsiveContainer width="100%" height={110}>
                            <PieChart>
                              <Pie
                                data={categoryPieData}
                                cx="50%" cy="50%"
                                innerRadius={28} outerRadius={46}
                                dataKey="value" stroke="none"
                              >
                                {categoryPieData.map((entry, i) => (
                                  <Cell key={i} fill={entry.color} />
                                ))}
                              </Pie>
                              <ReTooltip contentStyle={{ fontSize: 10, borderRadius: 8 }} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center mt-3">
                            {categoryPieData.map(d => (
                              <div key={d.name} className="flex items-center gap-1.5 text-[10px] text-[#7a7a76] font-semibold">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                                {d.name} ({d.value})
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="h-28 flex items-center justify-center text-xs text-[#7a7a76] font-semibold">
                          Aucune tâche assignée
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-[#e5e5e0] bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
                      <div className="flex items-center justify-between mb-4 border-b border-[#f4f4f3] pb-2.5">
                        <h3 className="text-xs font-black uppercase tracking-wider text-[#7a7a76]">Taux de complétion</h3>
                        <div className="h-6 w-6 rounded-lg bg-[#059669]/8 flex items-center justify-center text-[#059669]">
                          <Trophy className="h-3.5 w-3.5" />
                        </div>
                      </div>
                      {memberTasks.length === 0 ? (
                        <div className="h-28 flex items-center justify-center text-xs text-[#7a7a76] font-semibold">
                          Aucune tâche
                        </div>
                      ) : (
                        <div className="flex items-center gap-5 mt-2">
                          <ResponsiveContainer width={100} height={100}>
                            <RadialBarChart
                              cx="50%" cy="50%"
                              innerRadius="60%" outerRadius="90%"
                              startAngle={90} endAngle={90 - 360 * (completionRate / 100)}
                              data={[{ value: completionRate }]}
                            >
                              <RadialBar dataKey="value" fill="#059669" cornerRadius={6} background={{ fill: '#f0f0ec' }} />
                            </RadialBarChart>
                          </ResponsiveContainer>
                          <div className="space-y-1.5">
                            <p className="text-3xl font-black text-[#059669] leading-none">{completionRate}%</p>
                            <p className="text-xs font-semibold text-stone-600">{completedTasks.length} complétées</p>
                            <p className="text-xs font-semibold text-[#7a7a76]">{pendingTasks.length} en attente</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Leads total */}
                  <div className="rounded-2xl border border-[#e5e5e0] bg-white p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="w-12 h-12 rounded-xl bg-[#059669]/8 flex items-center justify-center shrink-0 text-[#059669] transition-transform duration-300 hover:scale-105">
                      <Target className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-2xl font-black text-[#26251e] leading-tight">{memberLeadCount}</p>
                      <p className="text-xs font-black text-[#7a7a76] uppercase tracking-wider mt-0.5">Leads dans le portefeuille</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── TASKS TAB ── */}
          {activeTab === 'tasks' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {loadingStats ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <div key={i} className="h-12 rounded-2xl bg-[#f4f4f3] animate-pulse" />)}
                </div>
              ) : memberTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <ListChecks className="h-12 w-12 text-[#d4d4cd] animate-bounce duration-1000" />
                  <p className="text-sm font-black text-[#7a7a76]">Aucune tâche assignée à ce membre</p>
                  <p className="text-xs text-[#b0b0a8] font-semibold">Créez une tâche et assignez-la depuis la page Tâches</p>
                  <Link href="/tasks" className="text-xs font-black text-[#059669] hover:underline decoration-wavy mt-2">
                    Aller aux tâches →
                  </Link>
                </div>
              ) : (
                <>
                  {pendingTasks.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-wider text-[#7a7a76] px-1.5">
                        En cours ({pendingTasks.length})
                      </p>
                      <div className="rounded-2xl border border-[#e5e5e0] bg-white divide-y divide-[#f4f4f3] overflow-hidden shadow-xs">
                        {pendingTasks.map(t => (
                          <div key={t.id} className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-[#fafaf8]/50">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: CATEGORY_COLORS[t.category] ?? '#8b8b85' }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-black text-[#26251e] truncate">{t.title}</p>
                              {t.due_date && (
                                <p className="text-[10px] text-amber-600 flex items-center gap-1 mt-1 font-semibold">
                                  <Clock className="h-3 w-3" />
                                  {t.due_date}
                                </p>
                              )}
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100/30 shrink-0">
                              {t.category}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {completedTasks.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-wider text-[#7a7a76] px-1.5">
                        Complétées ({completedTasks.length})
                      </p>
                      <div className="rounded-2xl border border-[#e5e5e0] bg-white divide-y divide-[#f4f4f3] overflow-hidden shadow-xs">
                        {completedTasks.map(t => (
                          <div key={t.id} className="flex items-center gap-3.5 px-5 py-4 opacity-60 hover:opacity-80 transition-opacity">
                            <CheckCircle2 className="h-4.5 w-4.5 text-[#059669] shrink-0" />
                            <p className="text-xs font-semibold text-stone-600 truncate line-through">{t.title}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── ACCESS TAB ── */}
          {activeTab === 'access' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="text-[10px] font-black uppercase tracking-wider text-[#7a7a76] px-1.5">Niveau d&apos;accès</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {DEFAULT_ROLE_CONFIG.map(roleConfig => {
                  const Icon = roleConfig.icon;
                  const isSelected = selectedRole === roleConfig.key;
                  return (
                    <button
                      key={roleConfig.key}
                      onClick={() => setSelectedRole(roleConfig.key)}
                      className={cn(
                        'group text-left p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between space-y-4 bg-white hover:shadow-md',
                        isSelected ? 'border-transparent ring-2 shadow-md' : 'border-[#e5e5e0] hover:border-[#059669]/30'
                      )}
                      style={isSelected ? { background: `${roleConfig.color}06`, boxShadow: `0 0 0 2px ${roleConfig.color}` } : undefined}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105" style={{ background: `${roleConfig.color}12`, color: roleConfig.color }}>
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: roleConfig.color }}>
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-black text-[#26251e]">{roleConfig.label}</p>
                        <p className="text-[10px] text-[#7a7a76] leading-relaxed font-semibold">{roleConfig.desc}</p>
                      </div>
                      <p className="text-[9px] font-black text-[#b0b0a8] uppercase tracking-wider border-t border-[#f4f4f3] pt-2 w-full">
                        {DEFAULT_ROLE_PERMISSIONS[roleConfig.key]?.length ?? 0} modules accessibles
                      </p>
                    </button>
                  );
                })}
              </div>

              {effectivePerms.length > 0 && (
                <div className="border border-[#e5e5e0] rounded-2xl p-6 bg-white space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-[#f4f4f3] pb-2.5">
                    <div className="text-[10px] font-black uppercase tracking-wider text-[#7a7a76]">Accès accordés</div>
                    <span
                      className="text-[9px] font-black px-2.5 py-0.5 rounded-full"
                      style={activeRoleConfig ? { background: `${activeRoleConfig.color}15`, color: activeRoleConfig.color } : undefined}
                    >
                      {effectivePerms.length} modules
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                    {effectivePerms.map(m => {
                      const Icon = MODULE_ICONS[m] ?? Check;
                      return (
                        <div key={m} className="flex items-center gap-2.5 text-[11px] font-bold text-[#26251e] py-1">
                          <div className="w-6 h-6 rounded-lg bg-stone-50 border border-stone-200/80 flex items-center justify-center shrink-0">
                            <Icon className="h-3.5 w-3.5 text-stone-500" />
                          </div>
                          {PERMISSION_MODULES[m]?.label ?? m}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex gap-4 pt-2">
                <button
                  onClick={() => router.back()}
                  className="flex-1 py-3 text-xs font-black uppercase tracking-wider border border-[#e5e5e0] bg-white text-stone-600 rounded-xl hover:bg-[#f4f4f3] hover:shadow-xs transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || saved || member?.isOwner}
                  className="flex-1 py-3 text-xs font-black uppercase tracking-wider text-white rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-60 bg-[#059669] hover:bg-[#047857] hover:shadow-xs active:translate-y-0"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
                  {member?.isOwner ? 'Propriétaire (non modifiable)' : saved ? 'Enregistré ✓' : 'Enregistrer le rôle'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
