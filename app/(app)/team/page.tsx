'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  UserPlus, Users, Mail, Shield, Eye, Edit3, Trash2,
  Loader2, Check, X, Crown, RefreshCcw, ChevronDown,
  Copy, AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

// ── Types ────────────────────────────────────────────────────────────────────
type Role = 'admin' | 'editor' | 'viewer';
type Status = 'active' | 'pending';

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
  profile?: { full_name: string | null; company_name: string | null } | null;
}

// ── Role config ───────────────────────────────────────────────────────────────
const ROLE_CONFIG: Record<Role, { label: string; description: string; color: string; icon: React.ReactNode }> = {
  admin: {
    label: 'Admin',
    description: 'Peut inviter des membres et gérer les campagnes',
    color: 'text-purple-700 bg-purple-50 border-purple-200',
    icon: <Shield className="w-3 h-3" />,
  },
  editor: {
    label: 'Éditeur',
    description: 'Peut créer et modifier les leads et campagnes',
    color: 'text-blue-700 bg-blue-50 border-blue-200',
    icon: <Edit3 className="w-3 h-3" />,
  },
  viewer: {
    label: 'Lecteur',
    description: 'Peut consulter uniquement, sans modification',
    color: 'text-[#555552] bg-neutral-100 border-neutral-200',
    icon: <Eye className="w-3 h-3" />,
  },
};

