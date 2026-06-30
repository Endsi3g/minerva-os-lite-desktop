'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Shield, Star, Eye, Check, Loader2, AlertCircle,
  Users, Search, BarChart3, Inbox, Megaphone, Mail, LineChart,
  Bot, Brain, Map, Wrench, Tag, BookOpen, ListChecks, ShieldCheck,
  CreditCard, Plug, Compass,
} from 'lucide-react';
import { getApiUrl } from '@/lib/api-helper';
import { DEFAULT_ROLE_PERMISSIONS, PERMISSION_MODULES, type PermissionModule } from '@/lib/permissions';
import { cn } from '@/lib/utils';

interface Member {
  id: string;
  email: string;
  role: string;
  status: string;
  isOwner?: boolean;
  profile?: { full_name?: string; company_name?: string; avatar_base64?: string | null } | null;
}

// Default role catalogue — DESIGN.md accent colours, lucide icons (no emoji).
const DEFAULT_ROLE_CONFIG = [
  { key: 'admin',  label: 'Administrateur', icon: Shield, color: '#059669', desc: 'Accès complet sauf facturation et configuration avancée.' },
  { key: 'editor', label: 'Éditeur',        icon: Star,   color: '#059669', desc: 'Leads, pipeline, campagnes, IA et carte terrain.' },
  { key: 'viewer', label: 'Observateur',    icon: Eye,    color: '#6366f1', desc: 'Lecture seule — leads, pipeline et carte.' },
] as const;

// Lucide icon per permission module (replaces emoji from lib for a premium look).
const MODULE_ICONS: Record<PermissionModule, React.ComponentType<{ className?: string }>> = {
  leads: Users, prospecting: Search, pipeline: BarChart3, inbox: Inbox,
  campaigns: Megaphone, sequences: Mail, analytics: LineChart, team: Users,
  settings: Wrench, agents: Bot, assistant: Brain, map: Map, billing: CreditCard,
  integrations: Plug, services: Tag, library: BookOpen, roadmap: Compass,
  tasks: ListChecks, audit: ShieldCheck,
};

export default function MemberRolePage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.id as string;

  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [selectedRole, setSelectedRole] = useState('editor');

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

  useEffect(() => { fetchData(); }, [fetchData]);

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
        setTimeout(() => { setSaved(false); router.push('/team'); }, 1200);
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

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#fafaf8]">
        <Loader2 className="h-6 w-6 animate-spin text-[#7a7a76]" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf8] text-[#26251e] font-sans">
      <div className="max-w-2xl mx-auto px-6 sm:px-8 py-10 space-y-7">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg border border-[#e5e5e0] bg-white hover:bg-[#f4f4f3] transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-[#26251e]" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#26251e]">Gérer le rôle</h1>
            <p className="text-xs text-[#7a7a76] mt-0.5">Définissez les accès de ce membre dans l&apos;espace de travail.</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-semibold">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Member identity card */}
        {member && (
          <div className="border border-[#e5e5e0] rounded-xl p-4 bg-white flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full overflow-hidden border border-[#e5e5e0] bg-[#e5e5e2] flex items-center justify-center shrink-0">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-base font-bold text-[#807d72]">{displayName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#26251e] truncate">{displayName}</p>
              <p className="text-[11px] text-[#7a7a76] truncate">{member.email}</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {member.isOwner && (
                <span className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border bg-[#059669]/8 text-[#059669] border-[#059669]/20">
                  Propriétaire
                </span>
              )}
              <span className={cn(
                'text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border',
                member.status === 'active'
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  : 'bg-[#f4f4f3] text-[#7a7a76] border-[#e5e5e0]'
              )}>
                {member.status === 'active' ? 'Actif' : 'En attente'}
              </span>
            </div>
          </div>
        )}

        {/* Role selection */}
        <div className="space-y-3">
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
        </div>

        {/* Permission preview */}
        {effectivePerms.length > 0 && (
          <div className="border border-[#e5e5e0] rounded-xl p-5 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
                Accès accordés
              </div>
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

        {/* Actions */}
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
            {member?.isOwner ? 'Propriétaire (non modifiable)' : saved ? 'Enregistré' : 'Enregistrer le rôle'}
          </button>
        </div>
      </div>
    </div>
  );
}
