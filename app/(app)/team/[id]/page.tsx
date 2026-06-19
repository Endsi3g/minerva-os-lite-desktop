'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useReach } from '@/lib/reach-context';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft, Mail, Calendar, Briefcase, Award, Clock,
  MapPin, PlusCircle, CheckCircle2, FileText, User, ChevronRight, BarChart3, AlertCircle, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfileInfo {
  full_name: string;
  avatar_base64: string | null;
  user_role: string | null;
  bio: string | null;
  email: string | null;
  joined_at: string | null;
  workspace_role: string;
}

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  created_at: string;
  lead_id: string | null;
}

export default function MemberProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { activeWorkspace } = useReach();
  const memberId = params.id;

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [stats, setStats] = useState({
    leadsCreated: 0,
    tasksCompleted: 0,
    visitsMade: 0,
    meetingsBooked: 0
  });

  const loadData = useCallback(async () => {
    if (!memberId || !activeWorkspace) return;
    setLoading(true);

    const supabase = createClient();
    const isElectron = typeof window !== 'undefined' && !!(window as any).electron;

    try {
      let settingsRow: any = null;
      let memberRow: any = null;

      // 1. Fetch settings (profile info)
      if (isElectron) {
        settingsRow = await (window as any).electron.dbGet("SELECT * FROM settings WHERE user_id = ?", [memberId]);
      } else {
        const { data } = await supabase.from('settings').select('*').eq('user_id', memberId).maybeSingle();
        settingsRow = data;
      }

      // 2. Fetch membership info
      if (isElectron) {
        memberRow = await (window as any).electron.dbGet("SELECT * FROM team_members WHERE member_user_id = ? AND workspace_id = ?", [memberId, activeWorkspace.id]);
      } else {
        const { data } = await supabase
          .from('team_members')
          .select('*')
          .eq('member_user_id', memberId)
          .eq('workspace_id', activeWorkspace.id)
          .maybeSingle();
        memberRow = data;
      }

      // Resolve roles
      let resolvedWorkspaceRole = 'Membre';
      if (activeWorkspace.owner_id === memberId) {
        resolvedWorkspaceRole = 'Propriétaire';
      } else if (memberRow) {
        resolvedWorkspaceRole = memberRow.role === 'admin' ? 'Administrateur' : memberRow.role === 'editor' ? 'Éditeur' : 'Lecteur';
      }

      const resolvedProfile: ProfileInfo = {
        full_name: settingsRow?.full_name || (memberRow?.email ? memberRow.email.split('@')[0] : 'Membre'),
        avatar_base64: settingsRow?.avatar_base64 || null,
        user_role: settingsRow?.user_role || (activeWorkspace.owner_id === memberId ? 'Directeur de Prospection' : 'Commercial Terrain'),
        bio: settingsRow?.bio || null,
        email: settingsRow?.email || memberRow?.email || null,
        joined_at: memberRow?.joined_at || memberRow?.invited_at || activeWorkspace.created_at,
        workspace_role: resolvedWorkspaceRole
      };
      setProfile(resolvedProfile);

      // 3. Fetch activities
      let activitiesRows: any[] = [];
      if (isElectron) {
        activitiesRows = await (window as any).electron.dbAll(
          "SELECT * FROM activities WHERE user_id = ? AND workspace_id = ? ORDER BY created_at DESC",
          [memberId, activeWorkspace.id]
        );
      } else {
        const { data } = await supabase
          .from('activities')
          .select('*')
          .eq('user_id', memberId)
          .eq('workspace_id', activeWorkspace.id)
          .order('created_at', { ascending: false });
        activitiesRows = data || [];
      }

      setActivities(activitiesRows);

      // 4. Calculate statistics
      let leads = 0;
      let tasks = 0;
      let visits = 0;
      let meetings = 0;

      activitiesRows.forEach(a => {
        if (a.type === 'lead_created') leads++;
        if (a.type === 'task_completed') tasks++;
        if (a.type === 'visit') {
          visits++;
          if (a.body && (a.body.includes('RDV') || a.body.includes('meeting_booked') || a.body.includes('RDV pris'))) {
            meetings++;
          }
        }
      });

      setStats({
        leadsCreated: leads,
        tasksCompleted: tasks,
        visitsMade: visits,
        meetingsBooked: meetings
      });

    } catch (err) {
      console.error('Failed to load member profile & activity:', err);
    } finally {
      setLoading(false);
    }
  }, [memberId, activeWorkspace]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafaf8] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="text-xs font-semibold text-[#7a7a76]">Chargement de la fiche collaborateur...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#fafaf8] flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
        <h2 className="text-sm font-bold text-[#26251e] mb-1">Collaborateur introuvable</h2>
        <p className="text-xs text-[#7a7a76] max-w-sm mb-4">Ce collaborateur n'existe pas ou n'appartient pas à votre espace de travail actuel.</p>
        <Link href="/team">
          <button className="h-9 px-4 bg-[#26251e] hover:bg-neutral-800 text-white font-semibold text-xs rounded-xl transition-all">
            Retour à l'équipe
          </button>
        </Link>
      </div>
    );
  }

  const renderActivityIcon = (type: string) => {
    switch (type) {
      case 'lead_created':
        return (
          <div className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center">
            <PlusCircle className="w-3.5 h-3.5" />
          </div>
        );
      case 'task_completed':
        return (
          <div className="w-7 h-7 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
        );
      case 'visit':
        return (
          <div className="w-7 h-7 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center">
            <MapPin className="w-3.5 h-3.5" />
          </div>
        );
      case 'note':
        return (
          <div className="w-7 h-7 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20 flex items-center justify-center">
            <FileText className="w-3.5 h-3.5" />
          </div>
        );
      default:
        return (
          <div className="w-7 h-7 rounded-full bg-neutral-100 text-neutral-500 flex items-center justify-center">
            <Clock className="w-3.5 h-3.5" />
          </div>
        );
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-[#fafaf8] overflow-y-auto px-6 py-8 md:px-12 md:py-10 text-left">
      <div className="max-w-5xl w-full mx-auto space-y-6">
        
        {/* Header navigation */}
        <div className="flex items-center gap-3">
          <Link
            href="/team"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e5e5e0] bg-white hover:bg-[#f4f4f3] text-[#555552] hover:text-[#26251e] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="text-xs font-semibold text-[#7a7a76]">Retour à l'équipe</span>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Profile card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white border border-[#e5e5e0] rounded-2xl p-6 shadow-xs space-y-6 relative overflow-hidden">
              {/* Top Accent Gradient */}
              <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-500 to-teal-600" />
              
              {/* Profile Main Header */}
              <div className="flex flex-col items-center text-center space-y-4 pt-3">
                <div className="relative">
                  {profile.avatar_base64 ? (
                    <img
                      src={profile.avatar_base64}
                      alt={profile.full_name}
                      className="w-20 h-20 rounded-full object-cover border-2 border-neutral-100 shadow-sm animate-in fade-in zoom-in-95 duration-300"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-neutral-900 text-white flex items-center justify-center font-black text-2xl border-2 border-neutral-100 shadow-sm animate-in fade-in zoom-in-95 duration-300">
                      {profile.full_name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-[#26251e] tracking-tight">{profile.full_name}</h2>
                  <p className="text-xs text-neutral-500 font-semibold flex items-center justify-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-neutral-400" />
                    <span>{profile.user_role}</span>
                  </p>
                </div>

                <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold rounded-full uppercase tracking-wider">
                  {profile.workspace_role}
                </span>
              </div>

              {/* Bio Section */}
              {profile.bio && (
                <div className="border-t border-[#e5e5e0]/60 pt-4 space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Biographie</h4>
                  <p className="text-xs text-[#555552] leading-relaxed italic">
                    "{profile.bio}"
                  </p>
                </div>
              )}

              {/* General Details */}
              <div className="border-t border-[#e5e5e0]/60 pt-4 space-y-3.5 text-xs text-[#555552]">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Informations de contact</h4>
                
                {profile.email && (
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-4 h-4 text-neutral-400 shrink-0" />
                    <span className="truncate">{profile.email}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-neutral-400 shrink-0" />
                  <span>Rejoint le {formatDate(profile.joined_at || new Date().toISOString())}</span>
                </div>
              </div>
            </div>

            {/* Premium Stat Card */}
            <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-[#166534] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#bbf7d0] pb-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                Performance Globale
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/80 rounded-xl p-3 border border-[#bbf7d0]/40 text-left">
                  <p className="text-[9px] text-[#166534] font-bold uppercase tracking-wider">Prospects créés</p>
                  <p className="text-2xl font-black text-[#15803d] mt-1">{stats.leadsCreated}</p>
                </div>
                <div className="bg-white/80 rounded-xl p-3 border border-[#bbf7d0]/40 text-left">
                  <p className="text-[9px] text-[#166534] font-bold uppercase tracking-wider">Tâches faites</p>
                  <p className="text-2xl font-black text-[#15803d] mt-1">{stats.tasksCompleted}</p>
                </div>
                <div className="bg-white/80 rounded-xl p-3 border border-[#bbf7d0]/40 text-left">
                  <p className="text-[9px] text-[#166534] font-bold uppercase tracking-wider">Visites terrain</p>
                  <p className="text-2xl font-black text-[#15803d] mt-1">{stats.visitsMade}</p>
                </div>
                <div className="bg-white/80 rounded-xl p-3 border border-[#bbf7d0]/40 text-left">
                  <p className="text-[9px] text-[#166534] font-bold uppercase tracking-wider">RDVs bookés</p>
                  <p className="text-2xl font-black text-[#15803d] mt-1">{stats.meetingsBooked}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Timeline / Activity Feed */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white border border-[#e5e5e0] rounded-2xl p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-[#e5e5e0] pb-3">
                <h3 className="text-sm font-bold text-[#26251e] tracking-tight flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-600" />
                  Activité récente
                </h3>
                <span className="text-[10px] text-neutral-400 font-semibold uppercase">
                  {activities.length} logs enregistrés
                </span>
              </div>

              {activities.length === 0 ? (
                <div className="py-20 text-center text-xs text-[#7a7a76] space-y-2">
                  <Clock className="w-8 h-8 text-[#e5e5e0] mx-auto" />
                  <p className="font-semibold text-neutral-600">Aucune activité enregistrée pour l'instant.</p>
                  <p className="text-[10px] max-w-[280px] mx-auto">Toutes les actions majeures (visite, lead, note, tâche) s'afficheront ici au fur et à mesure.</p>
                </div>
              ) : (
                <div className="relative border-l border-neutral-100 pl-6 space-y-6 text-left">
                  {activities.map((act) => (
                    <div key={act.id} className="relative group">
                      
                      {/* Left timeline dot with icon */}
                      <span className="absolute -left-[38px] top-0 transition-transform group-hover:scale-105">
                        {renderActivityIcon(act.type)}
                      </span>

                      <div className="space-y-1.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <h4 className="text-xs font-bold text-[#26251e]">{act.title}</h4>
                          <span className="text-[9px] font-semibold text-[#807d72] flex items-center gap-1">
                            <Clock className="w-3 h-3 text-neutral-300 animate-pulse" />
                            <span>{formatDate(act.created_at)} à {formatTime(act.created_at)}</span>
                          </span>
                        </div>
                        
                        {act.body && (
                          <div className="bg-[#fafaf8] border border-[#e5e5e0]/60 rounded-xl p-3 text-[11px] text-[#555552] leading-relaxed">
                            {act.body}
                          </div>
                        )}

                        {act.lead_id && (
                          <Link
                            href={`/leads/${act.lead_id}`}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-800 transition-colors pt-0.5"
                          >
                            <span>Voir le prospect</span>
                            <ChevronRight className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
