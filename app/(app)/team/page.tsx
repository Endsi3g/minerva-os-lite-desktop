'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Mail, Search, Download, Filter, Check, X,
  Loader2, ChevronDown, Info, Trash2, ArrowUpDown,
  MessageSquare, Send, Link2, Copy, Shield, Star, Eye,
  Smile, ImagePlus,
  Plus, Pencil, LogOut, Palette, ChevronRight,
  UsersRound, BarChart2, TrendingUp, Users2, Share2, Trophy,
} from 'lucide-react';
import { WorkloadBoard } from './_components/workload-board';
import { RevenueFeed } from './_components/revenue-feed';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useLanguage } from '@/lib/language-context';
import { getApiUrl } from '@/lib/api-helper';
import { useReach } from '@/lib/reach-context';
import { PERMISSION_MODULES, DEFAULT_ROLE_PERMISSIONS, type PermissionModule, ALL_MODULES } from '@/lib/permissions';

// ── Types ────────────────────────────────────────────────────────────────────
type Role = 'admin' | 'editor' | 'viewer';
type TeamTab = 'members' | 'groups' | 'roles' | 'workload' | 'revenue';

interface TeamGroup {
  id: string;
  name: string;
  memberIds: string[];
}
type Status = 'active' | 'pending';
type Plan = 'Business' | 'Pro' | 'Free';

interface CustomRole {
  id: string;
  name: string;
  color: string;
  permissions: PermissionModule[];
}

interface TeamMember {
  id: string;
  workspace_owner_id: string;
  member_user_id: string | null;
  email: string;
  role: Role;
  status: Status;
  invited_at: string;
  joined_at: string | null;
  invited_by: string | null;
  plan?: Plan;
  usage_count?: number;
  profile?: { full_name: string | null; company_name: string | null; avatar_base64?: string | null } | null;
}

