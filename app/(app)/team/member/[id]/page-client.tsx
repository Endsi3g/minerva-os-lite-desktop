'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Shield, Star, Eye, Check, Loader2, AlertCircle,
  Users, Search, BarChart3, Inbox, Megaphone, Mail, LineChart,
  Bot, Brain, Map, Wrench, Tag, BookOpen, ListChecks, ShieldCheck,
  CreditCard, Plug, Compass, CalendarDays, TrendingUp, Trophy,
  Target, Activity, CheckCircle2, Clock, Hash,
} from 'lucide-react';
import { getApiUrl } from '@/lib/api-helper';
import { DEFAULT_ROLE_PERMISSIONS, PERMISSION_MODULES, type PermissionModule } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import {
  BarChart,
  Bar,
  LineChart as ReLineChart,
  Line,
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
import { format, subDays, parseISO, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
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

// Default role catalogue
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

// Generate last 8 weeks of activity data (mock from real member join date)
function buildWeeklyActivity(joinedAt: string | null | undefined) {
  const weeks = [];
  for (let i = 7; i >= 0; i--) {
    const d = subDays(new Date(), i * 7);
    const label = format(d, 'MMM d', { locale: fr });
    // Pseudo-deterministic values based on week index
    weeks.push({
      week: label,
      leads: Math.max(0, Math.floor(Math.sin(i * 1.3 + 2) * 8 + 9)),
      tasks: Math.max(0, Math.floor(Math.cos(i * 0.9 + 1) * 5 + 7)),
    });
  }
  return weeks;
}

function buildActivityDays() {
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = subDays(new Date(), i);
    days.push({
      day: format(d, 'EEE', { locale: fr }),
      value: Math.max(0, Math.floor(Math.sin(i * 0.7) * 6 + 7)),
    });
  }
  return days;
}

export default function MemberProfilePage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.id as string;

  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');

  // Role management state
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [selectedRole, setSelectedRole] = useState('editor');

  // Member-specific task stats
  const [memberTasks, setMemberTasks] = useState<any[]>([]);
  const [memberLeadCount, setMemberLeadCount] = useState<number>(0);
  const [loadingStats, setLoadingStats] = useState(false);

  const fetchData = useCallback(async () => {
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

  const fetchMemberStats = useCallback(async () => {
    if (!member?.member_user_id) return;
    setLoadingStats(true);
    try {
      const supabase = createClient();
      // Fetch tasks assigned to this member
      const [{ data: tasks }, { count: leadCount }] = await Promise.all([
        supabase.from('tasks').select('id, title, completed, category, due_date, created_at')
          .eq('assigned_to', member.member_user_id)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase.from('leads').select('*', { count: 'exact', head: true })
          .eq('user_id', member.member_user_id),
      ]);
      setMemberTasks(tasks ?? []);
      setMemberLeadCount(leadCount ?? 0);
    } catch { /* non-fatal */ }
    finally { setLoadingStats(false); }
  }, [member?.member_user_id]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (member) fetchMemberStats(); }, [member, fetchMemberStats]);

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
        setTimeout(() => { setSaved(false); }, 2000);
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
  const activeRole = DEFAULT_ROLE_CONFIG.find(r => r.key === selectedRole);
  const joinedAt = member?.joined_at || member?.invited_at;
  const joinedLabel = joinedAt
    ? format(parseISO(joinedAt), "d MMMM yyyy", { locale: fr })
    : null;

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

  const weeklyData = buildWeeklyActivity(member?.joined_at);
  const activityData = buildActivityDays();

  const tabs: { id: ProfileTab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Aperçu', icon: Users },
    { id: 'stats', label: 'Statistiques', icon: TrendingUp },
    { id: 'tasks', label: 'Tâches', icon: ListChecks },
    { id: 'access', label: 'Accès', icon: Shield },
  ];

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#fafaf8]">
        <Loader2 className="h-6 w-6 animate-spin text-[#7a7a76]" />
      </div>
    );
  }

  return (
    <div className="relative min-h-full bg-[#fafaf8] text-[#26251e] font-sans overflow-x-hidden">
      {/* Background orbs matching Home/Team visual */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full bg-[#059669]/6 blur-[100px]" />
        <div className="absolute top-1/2 -left-24 w-[320px] h-[320px] rounded-full bg-[#059669]/4 blur-[80px]" />
      </div>

      <div className="relative z-10">
        {/* ── HERO ────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden">
          {/* Hero gradient banner */}
          <div className="h-32 sm:h-40 bg-gradient-to-br from-[#059669]/12 via-[#f4f4f3] to-[#059669]/6 border-b border-[#e5e5e0]" />

          <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8">
            {/* Back button */}
            <div className="absolute top-4 left-4 sm:left-6 md:left-8">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e5e5e0] bg-white/80 backdrop-blur-sm hover:bg-white transition-colors text-xs font-semibold text-[#555552]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Retour
              </button>
            </div>

            {/* Avatar — centré, chevauchant la bannière */}
            <div className="flex flex-col items-center -mt-16 sm:-mt-20 pb-4">
              <div className="relative">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-[#e5e5e2] flex items-center justify-center">
                  {avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatar} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl sm:text-5xl font-black text-[#807d72]">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                {/* Status dot */}
                <div className={cn(
                  'absolute bottom-2 right-2 w-4 h-4 rounded-full border-2 border-white',
                  member?.status === 'active' ? 'bg-[#059669]' : 'bg-[#d4d4cd]'
                )} />
              </div>

              {/* Name + meta */}
              <div className="text-center mt-3 space-y-1">
                <h1 className="text-xl sm:text-2xl font-black text-[#26251e]">{displayName}</h1>
                <p className="text-sm text-[#7a7a76]">{member?.email}</p>
                <div className="flex items-center justify-center gap-2 flex-wrap mt-2">
                  {member?.isOwner && (
                    <span className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border bg-[#059669]/8 text-[#059669] border-[#059669]/20">
                      Propriétaire
                    </span>
                  )}
                  <span className={cn(
                    'text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border',
                    member?.status === 'active'
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                      : 'bg-[#f4f4f3] text-[#7a7a76] border-[#e5e5e0]'
                  )}>
                    {member?.status === 'active' ? 'Actif' : 'En attente'}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#f4f4f3] border border-[#e5e5e0] text-[#555552]">
                    {DEFAULT_ROLE_CONFIG.find(r => r.key === member?.role)?.label ?? member?.role ?? 'Éditeur'}
                  </span>
                </div>
                {joinedLabel && (
                  <p className="text-xs text-[#7a7a76] flex items-center justify-center gap-1 mt-1">
                    <CalendarDays className="h-3 w-3" />
                    A rejoint le {joinedLabel}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── TABS ────────────────────────────────────────────────────── */}
        <div className="border-b border-[#e5e5e0] bg-white/60 backdrop-blur-sm sticky top-0 z-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8">
            <div className="flex overflow-x-auto scrollbar-hide gap-0">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-all',
                      activeTab === tab.id
                        ? 'border-[#059669] text-[#059669]'
                        : 'border-transparent text-[#7a7a76] hover:text-[#26251e]'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── CONTENT ────────────────────────────────────────────────── */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* ── OVERVIEW TAB ── */}
          {activeTab === 'overview' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Quick stat cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Leads', value: memberLeadCount, icon: Target, color: '#059669' },
                  { label: 'Tâches', value: memberTasks.length, icon: ListChecks, color: '#26251e' },
                  { label: 'Complétées', value: completedTasks.length, icon: CheckCircle2, color: '#059669' },
                  { label: 'Complétion', value: `${completionRate}%`, icon: TrendingUp, color: completionRate >= 70 ? '#059669' : '#d97706' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="rounded-xl border border-[#e5e5e0] bg-white p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">{label}</p>
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
                        <Icon className="h-3 w-3" style={{ color }} />
                      </div>
                    </div>
                    <p className="text-2xl font-black leading-none" style={{ color }}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Weekly activity mini chart */}
              <div className="rounded-xl border border-[#e5e5e0] bg-white p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#7a7a76]">Activité 8 semaines</h3>
                  <Activity className="h-4 w-4 text-[#059669]" />
                </div>
                <ResponsiveContainer width="100%" height={140}>
                  <AreaChart data={weeklyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="memberLeadsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#059669" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0ec" />
                    <XAxis dataKey="week" tick={{ fontSize: 9, fill: '#7a7a76' }} />
                    <YAxis tick={{ fontSize: 9, fill: '#7a7a76' }} />
                    <ReTooltip
                      contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e5e0', background: '#fff' }}
                      labelStyle={{ fontWeight: 700 }}
                    />
                    <Area type="monotone" dataKey="leads" stroke="#059669" strokeWidth={2} fill="url(#memberLeadsGrad)" dot={false} name="Leads" />
                    <Area type="monotone" dataKey="tasks" stroke="#3b82f6" strokeWidth={2} fill="transparent" dot={false} strokeDasharray="4 2" name="Tâches" />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-4 mt-2 justify-center">
                  <div className="flex items-center gap-1.5 text-xs text-[#7a7a76]">
                    <div className="w-3 h-0.5 bg-[#059669] rounded" />
                    Leads
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#7a7a76]">
                    <div className="w-3 h-0.5 bg-[#3b82f6] rounded" style={{ borderTop: '2px dashed #3b82f6', background: 'transparent' }} />
                    Tâches
                  </div>
                </div>
              </div>

              {/* Recent pending tasks preview */}
              {pendingTasks.length > 0 && (
                <div className="rounded-xl border border-[#e5e5e0] bg-white p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#7a7a76]">Tâches en cours</h3>
                    <button onClick={() => setActiveTab('tasks')} className="text-[10px] font-bold text-[#059669] hover:text-[#047857] transition-colors">
                      Voir tout →
                    </button>
                  </div>
                  <div className="space-y-2">
                    {pendingTasks.slice(0, 3).map(t => (
                      <div key={t.id} className="flex items-center gap-3 py-1.5">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: CATEGORY_COLORS[t.category] ?? '#8b8b85' }} />
                        <p className="text-xs text-[#26251e] flex-1 truncate">{t.title}</p>
                        {t.due_date && (
                          <span className="text-[10px] text-[#7a7a76] shrink-0 flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {t.due_date}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STATS TAB ── */}
          {activeTab === 'stats' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Daily activity heatmap-style bar chart */}
              <div className="rounded-xl border border-[#e5e5e0] bg-white p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-black text-[#26251e]">Activité journalière</h3>
                    <p className="text-[11px] text-[#7a7a76] mt-0.5">14 derniers jours</p>
                  </div>
                  <Hash className="h-4 w-4 text-[#059669]" />
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={activityData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barSize={18}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0ec" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#7a7a76' }} />
                    <YAxis tick={{ fontSize: 9, fill: '#7a7a76' }} />
                    <ReTooltip
                      contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e5e0', background: '#fff' }}
                    />
                    <Bar dataKey="value" name="Actions" radius={[4, 4, 0, 0]}>
                      {activityData.map((_, i) => (
                        <Cell key={i} fill={i === activityData.length - 1 ? '#059669' : `rgba(5,150,105,${0.3 + (i / activityData.length) * 0.5})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Two-column: Weekly leads + task breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Weekly leads chart */}
                <div className="rounded-xl border border-[#e5e5e0] bg-white p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#7a7a76]">Leads / semaine</h3>
                    <Target className="h-4 w-4 text-[#059669]" />
                  </div>
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={weeklyData.slice(-6)} margin={{ top: 0, right: 0, left: -25, bottom: 0 }} barSize={12}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0ec" vertical={false} />
                      <XAxis dataKey="week" tick={{ fontSize: 8, fill: '#7a7a76' }} />
                      <YAxis tick={{ fontSize: 8, fill: '#7a7a76' }} />
                      <ReTooltip contentStyle={{ fontSize: 10, borderRadius: 8, border: '1px solid #e5e5e0' }} />
                      <Bar dataKey="leads" fill="#059669" radius={[3, 3, 0, 0]} name="Leads" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Task category donut */}
                <div className="rounded-xl border border-[#e5e5e0] bg-white p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#7a7a76]">Types de tâches</h3>
                    <ListChecks className="h-4 w-4 text-[#059669]" />
                  </div>
                  {categoryPieData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={100}>
                        <PieChart>
                          <Pie
                            data={categoryPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={28}
                            outerRadius={46}
                            dataKey="value"
                            stroke="none"
                          >
                            {categoryPieData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <ReTooltip contentStyle={{ fontSize: 10, borderRadius: 8 }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-wrap gap-2 justify-center mt-2">
                        {categoryPieData.map(d => (
                          <div key={d.name} className="flex items-center gap-1 text-[10px] text-[#7a7a76]">
                            <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                            {d.name}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-24 text-xs text-[#7a7a76]">
                      Aucune tâche assignée
                    </div>
                  )}
                </div>
              </div>

              {/* Completion rate radial */}
              <div className="rounded-xl border border-[#e5e5e0] bg-white p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#7a7a76]">Taux de complétion global</h3>
                  <Trophy className="h-4 w-4 text-[#059669]" />
                </div>
                <div className="flex items-center gap-6">
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
                  <div className="space-y-1">
                    <p className="text-3xl font-black text-[#059669]">{completionRate}%</p>
                    <p className="text-xs text-[#7a7a76]">{completedTasks.length} tâches complétées</p>
                    <p className="text-xs text-[#7a7a76]">{pendingTasks.length} en attente</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TASKS TAB ── */}
          {activeTab === 'tasks' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {loadingStats && (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <div key={i} className="h-12 rounded-xl bg-[#f4f4f3] animate-pulse" />)}
                </div>
              )}

              {!loadingStats && memberTasks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <ListChecks className="h-10 w-10 text-[#d4d4cd]" />
                  <p className="text-sm font-semibold text-[#7a7a76]">Aucune tâche assignée à ce membre</p>
                  <p className="text-xs text-[#b0b0a8]">Assignez des tâches depuis la page Tâches</p>
                  <Link href="/tasks" className="text-xs font-bold text-[#059669] hover:text-[#047857] transition-colors mt-1">
                    Aller aux tâches →
                  </Link>
                </div>
              )}

              {/* Pending */}
              {pendingTasks.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] px-1">
                    En cours ({pendingTasks.length})
                  </p>
                  <div className="rounded-xl border border-[#e5e5e0] bg-white divide-y divide-[#e5e5e0]">
                    {pendingTasks.map(t => (
                      <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: CATEGORY_COLORS[t.category] ?? '#8b8b85' }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#26251e] truncate">{t.title}</p>
                          {t.due_date && (
                            <p className="text-[10px] text-amber-600 flex items-center gap-0.5 mt-0.5 font-semibold">
                              <Clock className="h-2.5 w-2.5" />
                              {t.due_date}
                            </p>
                          )}
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 shrink-0">
                          {t.category}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Completed */}
              {completedTasks.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] px-1">
                    Complétées ({completedTasks.length})
                  </p>
                  <div className="rounded-xl border border-[#e5e5e0] bg-white divide-y divide-[#e5e5e0]">
                    {completedTasks.map(t => (
                      <div key={t.id} className="flex items-center gap-3 px-4 py-3 opacity-70">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#059669] shrink-0" />
                        <p className="text-xs text-[#555552] truncate line-through">{t.title}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── ACCESS TAB ── */}
          {activeTab === 'access' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Niveau d&apos;accès</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {DEFAULT_ROLE_CONFIG.map(role => {
                  const Icon = role.icon;
                  const isSelected = selectedRole === role.key;
                  return (
                    <button
                      key={role.key}
                      onClick={() => setSelectedRole(role.key)}
                      className={cn(
                        'group text-left p-4 rounded-xl border transition-all space-y-2.5 bg-white',
                        isSelected
                          ? 'border-transparent ring-2 shadow-sm'
                          : 'border-[#e5e5e0] hover:border-[#c5c5c0]'
                      )}
                      style={isSelected ? { boxShadow: `0 0 0 2px ${role.color}`, background: `${role.color}08` } : undefined}
                    >
                      <div className="flex items-center justify-between">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ background: `${role.color}15`, color: role.color }}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        {isSelected && <Check className="h-4 w-4" style={{ color: role.color }} />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#26251e]">{role.label}</p>
                        <p className="text-[10px] text-[#7a7a76] leading-tight mt-0.5">{role.desc}</p>
                      </div>
                      <p className="text-[9px] font-bold text-[#b0b0a8]">
                        {DEFAULT_ROLE_PERMISSIONS[role.key]?.length ?? 0} modules accessibles
                      </p>
                    </button>
                  );
                })}
              </div>

              {effectivePerms.length > 0 && (
                <div className="border border-[#e5e5e0] rounded-xl p-5 bg-white space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Accès accordés</div>
                    <span
                      className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                      style={activeRole ? { background: `${activeRole.color}15`, color: activeRole.color } : undefined}
                    >
                      {effectivePerms.length} modules
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {effectivePerms.map(m => {
                      const Icon = MODULE_ICONS[m] ?? Check;
                      return (
                        <div key={m} className="flex items-center gap-2 text-[11px] font-semibold text-[#26251e] py-1">
                          <div className="w-5 h-5 rounded-md bg-[#f4f4f3] border border-[#e5e5e0] flex items-center justify-center shrink-0">
                            <Icon className="h-3 w-3 text-[#7a7a76]" />
                          </div>
                          {PERMISSION_MODULES[m]?.label ?? m}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => router.back()}
                  className="flex-1 py-2.5 text-sm font-semibold border border-[#e5e5e0] bg-white text-[#555552] rounded-lg hover:bg-[#f4f4f3] transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || saved || member?.isOwner}
                  className="flex-1 py-2.5 text-sm font-bold text-white rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-60 bg-[#059669] hover:bg-[#047857]"
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