// ── Avatar initials ───────────────────────────────────────────────────────────
function Avatar({ name, email, size = 'md' }: { name?: string | null; email: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name
    ? name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : email.slice(0, 2).toUpperCase();
  const colors = [
    'bg-purple-100 text-purple-700',
    'bg-blue-100 text-blue-700',
    'bg-emerald-100 text-emerald-700',
    'bg-orange-100 text-orange-700',
    'bg-rose-100 text-rose-700',
  ];
  const color = colors[email.charCodeAt(0) % colors.length];
  const sizeClass = size === 'sm' ? 'w-7 h-7 text-[9px]' : size === 'lg' ? 'w-12 h-12 text-base' : 'w-9 h-9 text-xs';

  return (
    <div className={cn('rounded-full flex items-center justify-center font-bold shrink-0 border border-white', sizeClass, color)}>
      {initials}
    </div>
  );
}

// ── Role Badge ────────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: Role }) {
  const cfg = ROLE_CONFIG[role];
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border', cfg.color)}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userFullName, setUserFullName] = useState<string>('');

  // Invite form
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('editor');
  const [isSending, setIsSending] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState(false);

  // Role change
  const [changingRole, setChangingRole] = useState<string | null>(null);

  // Remove
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/team/members');
    if (res.ok) {
      const data = await res.json();
      setMembers(data.members || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        setUserEmail(user.email || '');
        const { data: settings } = await supabase
          .from('settings')
          .select('full_name, company_name')
          .eq('user_id', user.id)
          .maybeSingle();
        setUserFullName(settings?.full_name || user.email?.split('@')[0] || 'Vous');
      }
      await fetchMembers();
    };
    init();
  }, [fetchMembers]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setIsSending(true);
    setInviteError('');

    const res = await fetch('/api/team/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
    });

    const data = await res.json();
    setIsSending(false);

    if (!res.ok) {
      setInviteError(data.error || 'Erreur lors de l\'envoi');
      return;
    }

    setInviteSuccess(true);
    setInviteEmail('');
    await fetchMembers();
    setTimeout(() => {
      setInviteSuccess(false);
      setShowInvitePanel(false);
    }, 2000);
  };

  const handleChangeRole = async (memberId: string, newRole: Role) => {
    setChangingRole(memberId);
    const res = await fetch('/api/team/role', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, role: newRole }),
    });
    if (res.ok) {
      setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, role: newRole } : m));
    }
    setChangingRole(null);
  };

  const handleRemove = async (memberId: string) => {
    setRemovingId(memberId);
    const res = await fetch(`/api/team/members?id=${memberId}`, { method: 'DELETE' });
    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    }
    setRemovingId(null);
    setConfirmRemove(null);
  };

  const activeMembers = members.filter((m) => m.status === 'active');
  const pendingMembers = members.filter((m) => m.status === 'pending');
  const totalSeats = members.length + 1; // +1 for owner

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-[#26251e] tracking-tight">Équipe</h1>
            <p className="text-sm text-[#807d72] font-medium">
              Gérez les membres de votre espace de travail Minerva.
            </p>
          </div>
          <button
            onClick={() => { setShowInvitePanel(true); setInviteSuccess(false); setInviteError(''); }}
            className="flex items-center gap-2 bg-[#26251e] hover:bg-[#1a1a19] text-white rounded-full px-5 py-2 text-xs font-bold transition-colors shadow-sm shrink-0"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Inviter un membre
          </button>
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Membres actifs', value: activeMembers.length + 1, icon: <Users className="w-4 h-4 text-[#10b981]" />, suffix: `/ ${totalSeats} total` },
            { label: 'Invitations en attente', value: pendingMembers.length, icon: <Mail className="w-4 h-4 text-orange-500" />, suffix: '' },
            { label: 'Rôles disponibles', value: '3', icon: <Shield className="w-4 h-4 text-purple-500" />, suffix: 'Admin · Éditeur · Lecteur' },
          ].map((stat) => (
            <div key={stat.label} className="border border-[#e6e5e0] rounded-2xl p-4 bg-[#f9f9f7] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#807d72]">{stat.label}</span>
                {stat.icon}
              </div>
              <div>
                <span className="text-2xl font-bold text-[#26251e]">{stat.value}</span>
                {stat.suffix && <span className="text-[10px] text-[#807d72] font-semibold ml-1.5">{stat.suffix}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* ── Invite form panel ── */}
        {showInvitePanel && (
          <div className="border-2 border-[#10b981]/30 rounded-2xl p-6 bg-[#10b981]/5 space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#26251e] flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#10b981]" />
                Inviter un nouveau membre
              </h3>
              <button onClick={() => setShowInvitePanel(false)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-black/10 transition-colors">
                <X className="w-4 h-4 text-[#807d72]" />
              </button>
            </div>

            {inviteSuccess ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2 text-[#10b981] animate-in fade-in duration-300">
                <div className="w-12 h-12 rounded-full bg-[#10b981]/10 border border-[#10b981]/20 flex items-center justify-center">
                  <Check className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold">Invitation envoyée !</p>
                <p className="text-xs text-[#807d72] font-medium">L&apos;email a été envoyé avec succès.</p>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#807d72]">Adresse e-mail</label>
                    <input
                      type="email"
                      required
                      placeholder="collaborateur@agence.com"
                      value={inviteEmail}
                      onChange={(e) => { setInviteEmail(e.target.value); setInviteError(''); }}
                      className="w-full text-xs font-semibold px-4 py-2.5 bg-white border border-[#e6e5e0] focus:border-[#10b981] rounded-full outline-none transition-colors shadow-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#807d72]">Rôle d&apos;accès</label>
                    <div className="flex gap-2">
                      {(['admin', 'editor', 'viewer'] as Role[]).map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setInviteRole(role)}
                          className={cn(
                            'flex-1 py-2 text-[10px] font-bold rounded-full border transition-all',
                            inviteRole === role
                              ? 'bg-[#26251e] text-white border-[#26251e]'
                              : 'bg-white text-[#555552] border-[#e6e5e0] hover:bg-neutral-50',
                          )}
                        >
                          {ROLE_CONFIG[role].label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-[#807d72] font-medium leading-relaxed">{ROLE_CONFIG[inviteRole].description}</p>
                  </div>
                </div>

                {inviteError && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs font-semibold animate-in fade-in duration-200">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {inviteError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#e6e5e0]/60">
                  <button type="button" onClick={() => setShowInvitePanel(false)} className="rounded-full border border-[#e6e5e0] bg-white hover:bg-neutral-50 px-5 py-2 text-xs font-bold text-[#555552] transition-colors">
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSending || !inviteEmail.trim()}
                    className="rounded-full bg-[#26251e] hover:bg-[#1a1a19] disabled:bg-neutral-200 disabled:text-neutral-400 text-white px-5 py-2 text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    {isSending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Envoi...</> : <><UserPlus className="w-3.5 h-3.5" /> Envoyer l&apos;invitation</>}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ── Members Table ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#26251e]">Membres du workspace</h2>
            <button onClick={fetchMembers} className="flex items-center gap-1.5 text-[10px] font-bold text-[#807d72] hover:text-[#26251e] transition-colors">
              <RefreshCcw className="w-3 h-3" />
              Actualiser
            </button>
          </div>

          <div className="border border-[#e6e5e0] rounded-2xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[2fr_2fr_1fr_1fr_auto] gap-4 px-5 py-3 bg-[#f9f9f7] border-b border-[#e6e5e0] text-[10px] font-bold uppercase tracking-wider text-[#807d72]">
              <span>Membre</span>
              <span>Email</span>
              <span>Rôle</span>
              <span>Statut</span>
              <span className="w-16">Actions</span>
            </div>

            {/* Owner row (always first) */}
            <div className="grid grid-cols-[2fr_2fr_1fr_1fr_auto] gap-4 px-5 py-3.5 items-center border-b border-[#e6e5e0]/60 bg-white hover:bg-[#f9f9f7] transition-colors">
              <div className="flex items-center gap-3">
                <Avatar name={userFullName} email={userEmail} />
                <div>
                  <p className="text-xs font-bold text-[#26251e]">{userFullName}</p>
                  <p className="text-[10px] text-[#807d72]">Vous</p>
                </div>
              </div>
              <span className="text-xs text-[#555552] font-medium truncate">{userEmail}</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <Crown className="w-3 h-3" />
                Propriétaire
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#10b981]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                Actif
              </span>
              <div className="w-16" />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-[#807d72]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs font-medium">Chargement...</span>
              </div>
            ) : members.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-[#807d72]">
                <Users className="w-8 h-8 opacity-30" />
                <div className="text-center">
                  <p className="text-sm font-bold text-[#26251e]">Aucun membre pour l&apos;instant</p>
                  <p className="text-xs text-[#807d72] mt-1">Invitez des collaborateurs pour commencer à travailler ensemble.</p>
                </div>
                <button
                  onClick={() => setShowInvitePanel(true)}
                  className="rounded-full border border-[#e6e5e0] hover:bg-neutral-50 px-5 py-2 text-xs font-bold text-[#26251e] transition-colors"
                >
                  Inviter le premier membre
                </button>
              </div>
            ) : (
              members.map((member, idx) => (
                <div
                  key={member.id}
                  className={cn(
                    'grid grid-cols-[2fr_2fr_1fr_1fr_auto] gap-4 px-5 py-3.5 items-center hover:bg-[#f9f9f7] transition-colors',
                    idx < members.length - 1 && 'border-b border-[#e6e5e0]/60',
                  )}
                >
                  {/* Avatar + Name */}
                  <div className="flex items-center gap-3">
                    <Avatar name={member.profile?.full_name} email={member.email} />
                    <div>
                      <p className="text-xs font-bold text-[#26251e]">{member.profile?.full_name || '—'}</p>
                      {member.profile?.company_name && (
                        <p className="text-[10px] text-[#807d72] truncate">{member.profile.company_name}</p>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-center gap-1.5 group min-w-0">
                    <span className="text-xs text-[#555552] font-medium truncate">{member.email}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(member.email)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Copier"
                    >
                      <Copy className="w-3 h-3 text-[#807d72]" />
                    </button>
                  </div>

                  {/* Role dropdown (owner only can change) */}
                  <div className="relative">
                    {changingRole === member.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#807d72]" />
                    ) : (
                      <div className="group relative inline-block">
                        <button
                          className="flex items-center gap-1 group/btn"
                          title="Changer le rôle (propriétaire uniquement)"
                        >
                          <RoleBadge role={member.role} />
                          <ChevronDown className="w-3 h-3 text-[#807d72] opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                        </button>
                        <div className="absolute left-0 top-full mt-1 z-10 bg-white border border-[#e6e5e0] rounded-xl shadow-lg py-1 min-w-[140px] hidden group-hover:block">
                          {(['admin', 'editor', 'viewer'] as Role[]).map((r) => (
                            <button
                              key={r}
                              onClick={() => handleChangeRole(member.id, r)}
                              className={cn(
                                'w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold hover:bg-neutral-50 transition-colors text-left',
                                r === member.role && 'text-[#10b981]',
                              )}
                            >
                              {ROLE_CONFIG[r].icon}
                              {ROLE_CONFIG[r].label}
                              {r === member.role && <Check className="w-3 h-3 ml-auto text-[#10b981]" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Status */}
                  <div>
                    {member.status === 'active' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#10b981]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                        Actif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                        En attente
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="w-16 flex items-center justify-end gap-1">
                    {confirmRemove === member.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleRemove(member.id)}
                          disabled={!!removingId}
                          className="w-6 h-6 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
                          title="Confirmer le retrait"
                        >
                          {removingId === member.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={() => setConfirmRemove(null)}
                          className="w-6 h-6 flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 text-[#555552] transition-colors"
                          title="Annuler"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmRemove(member.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-full text-[#807d72] hover:bg-red-50 hover:text-red-500 transition-colors"
                        title="Retirer ce membre"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Role legend ── */}
        <div className="border border-[#e6e5e0] rounded-2xl p-5 bg-[#f9f9f7] space-y-3">
          <h3 className="text-xs font-bold text-[#26251e]">Permissions par rôle</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(['admin', 'editor', 'viewer'] as Role[]).map((role) => {
              const cfg = ROLE_CONFIG[role];
              const perms: Record<Role, string[]> = {
                admin: ['Inviter des membres', 'Créer & modifier leads', 'Gérer les campagnes', 'Accéder aux settings', 'Voir les analytics'],
                editor: ['Créer & modifier leads', 'Gérer les campagnes', 'Générer des brouillons IA', 'Voir les analytics'],
                viewer: ['Consulter les leads', 'Consulter les campagnes', 'Lire les analytics'],
              };
              return (
                <div key={role} className={cn('rounded-xl p-4 border space-y-2.5', cfg.color)}>
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    {cfg.icon}
                    {cfg.label}
                  </div>
                  <ul className="space-y-1">
                    {perms[role].map((p) => (
                      <li key={p} className="flex items-center gap-1.5 text-[10px] font-medium">
                        <Check className="w-3 h-3 shrink-0" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── ENV hint ── */}
        <div className="flex items-start gap-3 p-4 border border-amber-200 bg-amber-50 rounded-xl text-xs text-amber-800">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Configuration requise</p>
            <p className="font-medium leading-relaxed">
              Pour envoyer de vraies invitations email, ajoutez <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">SUPABASE_SERVICE_ROLE_KEY</code> dans votre fichier <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">.env.local</code>.{' '}
              <Link href="https://supabase.com/dashboard/project/_/settings/api" target="_blank" className="underline font-bold hover:text-amber-900">
                Trouver la clé →
              </Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