export default function TeamPage() {
  useEffect(() => { document.title = 'Équipe — Minerva'; }, []);
  const { t, locale } = useLanguage();
  
  // Data State
  const [members, setMembers] = useState<TeamMember[]>([]);
  const prevMembersRef = useRef<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  // Online presence — userIds of members currently in the app
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; name: string; avatar?: string } | null>(null);
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TeamTab>(() => {
    const t = searchParams.get('tab');
    if (t === 'roles') return 'roles';
    if (t === 'workload') return 'workload';
    if (t === 'revenue') return 'revenue';
    if (t === 'groups') return 'groups';
    return 'members';
  });

  // Groupes d'équipe (remplace l'ancien widget Settings > Groupes, qui ne
  // persistait rien et ne permettait d'assigner aucun membre réel)
  const [groups, setGroups] = useState<TeamGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupMemberIds, setNewGroupMemberIds] = useState<Set<string>>(new Set());
  const [savingGroup, setSavingGroup] = useState(false);
  const [addingMemberToGroupId, setAddingMemberToGroupId] = useState<string | null>(null);
  const { activeWorkspace } = useReach();

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'editor' | 'viewer'>('all');
  const [planFilter, setPlanFilter] = useState<'all' | 'Business' | 'Pro' | 'Free'>('all');
  const [showFilterPopover, setShowFilterPopover] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<'email' | 'role' | 'plan'>('email');
  const [sortAscending, setSortAscending] = useState(true);

  // Modals & Panels
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('editor');
  const [invitePlan, setInvitePlan] = useState<Plan>('Business');
  const [isSending, setIsSending] = useState(false);
  const [inviteError, setInviteError] = useState('');

  // Link-based invite
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkRole, setLinkRole] = useState<Role>('editor');
  const [generatingLink, setGeneratingLink] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Active Dropdowns for Table Inline Edits
  const [activeDropdown, setActiveDropdown] = useState<{ id: string; type: 'role' | 'plan' } | null>(null);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);

  // Action confirmations
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Custom roles
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleColor, setRoleColor] = useState('#6366f1');
  const [rolePerms, setRolePerms] = useState<Set<PermissionModule>>(new Set());
  const [savingRole, setSavingRole] = useState(false);

  // Leave team
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leavingTeam, setLeavingTeam] = useState(false);


  // Toast System
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // Fetch Members
  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      // Pass the active workspace owner so members of shared workspaces see the right list
      const ownerParam = activeWorkspace?.owner_id ? `?ownerUserId=${activeWorkspace.owner_id}` : '';
      const res = await fetch(getApiUrl(`/api/team/members${ownerParam}`));
      if (res.ok) {
        const data = await res.json();
        const newMembers: TeamMember[] = data.members || [];

        // Detect pending → active transitions and toast
        const prev = prevMembersRef.current;
        newMembers.forEach(m => {
          if (m.status === 'active' && m.member_user_id) {
            const was = prev.find(p => p.id === m.id);
            if (was && was.status === 'pending') {
              const name = m.profile?.full_name || m.email.split('@')[0];
              triggerToast(`🎉 ${name} a rejoint le workspace et a accès à l'application !`);
            }
          }
        });

        prevMembersRef.current = newMembers;
        setMembers(newMembers);
      }
    } catch (err) {
      console.error('Failed to load team members:', err);
    } finally {
      setLoading(false);
    }
  }, [triggerToast, activeWorkspace]);

  // Fetch custom roles
  const fetchCustomRoles = useCallback(async () => {
    try {
      const res = await fetch(getApiUrl('/api/team/roles'));
      if (res.ok) {
        const data = await res.json();
        setCustomRoles(data.roles || []);
      }
    } catch {}
  }, []);

  // Fetch team groups (real members only — see migration team_groups/team_group_members)
  const fetchGroups = useCallback(async () => {
    if (!activeWorkspace) return;
    setGroupsLoading(true);
    try {
      const supabase = createClient();
      const { data: groupRows } = await supabase
        .from('team_groups')
        .select('id, name')
        .eq('workspace_id', activeWorkspace.id)
        .order('created_at', { ascending: true });
      const { data: memberRows } = await supabase
        .from('team_group_members')
        .select('group_id, team_member_id');
      const byGroup = new Map<string, string[]>();
      (memberRows || []).forEach((r: { group_id: string; team_member_id: string }) => {
        const arr = byGroup.get(r.group_id) || [];
        arr.push(r.team_member_id);
        byGroup.set(r.group_id, arr);
      });
      setGroups((groupRows || []).map((g: { id: string; name: string }) => ({
        id: g.id,
        name: g.name,
        memberIds: byGroup.get(g.id) || [],
      })));
    } catch (err) {
      console.error('Failed to load team groups:', err);
    } finally {
      setGroupsLoading(false);
    }
  }, [activeWorkspace]);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !activeWorkspace || !currentUser) return;
    setSavingGroup(true);
    try {
      const supabase = createClient();
      const { data: group, error } = await supabase
        .from('team_groups')
        .insert({ workspace_id: activeWorkspace.id, name: newGroupName.trim(), created_by: currentUser.id })
        .select('id')
        .single();
      if (error || !group) throw error;
      if (newGroupMemberIds.size > 0) {
        await supabase.from('team_group_members').insert(
          Array.from(newGroupMemberIds).map((memberId) => ({ group_id: group.id, team_member_id: memberId }))
        );
      }
      setShowCreateGroupModal(false);
      setNewGroupName('');
      setNewGroupMemberIds(new Set());
      await fetchGroups();
    } catch (err) {
      console.error('Failed to create group:', err);
    } finally {
      setSavingGroup(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    const supabase = createClient();
    await supabase.from('team_group_members').delete().eq('group_id', groupId);
    await supabase.from('team_groups').delete().eq('id', groupId);
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
  };

  const handleToggleGroupMember = async (groupId: string, memberId: string, isMember: boolean) => {
    const supabase = createClient();
    if (isMember) {
      await supabase.from('team_group_members').delete().eq('group_id', groupId).eq('team_member_id', memberId);
    } else {
      await supabase.from('team_group_members').insert({ group_id: groupId, team_member_id: memberId });
    }
    setGroups((prev) => prev.map((g) => g.id !== groupId ? g : {
      ...g,
      memberIds: isMember ? g.memberIds.filter((id) => id !== memberId) : [...g.memberIds, memberId],
    }));
  };

  // Init Data
  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: settings } = await supabase
          .from('settings')
          .select('full_name, avatar_base64')
          .eq('user_id', user.id)
          .maybeSingle();
        setCurrentUser({
          id: user.id,
          email: user.email || '',
          name: settings?.full_name || user.email?.split('@')[0] || 'User',
          avatar: settings?.avatar_base64 || undefined,
        });
      }
      await fetchMembers();
      await fetchCustomRoles();
    };
    init();
  }, [fetchMembers, fetchCustomRoles]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  // Supabase realtime — refresh members when team_members changes
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('team_members_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, (payload: any) => {
        // Detect instant join event from the change payload (before full re-fetch)
        if (payload.eventType === 'UPDATE') {
          const newRow = payload.new as Record<string, unknown>;
          const oldRow = payload.old as Record<string, unknown>;
          if (oldRow?.status === 'pending' && newRow?.status === 'active') {
            triggerToast(`🎉 Un membre vient de rejoindre le workspace et a maintenant accès à l'application !`);
          }
        }
        fetchMembers();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchMembers, triggerToast]);

  // Re-fetch members when the user switches back to this tab (catches settings name updates)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchMembers();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchMembers]);

  // Supabase Presence — track which members are currently online in the app
  useEffect(() => {
    if (!currentUser || !activeWorkspace) return;
    const supabase = createClient();
    const presenceKey = `team_presence_${activeWorkspace.owner_id ?? activeWorkspace.id}`;
    const channel = supabase.channel(presenceKey);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const ids = new Set<string>();
        (Object.values(state) as any[][]).forEach((presences) => {
          presences.forEach((p: any) => { if (p.userId) ids.add(p.userId as string); });
        });
        setOnlineUserIds(ids);
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ userId: currentUser.id });
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [currentUser, activeWorkspace]);

  // Handle Invite Form Submission
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setIsSending(true);
    setInviteError('');

    try {
      const res = await fetch(getApiUrl('/api/team/invite'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
          plan: invitePlan,
          usageCount: 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setInviteError(data.error || 'Failed to send invitation');
      } else {
        setShowInviteModal(false);
        setInviteEmail('');
        triggerToast(`1 ${t('team.toast_success')}`);
        await fetchMembers();
      }
    } catch (err) {
      console.error(err);
      setInviteError('Failed to invite member. Please check your internet connection.');
    } finally {
      setIsSending(false);
    }
  };

  // Handle link-based invite
  const handleGenerateLink = async () => {
    setGeneratingLink(true);
    setGeneratedLink(null);
    try {
      const res = await fetch(getApiUrl('/api/team/create-invite-link'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: linkRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setGeneratedLink(data.link);
        await fetchMembers();
      } else {
        triggerToast(`Erreur: ${data.error || 'Impossible de générer le lien'}`);
      }
    } catch (err) {
      console.error('[generateLink] fetch error:', err);
      // Try to get raw text for better diagnosis
      triggerToast('Erreur réseau — vérifiez la console');
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleCopyLink = async () => {
    if (!generatedLink) return;
    await navigator.clipboard.writeText(generatedLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  };

  // Handle Role/Plan Update Inline
  const handleUpdateField = async (memberId: string, updates: { role?: Role; plan?: Plan; usageCount?: number }) => {
    setUpdatingMemberId(memberId);
    setActiveDropdown(null);
    try {
      const res = await fetch(getApiUrl('/api/team/members'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          ...updates,
        }),
      });

      if (res.ok) {
        setMembers((prev) =>
          prev.map((m) => {
            if (m.id === memberId) {
              return {
                ...m,
                role: updates.role !== undefined ? updates.role : m.role,
                plan: updates.plan !== undefined ? updates.plan : m.plan,
                usage_count: updates.usageCount !== undefined ? updates.usageCount : m.usage_count,
              };
            }
            return m;
          })
        );
      } else {
        const data = await res.json();
        triggerToast(`Error: ${data.error || 'Failed to update'}`);
      }
    } catch (err) {
      console.error(err);
      triggerToast('Network error updating member.');
    } finally {
      setUpdatingMemberId(null);
    }
  };

  // Handle Remove Member
  const handleRemoveMember = async (memberId: string) => {
    setRemovingId(memberId);
    try {
      const res = await fetch(getApiUrl(`/api/team/members?id=${memberId}`), { method: 'DELETE' });
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
        triggerToast('Member removed successfully.');
      } else {
        const data = await res.json();
        triggerToast(`Error: ${data.error || 'Failed to remove'}`);
      }
    } catch (err) {
      console.error(err);
      triggerToast('Network error removing member.');
    } finally {
      setRemovingId(null);
      setConfirmRemoveId(null);
    }
  };

  // Custom role CRUD
  const openNewRole = () => {
    setEditingRole(null);
    setRoleName('');
    setRoleColor('#6366f1');
    setRolePerms(new Set());
    setShowRoleModal(true);
  };

  const openEditRole = (role: CustomRole) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleColor(role.color);
    setRolePerms(new Set(role.permissions));
    setShowRoleModal(true);
  };

  const handleSaveRole = async () => {
    if (!roleName.trim()) return;
    setSavingRole(true);
    try {
      const permsArray = Array.from(rolePerms);
      if (editingRole) {
        const res = await fetch(getApiUrl(`/api/team/roles?id=${editingRole.id}`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: roleName.trim(), color: roleColor, permissions: permsArray }),
        });
        if (res.ok) {
          const data = await res.json();
          setCustomRoles(prev => prev.map(r => r.id === editingRole.id ? data.role : r));
          triggerToast('Rôle mis à jour.');
        }
      } else {
        const res = await fetch(getApiUrl('/api/team/roles'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: roleName.trim(), color: roleColor, permissions: permsArray }),
        });
        if (res.ok) {
          const data = await res.json();
          setCustomRoles(prev => [...prev, data.role]);
          triggerToast('Rôle créé.');
        }
      }
      setShowRoleModal(false);
    } catch { triggerToast('Erreur réseau.'); }
    finally { setSavingRole(false); }
  };

  const handleDeleteRole = async (roleId: string) => {
    try {
      const res = await fetch(getApiUrl(`/api/team/roles?id=${roleId}`), { method: 'DELETE' });
      if (res.ok) {
        setCustomRoles(prev => prev.filter(r => r.id !== roleId));
        triggerToast('Rôle supprimé.');
      }
    } catch { triggerToast('Erreur réseau.'); }
  };

  // Leave team
  const handleLeaveTeam = async () => {
    if (!activeWorkspace) return;
    setLeavingTeam(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const res = await fetch(getApiUrl('/api/team/leave'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceOwnerId: activeWorkspace.owner_id ?? activeWorkspace.id }),
      });
      if (res.ok) {
        triggerToast('Vous avez quitté l\'équipe.');
        setShowLeaveConfirm(false);
        window.location.href = '/today';
      } else {
        const data = await res.json();
        triggerToast(data.error || 'Erreur lors de la sortie.');
      }
    } catch { triggerToast('Erreur réseau.'); }
    finally { setLeavingTeam(false); }
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = ['Name', 'Email', 'Role', 'Plan', 'Status', 'Invited At'];
    const rows = filteredMembers.map((m) => [
      m.profile?.full_name || '—',
      m.email,
      m.role,
      m.plan || 'Business',
      m.status,
      new Date(m.invited_at).toISOString().split('T')[0]
    ]);

    // Include current user
    if (currentUser) {
      rows.push([
        currentUser.name,
        currentUser.email,
        'admin',
        'Business',
        'active',
        '—'
      ]);
    }

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `members_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter & Search Logic
  const filteredMembers = members.filter((member) => {
    // The current viewer already has a dedicated "(You)" row above the list (rendered
    // from `currentUser`, not from this array) — skip their own team_members row here
    // (this also covers the owner: /api/team/members synthesizes an entry for them with
    // member_user_id === their own id) to avoid showing the same person twice.
    if (currentUser && member.member_user_id === currentUser.id) return false;

    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      member.email.toLowerCase().includes(searchLower) ||
      (member.profile?.full_name || '').toLowerCase().includes(searchLower);

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && member.status === 'active') ||
      (statusFilter === 'pending' && member.status === 'pending');

    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    const matchesPlan = planFilter === 'all' || (member.plan || 'Business') === planFilter;

    return matchesSearch && matchesStatus && matchesRole && matchesPlan;
  });

  // Sort Logic
  const sortedMembers = [...filteredMembers].sort((a, b) => {
    let aVal: string = '';
    let bVal: string = '';

    if (sortField === 'email') {
      aVal = a.email;
      bVal = b.email;
    } else if (sortField === 'role') {
      aVal = a.role;
      bVal = b.role;
    } else if (sortField === 'plan') {
      aVal = a.plan || 'Business';
      bVal = b.plan || 'Business';
    }

    return sortAscending ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
  });

  const triggerSort = (field: 'email' | 'role' | 'plan') => {
    if (sortField === field) {
      setSortAscending(!sortAscending);
    } else {
      setSortField(field);
      setSortAscending(true);
    }
  };

  // Counts
  const totalInvitedCount = members.filter(m => m.status === 'pending').length;
  const totalMembersCount = members.length + 1; // +1 for current user

  return (
    <div className="h-full overflow-y-auto bg-white text-[#26251e] font-sans selection:bg-[#059669]/10 relative">
      <div className="absolute inset-0 opacity-[0.25] pointer-events-none bg-grid-pattern-20 z-0" />
      
      {/* ── Toast Notification (Top Right) ── */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[120] flex items-center gap-2.5 bg-white border border-neutral-200 shadow-md rounded-lg px-4 py-3 text-xs font-semibold animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="w-4 h-4 rounded-full bg-neutral-900 text-white flex items-center justify-center">
            <Check className="w-2.5 h-2.5" />
          </div>
          <span>{toastMessage}</span>
          <button 
            onClick={() => setToastMessage(null)}
            className="ml-2 text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="w-full px-3 sm:px-4 md:px-8 py-6 md:py-10 space-y-6 relative z-10">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-[#26251e] tracking-tight">
              {t('team.members_title')}
            </h1>
            <p className="text-xs text-neutral-500 font-medium">
              {t('team.members_subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/messages"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#e5e5e0] text-[#26251e] text-xs font-bold hover:bg-[#f4f4f3] transition-colors"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Chat d&apos;équipe
          </Link>
          {/* Leave team button — shown only if user is NOT the owner */}
          {currentUser && activeWorkspace && (activeWorkspace as { owner_id?: string }).owner_id !== currentUser.id && (
            <button
              onClick={() => setShowLeaveConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors shrink-0"
            >
              <LogOut className="h-3.5 w-3.5" />
              Quitter l&apos;équipe
            </button>
          )}
          </div>
        </div>

        {/* ── Tab Bar ── */}
        <div className="flex gap-1 border-b border-[#e5e5e0] -mx-8 px-8 bg-white/60 overflow-x-auto">
          <button
            onClick={() => setActiveTab('members')}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-t-lg border border-b-0 transition-colors flex items-center gap-1.5 shrink-0",
              activeTab === 'members'
                ? 'bg-white border-[#e5e5e0] text-[#26251e]'
                : 'bg-[#f4f4f3] border-transparent text-[#807d72] hover:text-[#26251e]'
            )}
          >
            <UsersRound className="w-3.5 h-3.5" />
            Équipe
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-t-lg border border-b-0 transition-colors flex items-center gap-1.5 shrink-0",
              activeTab === 'groups'
                ? 'bg-white border-[#e5e5e0] text-[#26251e]'
                : 'bg-[#f4f4f3] border-transparent text-[#807d72] hover:text-[#26251e]'
            )}
          >
            <Users2 className="w-3.5 h-3.5" />
            Groupes
            {groups.length > 0 && (
              <span className="bg-[#059669] text-white text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none">
                {groups.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-t-lg border border-b-0 transition-colors flex items-center gap-1.5",
              activeTab === 'roles'
                ? 'bg-white border-[#e5e5e0] text-[#26251e]'
                : 'bg-[#f4f4f3] border-transparent text-[#807d72] hover:text-[#26251e]'
            )}
          >
            <Shield className="w-3.5 h-3.5" />
            Rôles &amp; Permissions
            {customRoles.length > 0 && (
              <span className="bg-[#059669] text-white text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none">
                {customRoles.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('workload')}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-t-lg border border-b-0 transition-colors flex items-center gap-1.5",
              activeTab === 'workload'
                ? 'bg-white border-[#e5e5e0] text-[#26251e]'
                : 'bg-[#f4f4f3] border-transparent text-[#807d72] hover:text-[#26251e]'
            )}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            Charge de travail
          </button>
          <button
            onClick={() => setActiveTab('revenue')}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-t-lg border border-b-0 transition-colors flex items-center gap-1.5",
              activeTab === 'revenue'
                ? 'bg-white border-[#e5e5e0] text-[#26251e]'
                : 'bg-[#f4f4f3] border-transparent text-[#807d72] hover:text-[#26251e]'
            )}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Feed revenus
          </button>
          <Link
            href="/team/members"
            className="px-4 py-2 text-xs font-bold rounded-t-lg border border-b-0 transition-colors flex items-center gap-1.5 bg-[#f4f4f3] border-transparent text-[#7a7a76] hover:text-[#26251e] hover:bg-white"
          >
            <UsersRound className="w-3.5 h-3.5" />
            Annuaire Profils
          </Link>
          <Link
            href="/leaderboard"
            className="px-4 py-2 text-xs font-bold rounded-t-lg border border-b-0 transition-colors flex items-center gap-1.5 bg-[#f4f4f3] border-transparent text-[#1E4B33] hover:bg-[#1E4B33]/10 ml-auto"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            Classement & Leaderboard
          </Link>
        </div>

        {/* ── Groups Panel (shown when activeTab === 'groups') ── */}
        {activeTab === 'groups' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-[#7a7a76]">Organisez vos {members.length} membre(s) en groupes (ex: par région, par rôle) pour les cibler ensemble.</p>
              <button
                onClick={() => setShowCreateGroupModal(true)}
                className="px-4 py-2 bg-[#059669] text-white rounded-lg text-xs font-bold hover:bg-[#059669]/90 transition-colors shrink-0"
              >
                Créer un groupe
              </button>
            </div>

            {groupsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-[#059669]" />
              </div>
            ) : groups.length === 0 ? (
              <div className="border border-dashed border-[#e5e5e0] rounded-xl py-12 flex flex-col items-center gap-3 text-[#7a7a76]">
                <Users2 className="w-8 h-8 opacity-30" />
                <p className="text-xs font-semibold">Aucun groupe pour l&apos;instant.</p>
                <p className="text-[10px]">Créez un groupe et assignez-lui des membres réels de l&apos;équipe.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {groups.map((group) => {
                  const isExpanded = expandedGroupId === group.id;
                  const groupMembers = members.filter((m) => group.memberIds.includes(m.id));
                  return (
                    <div key={group.id} className="border border-[#e5e5e0] rounded-xl bg-white overflow-hidden">
                      <button
                        onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left"
                      >
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-[#7a7a76] shrink-0" /> : <ChevronRight className="h-4 w-4 text-[#7a7a76] shrink-0" />}
                        <div className="w-8 h-8 rounded-lg bg-[#059669]/10 flex items-center justify-center shrink-0">
                          <Users2 className="w-4 h-4 text-[#059669]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-[#26251e]">{group.name}</p>
                          <p className="text-[10px] text-[#7a7a76]">{groupMembers.length} membre(s)</p>
                        </div>
                        <span
                          role="button"
                          onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }}
                          className="p-1.5 text-[#7a7a76] hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </span>
                      </button>
                      {isExpanded && (
                        <div className="border-t border-[#e5e5e0] p-3 space-y-2">
                          {groupMembers.length === 0 ? (
                            <p className="text-[10px] text-[#7a7a76] px-1">Aucun membre dans ce groupe.</p>
                          ) : (
                            groupMembers.map((m) => (
                              <div key={m.id} className="flex items-center gap-3 px-1">
                                <div className="w-6 h-6 rounded-full bg-[#059669]/10 flex items-center justify-center shrink-0 overflow-hidden">
                                  {m.profile?.avatar_base64 ? (
                                    <img src={m.profile.avatar_base64} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-[10px] font-bold text-[#059669]">{(m.profile?.full_name || m.email).charAt(0).toUpperCase()}</span>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-[#26251e] truncate">{m.profile?.full_name || m.email.split('@')[0]}</p>
                                  <p className="text-[10px] text-[#7a7a76] truncate">{m.email}</p>
                                </div>
                                <button
                                  onClick={() => handleToggleGroupMember(group.id, m.id, true)}
                                  className="text-[10px] text-[#7a7a76] hover:text-red-500 font-semibold"
                                >
                                  Retirer
                                </button>
                              </div>
                            ))
                          )}

                          {addingMemberToGroupId === group.id ? (
                            <div className="border-t border-[#e5e5e0] pt-2 mt-2 space-y-1">
                              {members.filter((m) => !group.memberIds.includes(m.id)).map((m) => (
                                <button
                                  key={m.id}
                                  onClick={() => handleToggleGroupMember(group.id, m.id, false)}
                                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[#f4f4f3] text-left"
                                >
                                  <span className="text-xs text-[#26251e]">{m.profile?.full_name || m.email.split('@')[0]}</span>
                                  <span className="text-[10px] text-[#7a7a76] ml-auto">{m.email}</span>
                                </button>
                              ))}
                              {members.filter((m) => !group.memberIds.includes(m.id)).length === 0 && (
                                <p className="text-[10px] text-[#7a7a76] px-2">Tous les membres sont déjà dans ce groupe.</p>
                              )}
                              <button
                                onClick={() => setAddingMemberToGroupId(null)}
                                className="text-[10px] text-[#7a7a76] hover:text-[#26251e] px-2 pt-1"
                              >
                                Fermer
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setAddingMemberToGroupId(group.id)}
                              className="text-[10px] font-bold text-[#059669] hover:underline px-1 pt-1"
                            >
                              + Ajouter un membre
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Members Tab Content ── */}
        {activeTab === 'members' && <>

        {/* ── Banner 1: Plan limits alert ── */}
        <div className="flex gap-3 bg-[#059669]/5 border border-[#059669]/20 rounded-lg p-4 text-xs text-neutral-700 leading-relaxed shadow-2xs">
          <Info className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
          <div>
            <span>{t('team.banner_usage')} </span>
            <Link href="/billing" className="underline font-semibold hover:text-[#047857] transition-colors">
              {t('team.banner_usage_link')}
            </Link>
          </div>
        </div>

        {/* ── Stats Overview ── */}
        <div className="space-y-2">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            {t('team.stats_overview')}
          </h2>
          <div className="bg-white border border-neutral-200/60 rounded-xl p-5 shadow-2xs space-y-3">
            <div className="space-y-1">
              <span className="text-xs text-neutral-500 font-medium">{t('team.stats_total')}</span>
              <div className="flex items-baseline">
                <span className="text-3xl font-extrabold text-neutral-900 leading-none">{totalMembersCount}</span>
                <span className="text-xs text-neutral-400 font-medium ml-2">
                  ({totalInvitedCount} {t('team.stats_invited')})
                </span>
              </div>
            </div>
            <Link href="/billing" className="text-xs text-[#059669] hover:text-[#047857] font-semibold underline block transition-colors">
              {t('team.stats_details')}
            </Link>
          </div>
        </div>

        {/* ── Banner 2: Extra Spend limits alert ── */}
        <div className="flex gap-3 bg-[#059669]/5 border border-[#059669]/20 rounded-lg p-4 text-xs text-neutral-700 leading-relaxed shadow-2xs">
          <Info className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
          <div>
            <span>{t('team.banner_billing')} </span>
            <Link href="/billing" className="underline font-semibold hover:text-[#047857] transition-colors">
              {t('team.banner_billing_link')}
            </Link>
            <span>{locale === 'en' ? t('team.banner_billing_suffix') : '.'}</span>
          </div>
        </div>

        {/* ── Manage section ── */}
        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-neutral-900 tracking-tight">
              {t('team.manage_title')}
            </h2>
            <p className="text-xs text-neutral-500 font-medium">
              {t('team.manage_subtitle')}
            </p>
          </div>

          {/* ── Controls Bar ── */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-neutral-100/30 p-1 rounded-lg">
            <div className="flex flex-1 items-center gap-2 min-w-0">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder={t('team.search_placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-8 pl-9 pr-3 text-xs bg-white border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#059669] focus:border-[#059669] transition-all placeholder:text-neutral-400 font-medium"
                />
              </div>

              {/* Filter Popover Trigger */}
              <div className="relative">
                <button
                  onClick={() => setShowFilterPopover(!showFilterPopover)}
                  className={cn(
                    "h-8 w-8 flex items-center justify-center bg-white border border-neutral-200 rounded-md hover:bg-neutral-50 text-neutral-600 transition-colors relative",
                    (statusFilter !== 'all' || roleFilter !== 'all' || planFilter !== 'all') && "border-[#059669] text-[#059669]"
                  )}
                  title="Filtres"
                >
                  <Filter className="w-3.5 h-3.5" />
                  {(statusFilter !== 'all' || roleFilter !== 'all' || planFilter !== 'all') && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#059669] rounded-full" />
                  )}
                </button>

                {/* Filter Popover Menu */}
                {showFilterPopover && (
                  <>
                    <div className="fixed inset-0 z-[80]" onClick={() => setShowFilterPopover(false)} />
                    <div className="absolute left-0 mt-1.5 w-60 bg-white border border-neutral-200 rounded-lg shadow-lg p-3.5 z-[90] space-y-3.5 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="flex items-center justify-between border-b border-neutral-100 pb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Filtrer par</span>
                        <button
                          onClick={() => {
                            setStatusFilter('all');
                            setRoleFilter('all');
                            setPlanFilter('all');
                          }}
                          className="text-[10px] font-bold text-[#059669] hover:text-[#047857] transition-colors"
                        >
                          Réinitialiser
                        </button>
                      </div>

                      {/* Status select */}
                      <div className="space-y-1 text-left">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 block">Statut</label>
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'pending')}
                          className="w-full text-xs p-1.5 border border-neutral-200 rounded-md bg-white text-neutral-700 focus:outline-none focus:ring-1 focus:ring-[#059669]"
                        >
                          <option value="all">Tous les statuts</option>
                          <option value="active">Actif</option>
                          <option value="pending">Invité</option>
                        </select>
                      </div>

                      {/* Role select */}
                      <div className="space-y-1 text-left">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 block">Rôle</label>
                        <select
                          value={roleFilter}
                          onChange={(e) => setRoleFilter(e.target.value as 'all' | 'admin' | 'editor' | 'viewer')}
                          className="w-full text-xs p-1.5 border border-neutral-200 rounded-md bg-white text-neutral-700 focus:outline-none focus:ring-1 focus:ring-[#059669]"
                        >
                          <option value="all">Tous les rôles</option>
                          <option value="admin">Administrateur</option>
                          <option value="editor">Éditeur</option>
                          <option value="viewer">Lecteur</option>
                        </select>
                      </div>

                      {/* Plan select */}
                      <div className="space-y-1 text-left">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 block">Forfait</label>
                        <select
                          value={planFilter}
                          onChange={(e) => setPlanFilter(e.target.value as 'all' | 'Business' | 'Pro' | 'Free')}
                          className="w-full text-xs p-1.5 border border-neutral-200 rounded-md bg-white text-neutral-700 focus:outline-none focus:ring-1 focus:ring-[#059669]"
                        >
                          <option value="all">Tous les forfaits</option>
                          <option value="Business">Business</option>
                          <option value="Pro">Pro</option>
                          <option value="Free">Free</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleExportCSV}
                className="h-8 flex items-center gap-1.5 bg-white border border-neutral-200 rounded-md px-3 text-xs text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 font-semibold shadow-2xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t('team.btn_export')}</span>
              </button>

              {/* Link-based invite */}
              <button
                onClick={() => { setShowLinkModal(true); setGeneratedLink(null); setLinkCopied(false); }}
                className="h-8 bg-white border border-[#e6e5e0] hover:bg-neutral-50 text-[#26251e] text-xs font-semibold rounded-md px-3 shadow-2xs flex items-center gap-1.5 transition-colors"
                title="Générer un lien d'invitation (sans email)"
              >
                <Link2 className="h-3.5 w-3.5" />
                <span>Lien</span>
              </button>

              <button
                onClick={() => {
                  setShowInviteModal(true);
                  setInviteError('');
                  setInviteEmail('');
                }}
                className="h-8 bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold rounded-md px-4 shadow-2xs flex items-center gap-1.5 transition-colors"
              >
                <span>{t('team.btn_invite')}</span>
              </button>
            </div>
          </div>

          {/* ── Members List Table / Cards Responsive ── */}
          <div className="space-y-3">
            
            {/* Desktop Table View */}
            <div className="hidden md:block border border-neutral-200/60 rounded-xl overflow-hidden bg-white shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse table-auto">
                  <thead>
                    <tr className="border-b border-neutral-200/60 bg-neutral-50/30 text-[10px] font-bold uppercase tracking-wider text-neutral-400 select-none">
                      <th className="py-3 px-4 w-[40%] cursor-pointer hover:bg-neutral-100/30 transition-colors" onClick={() => triggerSort('email')}>
                        <div className="flex items-center gap-1">
                          <span>{t('team.table_name')}</span>
                          <ArrowUpDown className="w-3.5 h-3.5 text-neutral-300" />
                        </div>
                      </th>
                      <th className="py-3 px-4 w-[20%] cursor-pointer hover:bg-neutral-100/30 transition-colors" onClick={() => triggerSort('role')}>
                        <div className="flex items-center gap-1">
                          <span>{t('team.table_role')}</span>
                          <ArrowUpDown className="w-3.5 h-3.5 text-neutral-300" />
                        </div>
                      </th>
                      <th className="py-3 px-4 w-[20%] cursor-pointer hover:bg-neutral-100/30 transition-colors" onClick={() => triggerSort('plan')}>
                        <div className="flex items-center gap-1">
                          <span>{t('team.table_plan')}</span>
                          <ArrowUpDown className="w-3.5 h-3.5 text-neutral-300" />
                        </div>
                      </th>
                      <th className="py-3 px-4 w-[15%]">{t('team.table_usage')}</th>
                      <th className="py-3 px-4 w-[5%]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    
                    {/* Current User Row */}
                    {currentUser && (searchQuery === '' || 
                      currentUser.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      currentUser.email.toLowerCase().includes(searchQuery.toLowerCase())) && (
                      <tr className="hover:bg-neutral-50/40 transition-colors group">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-100 flex items-center justify-center shrink-0 border border-neutral-200">
                              {currentUser.avatar ? (
                                <img src={currentUser.avatar} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="font-extrabold text-xs text-neutral-600">
                                  {currentUser.name.slice(0, 2).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-neutral-900 truncate">
                                {currentUser.name} (You)
                              </p>
                              <p className="text-[10px] text-neutral-400 font-medium truncate mt-0.5">
                                {currentUser.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 relative">
                          <button
                            onClick={() => setActiveDropdown(activeDropdown?.id === 'current_user' && activeDropdown?.type === 'role' ? null : { id: 'current_user', type: 'role' })}
                            className="h-7 px-2 border border-neutral-200 rounded-md bg-white text-neutral-700 hover:bg-neutral-50 flex items-center justify-between gap-1.5 text-[11px] font-semibold transition-colors select-none w-24"
                          >
                            <span>Admin</span>
                            <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          </button>
                          
                          {activeDropdown?.id === 'current_user' && activeDropdown?.type === 'role' && (
                            <>
                              <div className="fixed inset-0 z-[80]" onClick={() => setActiveDropdown(null)} />
                              <div className="absolute left-4 top-11 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-[90] min-w-[120px] text-left">
                                <button
                                  onClick={() => setActiveDropdown(null)}
                                  className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-bold text-[#059669] bg-[#ecfdf5] hover:bg-neutral-50"
                                >
                                  <span>Admin</span>
                                  <Check className="w-3.5 h-3.5 text-[#059669]" />
                                </button>
                                {['editor', 'viewer'].map((r) => (
                                  <button
                                    key={r}
                                    onClick={() => {
                                      triggerToast('Cannot change owner permissions');
                                      setActiveDropdown(null);
                                    }}
                                    className="w-full px-3 py-1.5 text-[11px] font-semibold text-neutral-600 hover:bg-neutral-50 text-left capitalize"
                                  >
                                    {r === 'editor' ? 'Editeur' : 'Lecteur'}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </td>

                        <td className="py-3.5 px-4 relative">
                          <button
                            onClick={() => setActiveDropdown(activeDropdown?.id === 'current_user' && activeDropdown?.type === 'plan' ? null : { id: 'current_user', type: 'plan' })}
                            className="h-7 px-2 border border-neutral-200 rounded-md bg-white text-neutral-700 hover:bg-neutral-50 flex items-center justify-between gap-1.5 text-[11px] font-semibold transition-colors select-none w-24"
                          >
                            <span>Business</span>
                            <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          </button>

                          {activeDropdown?.id === 'current_user' && activeDropdown?.type === 'plan' && (
                            <>
                              <div className="fixed inset-0 z-[80]" onClick={() => setActiveDropdown(null)} />
                              <div className="absolute left-4 top-11 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-[90] min-w-[120px] text-left">
                                <button
                                  onClick={() => setActiveDropdown(null)}
                                  className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-bold text-[#059669] bg-[#ecfdf5] hover:bg-neutral-50"
                                >
                                  <span>Business</span>
                                  <Check className="w-3.5 h-3.5 text-[#059669]" />
                                </button>
                                {['Pro', 'Free'].map((p) => (
                                  <button
                                    key={p}
                                    onClick={() => {
                                      triggerToast('Workspace plan is linked to billing');
                                      setActiveDropdown(null);
                                    }}
                                    className="w-full px-3 py-1.5 text-[11px] font-semibold text-neutral-600 hover:bg-neutral-50 text-left"
                                  >
                                    {p}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4].map((dot) => (
                              <span key={dot} className="w-1.5 h-1.5 rounded-full bg-neutral-350" />
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 px-4"></td>
                      </tr>
                    )}

                    {/* Members Rows */}
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center">
                          <div className="flex items-center justify-center gap-2 text-neutral-400">
                            <Loader2 className="w-4 h-4 animate-spin text-[#059669]" />
                            <span className="text-xs font-semibold">Chargement des membres...</span>
                          </div>
                        </td>
                      </tr>
                    ) : sortedMembers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-xs text-neutral-400 font-medium">
                          Aucun membre trouvé
                        </td>
                      </tr>
                    ) : (
                      sortedMembers.map((member) => {
                        const isInvited = member.status === 'pending';
                        const formattedDate = new Date(member.invited_at).toLocaleDateString(locale, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        });
                        const isDropdownOpen = activeDropdown?.id === member.id;
                        const isUpdating = updatingMemberId === member.id;
                        const hasAppAccess = !isInvited && !!member.member_user_id;
                        const isOnline = hasAppAccess && onlineUserIds.has(member.member_user_id!);
                        const joinedDate = member.joined_at
                          ? new Date(member.joined_at).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })
                          : null;
                        const memberAvatar = member.profile?.avatar_base64;
                        return (
                          <tr key={member.id} className="hover:bg-neutral-50/40 transition-colors group">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                {isInvited ? (
                                  <div className="w-8 h-8 rounded-full bg-neutral-50 border border-neutral-200/80 flex items-center justify-center shrink-0">
                                    <Mail className="w-3.5 h-3.5 text-neutral-400" />
                                  </div>
                                ) : (
                                  <div className="relative shrink-0">
                                    <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-100 flex items-center justify-center border border-neutral-200">
                                      {memberAvatar ? (
                                        <img src={memberAvatar} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        <span className="font-extrabold text-xs text-neutral-600">
                                          {(member.profile?.full_name || member.email.split('@')[0]).slice(0, 2).toUpperCase()}
                                        </span>
                                      )}
                                    </div>
                                    {isOnline && (
                                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#059669] border-2 border-white z-10" />
                                    )}
                                  </div>
                                )}

                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-bold text-neutral-900 truncate">
                                      {isInvited ? member.email : (member.profile?.full_name || member.email.split('@')[0])}
                                    </span>
                                    {isInvited ? (
                                      <span className="bg-amber-50 text-amber-600 border border-amber-200 text-[9px] font-bold px-1.5 py-0.5 rounded select-none shrink-0">
                                        En attente
                                      </span>
                                    ) : hasAppAccess ? (
                                      <span className="bg-[#ecfdf5] text-[#059669] border border-[#6ee7b7]/60 text-[9px] font-bold px-1.5 py-0.5 rounded select-none shrink-0 flex items-center gap-0.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#059669] inline-block" />
                                        Accès app
                                      </span>
                                    ) : (
                                      <span className="bg-neutral-100 text-neutral-500 border border-neutral-200/80 text-[9px] font-bold px-1.5 py-0.5 rounded select-none shrink-0">
                                        Actif
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-neutral-400 font-medium truncate mt-0.5">
                                    {isInvited ? `Invité le ${formattedDate}` : joinedDate ? `A rejoint le ${joinedDate} · ${member.email}` : member.email}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 relative">
                              {isUpdating ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#059669]" />
                              ) : isInvited ? (
                                <span className="text-[11px] text-neutral-550 font-semibold capitalize">{member.role}</span>
                              ) : (
                                <>
                                  <button
                                    onClick={() => setActiveDropdown(isDropdownOpen && activeDropdown?.type === 'role' ? null : { id: member.id, type: 'role' })}
                                    className="h-7 px-2 border border-neutral-200 rounded-md bg-white text-neutral-700 hover:bg-neutral-50 flex items-center justify-between gap-1.5 text-[11px] font-semibold transition-colors select-none w-24"
                                  >
                                    <span className="capitalize">{member.role}</span>
                                    <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                                  </button>

                                  {isDropdownOpen && activeDropdown?.type === 'role' && (
                                    <>
                                      <div className="fixed inset-0 z-[80]" onClick={() => setActiveDropdown(null)} />
                                      <div className="absolute left-4 top-11 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-[90] min-w-[120px] text-left">
                                        {(['admin', 'editor', 'viewer'] as Role[]).map((r) => (
                                          <button
                                            key={r}
                                            onClick={() => handleUpdateField(member.id, { role: r })}
                                            className={cn(
                                              "w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold text-neutral-600 hover:bg-neutral-50 text-left capitalize",
                                              member.role === r && "text-[#059669] font-bold bg-[#ecfdf5]"
                                            )}
                                          >
                                            <span>{r}</span>
                                            {member.role === r && <Check className="w-3.5 h-3.5 text-[#059669]" />}
                                          </button>
                                        ))}
                                      </div>
                                    </>
                                  )}
                                </>
                              )}
                            </td>

                            <td className="py-3.5 px-4 relative">
                              {isUpdating ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#059669]" />
                              ) : isInvited ? (
                                <span className="inline-block bg-neutral-100 text-neutral-600 border border-neutral-200/50 text-[9px] font-bold px-2 py-0.5 rounded-full select-none">{member.plan || 'Business'}</span>
                              ) : (
                                <>
                                  <button
                                    onClick={() => setActiveDropdown(isDropdownOpen && activeDropdown?.type === 'plan' ? null : { id: member.id, type: 'plan' })}
                                    className="h-7 px-2 border border-neutral-200 rounded-md bg-white text-neutral-700 hover:bg-neutral-50 flex items-center justify-between gap-1.5 text-[11px] font-semibold transition-colors select-none w-24"
                                  >
                                    <span>{member.plan || 'Business'}</span>
                                    <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                                  </button>

                                  {isDropdownOpen && activeDropdown?.type === 'plan' && (
                                    <>
                                      <div className="fixed inset-0 z-[80]" onClick={() => setActiveDropdown(null)} />
                                      <div className="absolute left-4 top-11 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-[90] min-w-[120px] text-left">
                                        {(['Business', 'Pro', 'Free'] as Plan[]).map((p) => (
                                          <button
                                            key={p}
                                            onClick={() => handleUpdateField(member.id, { plan: p })}
                                            className={cn(
                                              "w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold text-neutral-600 hover:bg-neutral-50 text-left",
                                              (member.plan || 'Business') === p && "text-[#059669] font-bold bg-[#ecfdf5]"
                                            )}
                                          >
                                            <span>{p}</span>
                                            {(member.plan || 'Business') === p && <Check className="w-3.5 h-3.5 text-[#059669]" />}
                                          </button>
                                        ))}
                                      </div>
                                    </>
                                  )}
                                </>
                              )}
                            </td>

                            <td className="py-3.5 px-4">
                              {!isInvited && (
                                <div className="flex items-center gap-1 select-none">
                                  {Array.from({ length: 4 }).map((_, i) => {
                                    const fillCount = member.usage_count || 0;
                                    return (
                                      <span
                                        key={i}
                                        className={cn(
                                          "w-1.5 h-1.5 rounded-full transition-colors",
                                          i < fillCount ? "bg-neutral-400" : "bg-neutral-250"
                                        )}
                                        onClick={() => handleUpdateField(member.id, { usageCount: i + 1 })}
                                      />
                                    );
                                  })}
                                </div>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              {confirmRemoveId === member.id ? (
                                <div className="flex items-center gap-1 justify-end">
                                  <button
                                    onClick={() => handleRemoveMember(member.id)}
                                    disabled={removingId === member.id}
                                    className="w-5 h-5 flex items-center justify-center bg-red-550 hover:bg-red-600 text-white rounded transition-colors"
                                  >
                                    {removingId === member.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                  </button>
                                  <button
                                    onClick={() => setConfirmRemoveId(null)}
                                    className="w-5 h-5 flex items-center justify-center bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded border border-[#e6e5e0] transition-colors"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 transition-opacity">
                                  <Link
                                    href={`/team/member/${member.id}`}
                                    className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#f4f4f3] text-neutral-400 hover:text-[#26251e] transition-colors"
                                  >
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  </Link>
                                  <button
                                    onClick={() => setConfirmRemoveId(member.id)}
                                    className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 text-neutral-400 hover:text-red-600 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Stacked Card View */}
            <div className="md:hidden space-y-3">
              {currentUser && (searchQuery === '' || 
                currentUser.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                currentUser.email.toLowerCase().includes(searchQuery.toLowerCase())) && (
                <div className="bg-white border border-neutral-200/60 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-100 flex items-center justify-center shrink-0 border border-neutral-200">
                      {currentUser.avatar ? (
                        <img src={currentUser.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-extrabold text-xs text-neutral-600">
                          {currentUser.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-neutral-900 truncate">{currentUser.name} (You)</span>
                        <span className="bg-[#ecfdf5] text-[#059669] border border-[#6ee7b7]/60 text-[9px] font-bold px-1.5 py-0.5 rounded">Owner</span>
                      </div>
                      <p className="text-[10px] text-neutral-400 mt-0.5">{currentUser.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-neutral-100 pt-2.5 text-[11px] font-semibold text-neutral-600">
                    <span>Admin</span>
                    <span>Business</span>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="flex flex-col items-center justify-center py-10 bg-white border border-neutral-200/60 rounded-xl">
                  <Loader2 className="w-5 h-5 animate-spin text-[#059669]" />
                  <span className="text-xs font-semibold text-neutral-400 mt-2">Chargement...</span>
                </div>
              ) : sortedMembers.length === 0 ? (
                <div className="py-10 text-center bg-white border border-neutral-200/60 rounded-xl text-xs text-neutral-400 font-medium">
                  Aucun membre trouvé
                </div>
              ) : (
                sortedMembers.map((member) => {
                  const isInvited = member.status === 'pending';
                  const hasAppAccess = !isInvited && !!member.member_user_id;
                  const isOnline = hasAppAccess && onlineUserIds.has(member.member_user_id!);
                  const isUpdating = updatingMemberId === member.id;
                  const memberAvatar = member.profile?.avatar_base64;
                  return (
                    <div key={member.id} className="bg-white border border-neutral-200/60 rounded-xl p-3.5 space-y-3 shadow-2xs">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isInvited ? (
                            <div className="w-8 h-8 rounded-full bg-neutral-50 border border-neutral-200/80 flex items-center justify-center shrink-0">
                              <Mail className="w-3.5 h-3.5 text-neutral-400" />
                            </div>
                          ) : (
                            <div className="relative shrink-0">
                              <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-100 flex items-center justify-center border border-neutral-200">
                                {memberAvatar ? (
                                  <img src={memberAvatar} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <span className="font-extrabold text-xs text-neutral-600">
                                    {(member.profile?.full_name || member.email.split('@')[0]).slice(0, 2).toUpperCase()}
                                  </span>
                                )}
                              </div>
                              {isOnline && (
                                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#059669] border-2 border-white z-10" />
                              )}
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-neutral-900 truncate">
                                {isInvited ? member.email : (member.profile?.full_name || member.email.split('@')[0])}
                              </span>
                              {isInvited ? (
                                <span className="bg-amber-50 text-amber-600 border border-amber-200 text-[8px] font-bold px-1.5 py-0.2 rounded shrink-0">En attente</span>
                              ) : hasAppAccess ? (
                                <span className="bg-[#ecfdf5] text-[#059669] border border-[#6ee7b7]/60 text-[8px] font-bold px-1.5 py-0.2 rounded shrink-0">Accès app</span>
                              ) : (
                                <span className="bg-neutral-100 text-neutral-500 border border-neutral-200/80 text-[8px] font-bold px-1.5 py-0.2 rounded shrink-0">Actif</span>
                              )}
                            </div>
                            <p className="text-[10px] text-neutral-400 truncate mt-0.5">{member.email}</p>
                          </div>
                        </div>

                        {/* Card Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Link
                            href={`/team/member/${member.id}`}
                            className="w-7 h-7 flex items-center justify-center rounded-lg border border-neutral-200 bg-[#fafaf7] text-neutral-500"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                          {confirmRemoveId === member.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleRemoveMember(member.id)}
                                disabled={removingId === member.id}
                                className="w-7 h-7 flex items-center justify-center bg-red-550 text-white rounded-lg"
                              >
                                {removingId === member.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => setConfirmRemoveId(null)}
                                className="w-7 h-7 flex items-center justify-center bg-neutral-100 text-neutral-500 border border-neutral-200 rounded-lg"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmRemoveId(member.id)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg border border-neutral-200 bg-red-50/50 hover:bg-red-50 text-red-500"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Dropdowns details inside card */}
                      <div className="flex items-center gap-2 pt-2.5 border-t border-neutral-100 text-xs">
                        {isUpdating ? (
                          <Loader2 className="w-3 h-3 animate-spin text-[#059669] mx-auto" />
                        ) : (
                          <>
                            {/* Role Select */}
                            <div className="flex-1 flex items-center gap-1 bg-[#fafaf7] px-2 py-1 rounded-lg border border-neutral-200">
                              <span className="text-[9px] text-neutral-400 font-bold uppercase">Rôle:</span>
                              <select
                                value={member.role}
                                disabled={isInvited}
                                onChange={(e) => handleUpdateField(member.id, { role: e.target.value as Role })}
                                className="bg-transparent text-neutral-700 font-bold text-[10px] uppercase tracking-wide focus:outline-none flex-1 border-0"
                              >
                                <option value="editor">Editeur</option>
                                <option value="admin">Admin</option>
                                <option value="viewer">Lecteur</option>
                              </select>
                            </div>

                            {/* Plan Select */}
                            <div className="flex-1 flex items-center gap-1 bg-[#fafaf7] px-2 py-1 rounded-lg border border-neutral-200">
                              <span className="text-[9px] text-neutral-400 font-bold uppercase">Plan:</span>
                              <select
                                value={member.plan || 'Business'}
                                disabled={isInvited}
                                onChange={(e) => handleUpdateField(member.id, { plan: e.target.value as Plan })}
                                className="bg-transparent text-neutral-700 font-bold text-[10px] uppercase tracking-wide focus:outline-none flex-1 border-0"
                              >
                                <option value="Business">Business</option>
                                <option value="Pro">Pro</option>
                                <option value="Free">Free</option>
                              </select>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </>}

        {/* ── Workload Tab ── */}
        {activeTab === 'workload' && activeWorkspace && (
          <WorkloadBoard workspaceId={activeWorkspace.id} />
        )}

        {/* ── Revenue Feed Tab ── */}
        {activeTab === 'revenue' && activeWorkspace && (
          <div className="rounded-xl border border-[#e5e5e0] bg-white p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-[#059669]" />
              <h2 className="text-sm font-black text-[#26251e]">Feed revenus</h2>
            </div>
            <RevenueFeed workspaceId={activeWorkspace.id} />
          </div>
        )}

        {/* ── Roles Tab ── */}
        {activeTab === 'roles' && (
          <div className="space-y-5">
            {/* Default roles reference */}
            <div>
              <h2 className="text-sm font-black text-[#26251e] mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#807d72]" />
                Rôles par défaut
              </h2>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {(['admin', 'editor', 'viewer'] as const).map(role => {
                  const colors: Record<string, string> = { admin: '#059669', editor: '#059669', viewer: '#6366f1' };
                  const icons: Record<string, React.ReactNode> = { admin: <Shield className="h-4 w-4" />, editor: <Star className="h-4 w-4" />, viewer: <Eye className="h-4 w-4" /> };
                  const perms = DEFAULT_ROLE_PERMISSIONS[role] || [];
                  const c = colors[role];
                  return (
                    <div key={role} className="border border-[#e5e5e0] rounded-xl p-4 bg-white space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${c}15`, color: c }}>
                          {icons[role]}
                        </div>
                        <div>
                          <p className="text-xs font-black text-[#26251e] capitalize">{role === 'viewer' ? 'Observateur' : role === 'editor' ? 'Éditeur' : 'Administrateur'}</p>
                          <p className="text-[10px] text-[#807d72]">{perms.length} modules</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {perms.slice(0, 6).map(m => (
                          <span key={m} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border" style={{ background: `${c}10`, borderColor: `${c}25`, color: c }}>
                            {PERMISSION_MODULES[m]?.icon} {PERMISSION_MODULES[m]?.label ?? m}
                          </span>
                        ))}
                        {perms.length > 6 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-[#e5e5e0] text-[#807d72]">
                            +{perms.length - 6}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom roles */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-black text-[#26251e] flex items-center gap-2">
                  <Palette className="h-4 w-4 text-[#807d72]" />
                  Rôles personnalisés
                  {customRoles.length > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-[#059669]/10 text-[#059669] rounded-full">{customRoles.length}</span>
                  )}
                </h2>
                <Link
                  href="/team/roles/new"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#26251e] text-white text-xs font-bold hover:bg-[#3d3c35] transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nouveau rôle
                </Link>
              </div>

              {customRoles.length === 0 ? (
                <div className="border border-dashed border-[#e5e5e0] rounded-xl p-8 text-center space-y-2">
                  <Shield className="h-8 w-8 text-[#d4d4d0] mx-auto" />
                  <p className="text-sm font-bold text-[#807d72]">Aucun rôle personnalisé</p>
                  <p className="text-xs text-[#b0b0a8]">Créez des rôles sur mesure avec des permissions spécifiques par module.</p>
                  <Link
                    href="/team/roles/new"
                    className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#26251e] text-white text-xs font-bold hover:bg-[#3d3c35] transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Créer un rôle
                  </Link>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {customRoles.map(role => (
                    <div key={role.id} className="border border-[#e5e5e0] rounded-xl p-4 bg-white flex items-start gap-4">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white font-black text-base" style={{ background: role.color }}>
                        {role.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <p className="text-sm font-black text-[#26251e]">{role.name}</p>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: role.color }}>
                            {role.permissions.length} modules
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {role.permissions.slice(0, 8).map(m => (
                            <span key={m} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-[#e5e5e0] text-[#807d72] bg-[#f9f9f8]">
                              {PERMISSION_MODULES[m]?.icon} {PERMISSION_MODULES[m]?.label ?? m}
                            </span>
                          ))}
                          {role.permissions.length > 8 && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-[#e5e5e0] text-[#807d72]">+{role.permissions.length - 8}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Link
                          href={`/team/roles/${role.id}/edit`}
                          className="p-2 rounded-lg border border-[#e5e5e0] hover:bg-[#f4f4f3] transition-colors text-[#807d72] inline-flex items-center"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          onClick={() => handleDeleteRole(role.id)}
                          className="p-2 rounded-lg border border-red-100 hover:bg-red-50 transition-colors text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ── Create Group Modal Overlay ── */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm bg-white border border-neutral-200 rounded-xl p-5 space-y-4 shadow-xl animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-neutral-900">Nouveau groupe</h3>
                <p className="text-[11px] text-neutral-400 font-medium">Nommez le groupe et choisissez ses membres.</p>
              </div>
              <button onClick={() => { setShowCreateGroupModal(false); setNewGroupName(''); setNewGroupMemberIds(new Set()); }} className="text-neutral-400 hover:text-neutral-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              placeholder="Nom du groupe (ex: Équipe terrain Montréal)"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              autoFocus
              className="w-full text-xs px-3.5 py-2 border border-[#e5e5e0] rounded-lg focus:outline-none focus:ring-1 focus:ring-primary bg-[#fafaf8] text-[#26251e]"
            />
            <div className="max-h-48 overflow-y-auto space-y-1 border border-[#e5e5e0] rounded-lg p-2">
              {members.length === 0 ? (
                <p className="text-[10px] text-[#7a7a76] px-1 py-2">Aucun membre disponible.</p>
              ) : (
                members.map((m) => {
                  const checked = newGroupMemberIds.has(m.id);
                  return (
                    <label key={m.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[#f4f4f3] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setNewGroupMemberIds((prev) => {
                            const next = new Set(prev);
                            if (checked) next.delete(m.id); else next.add(m.id);
                            return next;
                          });
                        }}
                        className="rounded"
                      />
                      <span className="text-xs text-[#26251e]">{m.profile?.full_name || m.email.split('@')[0]}</span>
                      <span className="text-[10px] text-[#7a7a76] ml-auto">{m.email}</span>
                    </label>
                  );
                })
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowCreateGroupModal(false); setNewGroupName(''); setNewGroupMemberIds(new Set()); }}
                className="px-3 py-2 text-xs border border-[#e5e5e0] rounded-lg hover:bg-[#f4f4f3] transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim() || savingGroup}
                className="px-4 py-2 bg-[#059669] text-white text-xs font-bold rounded-lg hover:bg-[#059669]/90 transition-colors disabled:opacity-50"
              >
                {savingGroup ? 'Création...' : 'Créer le groupe'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Invite User Modal Overlay ── */}
      {showInviteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xs animate-fade-in px-4">
          <div className="w-full max-w-sm bg-white border border-neutral-200 rounded-2xl p-4 space-y-3.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-left">
            
            {/* Header: compact with share icon on the left and app branding on the right */}
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setShowLinkModal(true);
                    setGeneratedLink(null);
                    setLinkCopied(false);
                  }}
                  className="p-1.5 rounded-lg bg-neutral-50 hover:bg-neutral-100 text-[#059669] transition-colors"
                  title="Partager un lien d'invitation"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-bold text-neutral-800">Inviter</span>
              </div>
              
              <div className="flex items-center gap-1.5">
                {/* Minerva Logo icon SVG */}
                <div className="flex items-center gap-1 text-[10px] font-black text-neutral-900 tracking-tighter">
                  <span className="text-[#059669]">●</span> Minerva
                </div>
                <button 
                  type="button" 
                  onClick={() => setShowInviteModal(false)}
                  className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors text-neutral-400"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-3">
              {/* Email Input */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">Adresse e-mail</label>
                <input
                  type="email"
                  required
                  placeholder="collaborateur@entreprise.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full h-8 text-xs px-3 border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#059669] bg-white placeholder:text-neutral-400"
                />
              </div>

              {/* Role + Plan selector on a single line (compact select tags) */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">Rôle</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as Role)}
                    className="w-full h-8 text-xs px-2 border border-neutral-200 rounded-md bg-white text-neutral-700 focus:outline-none focus:ring-1 focus:ring-[#059669] font-medium"
                  >
                    <option value="editor">Éditeur</option>
                    <option value="admin">Admin</option>
                    <option value="viewer">Lecteur</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">Forfait</label>
                  <select
                    value={invitePlan}
                    onChange={(e) => setInvitePlan(e.target.value as Plan)}
                    className="w-full h-8 text-xs px-2 border border-neutral-200 rounded-md bg-white text-neutral-700 focus:outline-none focus:ring-1 focus:ring-[#059669] font-medium"
                  >
                    <option value="Business">Business</option>
                    <option value="Pro">Pro</option>
                    <option value="Free">Free</option>
                  </select>
                </div>
              </div>

              {/* Error Message */}
              {inviteError && (
                <p className="text-[10px] font-semibold text-red-600 bg-red-50 border border-red-100 rounded-md p-2">
                  {inviteError}
                </p>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 text-xs pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="h-8 rounded-md border border-neutral-200 bg-white hover:bg-neutral-50 px-3 text-xs font-semibold text-neutral-500 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSending || !inviteEmail}
                  className="h-8 bg-[#059669] hover:bg-[#047857] disabled:bg-neutral-100 disabled:text-neutral-400 text-white text-xs font-semibold rounded-md px-4 flex items-center justify-center gap-1.5 transition-colors"
                >
                  {isSending && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Envoyer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Link-based Invite Modal ── */}
      {showLinkModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm bg-white border border-neutral-200 rounded-xl p-5 space-y-4 shadow-xl text-left">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-[#059669]" />
                  Lien d'invitation
                </h3>
                <p className="text-[11px] text-neutral-400 font-medium">
                  Générez un lien à partager — aucun email requis.
                </p>
              </div>
              <button onClick={() => setShowLinkModal(false)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors text-neutral-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Role select */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Rôle</label>
              <select
                value={linkRole}
                onChange={e => setLinkRole(e.target.value as Role)}
                className="w-full h-8 text-xs border border-neutral-200 rounded-lg px-2 bg-white outline-none focus:ring-1 focus:ring-[#059669]"
              >
                <option value="viewer">Observateur</option>
                <option value="editor">Éditeur</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>

            {/* Generated link */}
            {generatedLink && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Lien à partager</label>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={generatedLink}
                    className="flex-1 h-8 text-[10px] border border-neutral-200 rounded-lg px-2 bg-neutral-50 font-mono outline-none"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${linkCopied ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'}`}
                  >
                    {linkCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {linkCopied ? 'Copié' : 'Copier'}
                  </button>
                </div>
                <p className="text-[10px] text-neutral-400">Ce lien est valide une seule fois.</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setShowLinkModal(false)} className="h-8 px-4 text-xs font-semibold rounded-md border border-neutral-200 hover:bg-neutral-50 transition-colors">
                Fermer
              </button>
              <button
                onClick={handleGenerateLink}
                disabled={generatingLink}
                className="h-8 px-4 text-xs font-bold rounded-md bg-[#059669] hover:bg-[#047857] text-white flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {generatingLink && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {generatedLink ? 'Nouveau lien' : 'Générer le lien'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Leave Team Confirm Modal ── */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white border border-[#e5e5e0] rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 border border-red-200 rounded-xl flex items-center justify-center">
                <LogOut className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#26251e]">Quitter l&apos;équipe ?</h3>
                <p className="text-[11px] text-[#807d72]">Vous perdrez l&apos;accès au workspace immédiatement.</p>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 py-2.5 text-xs font-bold border border-[#e5e5e0] rounded-xl hover:bg-[#f4f4f3] transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleLeaveTeam}
                disabled={leavingTeam}
                className="flex-1 py-2.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {leavingTeam ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
