'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Shield, Star, Eye, Check, Loader2, AlertCircle, Pencil, Trash2, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getApiUrl } from '@/lib/api-helper';
import { PERMISSION_MODULES, DEFAULT_ROLE_PERMISSIONS, ALL_MODULES, type PermissionModule } from '@/lib/permissions';
import { cn } from '@/lib/utils';

interface CustomRole {
  id: string;
  name: string;
  color: string;
  permissions: PermissionModule[];
}

interface Member {
  id: string;
  email: string;
  role: string;
  status: string;
  profile?: { full_name?: string; company_name?: string } | null;
}

const DEFAULT_ROLE_CONFIG = [
  { key: 'admin',  label: 'Administrateur', icon: <Shield className="h-4 w-4" />, color: '#f54e00', desc: 'Accès complet sauf facturation.' },
  { key: 'editor', label: 'Éditeur',         icon: <Star  className="h-4 w-4" />, color: '#059669', desc: 'Leads, pipeline, IA, terrain.' },
  { key: 'viewer', label: 'Observateur',     icon: <Eye   className="h-4 w-4" />, color: '#6366f1', desc: 'Lecture seule.' },
];

export default function MemberRolePage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.id as string;

  const [member, setMember] = useState<Member | null>(null);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [selectedRole, setSelectedRole] = useState('editor');
  const [selectedCustomRoleId, setSelectedCustomRoleId] = useState<string | null>(null);

  // New custom role creation inline
  const [showNewRole, setShowNewRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('#6366f1');
  const [newRolePerms, setNewRolePerms] = useState<Set<PermissionModule>>(new Set());
  const [creatingRole, setCreatingRole] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch members list and find this member
      const [membersRes, rolesRes] = await Promise.all([
        fetch(getApiUrl('/api/team/members')),
        fetch(getApiUrl('/api/team/roles')),
      ]);

      const membersData = await membersRes.json();
      const rolesData = await rolesRes.json();

      const found = (membersData.members || []).find((m: Member) => m.id === memberId);
      if (!found) { setError('Membre introuvable.'); setLoading(false); return; }

      setMember(found);
      setSelectedRole(found.role || 'editor');
      setCustomRoles(rolesData.roles || []);
    } catch { setError('Erreur de chargement.'); }
    finally { setLoading(false); }
  }, [memberId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(getApiUrl('/api/team/members'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          role: selectedRole,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => { setSaved(false); router.push('/team'); }, 1500);
      } else {
        const d = await res.json();
        setError(d.error || 'Erreur lors de la sauvegarde.');
      }
    } catch { setError('Erreur réseau.'); }
    finally { setSaving(false); }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;
    setCreatingRole(true);
    try {
      const res = await fetch(getApiUrl('/api/team/roles'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRoleName.trim(), color: newRoleColor, permissions: Array.from(newRolePerms) }),
      });
      if (res.ok) {
        const data = await res.json();
        setCustomRoles(prev => [...prev, data.role]);
        setSelectedCustomRoleId(data.role.id);
        setSelectedRole('custom');
        setShowNewRole(false);
        setNewRoleName('');
        setNewRolePerms(new Set());
      }
    } catch { }
    finally { setCreatingRole(false); }
  };

  const effectivePerms = selectedCustomRoleId
    ? (customRoles.find(r => r.id === selectedCustomRoleId)?.permissions ?? [])
    : (DEFAULT_ROLE_PERMISSIONS[selectedRole] ?? []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#7a7a76]" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-white text-[#26251e] font-sans">
      <div className="max-w-2xl mx-auto px-8 py-10 space-y-8">

        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 rounded-xl border border-[#e5e5e0] hover:bg-[#f4f4f3] transition-colors">
            <ArrowLeft className="h-4 w-4 text-[#26251e]" />
          </button>
          <div>
            <h1 className="text-xl font-black text-[#26251e]">Gérer le rôle</h1>
            <p className="text-xs text-[#7a7a76] mt-0.5">
              {member?.profile?.full_name || member?.email}
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Member info card */}
        {member && (
          <div className="border border-[#e5e5e0] rounded-xl p-4 bg-[#fafaf8] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#f4f4f3] border border-[#e5e5e0] flex items-center justify-center font-black text-[#26251e]">
              {(member.profile?.full_name || member.email).charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-black text-[#26251e]">{member.profile?.full_name || member.email}</p>
              <p className="text-[11px] text-[#7a7a76]">{member.email}</p>
            </div>
            <div className="ml-auto">
              <span className={cn(
                'text-[10px] font-bold px-2 py-1 rounded-full border',
                member.status === 'active' ? 'bg-[#ecfdf5] text-[#065f46] border-[#6ee7b7]/60' : 'bg-[#f4f4f3] text-[#7a7a76] border-[#e5e5e0]'
              )}>
                {member.status === 'active' ? 'Actif' : 'En attente'}
              </span>
            </div>
          </div>
        )}

        {/* Default roles */}
        <div className="space-y-3">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Rôles prédéfinis</h2>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {DEFAULT_ROLE_CONFIG.map(role => {
              const isSelected = !selectedCustomRoleId && selectedRole === role.key;
              return (
                <button
                  key={role.key}
                  onClick={() => { setSelectedRole(role.key); setSelectedCustomRoleId(null); }}
                  className={cn(
                    'text-left p-4 rounded-xl border-2 transition-all space-y-2',
                    isSelected ? 'border-[#26251e] bg-[#26251e]/5' : 'border-[#e5e5e0] hover:border-[#c5c5c0]'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${role.color}15`, color: role.color }}>
                      {role.icon}
                    </div>
                    <p className="text-xs font-black text-[#26251e]">{role.label}</p>
                    {isSelected && <Check className="h-3.5 w-3.5 ml-auto" style={{ color: role.color }} />}
                  </div>
                  <p className="text-[10px] text-[#7a7a76] leading-tight">{role.desc}</p>
                  <p className="text-[9px] font-bold text-[#b0b0a8]">
                    {DEFAULT_ROLE_PERMISSIONS[role.key]?.length ?? 0} modules
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom roles */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Rôles personnalisés</h2>
            <button
              onClick={() => setShowNewRole(!showNewRole)}
              className="flex items-center gap-1.5 text-[10px] font-bold text-[#f54e00] hover:underline"
            >
              <Plus className="h-3 w-3" />
              Créer un rôle
            </button>
          </div>

          {/* Inline role creator */}
          {showNewRole && (
            <div className="border border-[#e5e5e0] rounded-xl p-4 space-y-4 bg-[#fafaf8]">
              <div className="flex gap-3">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Nom</label>
                  <input
                    value={newRoleName}
                    onChange={e => setNewRoleName(e.target.value)}
                    placeholder="ex : Commercial terrain"
                    className="w-full h-8 border border-[#e5e5e0] rounded-lg px-3 text-xs font-semibold outline-none focus:ring-1 focus:ring-[#f54e00]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Couleur</label>
                  <input type="color" value={newRoleColor} onChange={e => setNewRoleColor(e.target.value)} className="h-8 w-12 rounded-lg border border-[#e5e5e0] cursor-pointer" />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Modules ({newRolePerms.size})</p>
                  <button onClick={() => setNewRolePerms(new Set(ALL_MODULES))} className="text-[10px] text-[#059669] font-bold hover:underline">Tout</button>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {ALL_MODULES.map(mod => {
                    const cfg = PERMISSION_MODULES[mod];
                    const on = newRolePerms.has(mod);
                    return (
                      <button
                        key={mod}
                        onClick={() => {
                          const next = new Set(newRolePerms);
                          on ? next.delete(mod) : next.add(mod);
                          setNewRolePerms(next);
                        }}
                        className={cn('flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[9px] font-bold text-left transition-all', on ? 'border-[#26251e] bg-[#26251e]/5 text-[#26251e]' : 'border-[#e5e5e0] text-[#807d72]')}
                      >
                        <div className={cn('w-3 h-3 rounded flex items-center justify-center shrink-0', on ? 'bg-[#26251e]' : 'bg-[#e5e5e0]')}>
                          {on && <Check className="h-2 w-2 text-white" />}
                        </div>
                        {cfg?.icon} {cfg?.label ?? mod}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowNewRole(false)} className="flex-1 py-2 text-xs font-bold border border-[#e5e5e0] rounded-lg hover:bg-[#f4f4f3]">Annuler</button>
                <button onClick={handleCreateRole} disabled={creatingRole || !newRoleName.trim()} className="flex-1 py-2 text-xs font-bold text-white rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-60 transition-all" style={{ background: newRoleColor }}>
                  {creatingRole ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Créer & assigner
                </button>
              </div>
            </div>
          )}

          {customRoles.length === 0 && !showNewRole && (
            <p className="text-xs text-[#b0b0a8] italic">Aucun rôle personnalisé. Cliquez sur &quot;Créer un rôle&quot; pour en créer un.</p>
          )}

          {customRoles.map(role => {
            const isSelected = selectedCustomRoleId === role.id;
            return (
              <button
                key={role.id}
                onClick={() => { setSelectedCustomRoleId(role.id); setSelectedRole('custom'); }}
                className={cn(
                  'w-full text-left p-4 rounded-xl border-2 transition-all',
                  isSelected ? 'border-[#26251e] bg-[#26251e]/5' : 'border-[#e5e5e0] hover:border-[#c5c5c0]'
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center text-white font-black text-xs shrink-0" style={{ background: role.color }}>
                    {role.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-black text-[#26251e]">{role.name}</p>
                    <p className="text-[9px] text-[#7a7a76]">{role.permissions.length} modules</p>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-[#059669] shrink-0" />}
                </div>
                <div className="flex flex-wrap gap-1 mt-2.5">
                  {role.permissions.slice(0, 6).map(m => (
                    <span key={m} className="text-[8px] font-bold px-1 py-0.5 rounded border border-[#e5e5e0] text-[#7a7a76]">
                      {PERMISSION_MODULES[m]?.label ?? m}
                    </span>
                  ))}
                  {role.permissions.length > 6 && (
                    <span className="text-[8px] font-bold px-1 py-0.5 rounded border border-[#e5e5e0] text-[#7a7a76]">+{role.permissions.length - 6}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Preview permissions */}
        {effectivePerms.length > 0 && (
          <div className="border border-[#e5e5e0] rounded-xl p-4 bg-[#fafaf8] space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
              Accès avec ce rôle ({effectivePerms.length} modules)
            </h3>
            <div className="grid grid-cols-2 gap-1.5">
              {effectivePerms.map(m => (
                <div key={m} className="flex items-center gap-1.5 text-[10px] font-semibold text-[#26251e]">
                  <Check className="h-3 w-3 text-[#059669] shrink-0" />
                  {PERMISSION_MODULES[m]?.icon} {PERMISSION_MODULES[m]?.label ?? m}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Save button */}
        <div className="flex gap-3 pt-2">
          <button onClick={() => router.back()} className="flex-1 py-3 text-sm font-bold border border-[#e5e5e0] rounded-xl hover:bg-[#f4f4f3] transition-colors">
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className="flex-1 py-3 text-sm font-bold text-white rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-70 bg-[#26251e] hover:bg-[#3d3c35]"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
            {saved ? 'Sauvegardé !' : 'Enregistrer le rôle'}
          </button>
        </div>
      </div>
    </div>
  );
}
