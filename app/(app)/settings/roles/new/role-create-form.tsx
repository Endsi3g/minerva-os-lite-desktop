'use client';

// Formulaire dédié de création de rôle — nom + couleur + permissions
// Reprend exactement le schéma du modal RoleModal (team/page.tsx) mais en page full-page.
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Check, Loader2, ArrowLeft } from 'lucide-react';
import { getApiUrl } from '@/lib/api-helper';
import { cn } from '@/lib/utils';
import { ALL_MODULES, PERMISSION_MODULES, type PermissionModule } from '@/lib/permissions';

const PRESET_COLORS = ['#059669', '#6366f1', '#f59e0b', '#ec4899', '#26251e'];

export function RoleCreateForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [roleName, setRoleName] = useState('');
  const [roleColor, setRoleColor] = useState('#6366f1');
  const [rolePerms, setRolePerms] = useState<Set<PermissionModule>>(new Set());
  const [savingRole, setSavingRole] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSaveRole = async () => {
    if (!roleName.trim()) return;
    setSavingRole(true);
    setError(null);
    try {
      const permsArray = Array.from(rolePerms);
      const res = await fetch(getApiUrl('/api/team/roles'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: roleName.trim(), color: roleColor, permissions: permsArray }),
      });
      if (res.ok) {
        router.push(redirectTo);
      } else {
        setError('Impossible de créer le rôle. Réessayez.');
      }
    } catch {
      setError('Erreur réseau.');
    } finally {
      setSavingRole(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#fafaf8]">
      <div className="flex-1 overflow-auto">
        <div className="max-w-lg mx-auto px-4 sm:px-6 py-6 space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-8 h-8 rounded-lg border border-[#e5e5e0] bg-white flex items-center justify-center text-[#7a7a76] hover:bg-[#f4f4f3] transition-colors"
              aria-label="Retour"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-[#26251e] flex items-center gap-2">
                <Shield className="h-5 w-5 text-[#059669]" />
                Créer un rôle
              </h1>
              <p className="text-xs text-[#7a7a76] mt-0.5">Définissez un rôle sur mesure avec ses permissions par module.</p>
            </div>
          </div>

          {/* Name + Color */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Nom du rôle</label>
              <input
                value={roleName}
                onChange={e => setRoleName(e.target.value)}
                placeholder="ex: Commercial terrain"
                className="w-full h-9 border border-[#e5e5e0] rounded-xl px-3 text-xs font-semibold text-[#26251e] outline-none focus:ring-1 focus:ring-[#059669] bg-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Couleur</label>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl border border-[#e5e5e0] overflow-hidden">
                  <input type="color" value={roleColor} onChange={e => setRoleColor(e.target.value)} className="w-full h-full cursor-pointer border-none" />
                </div>
                {PRESET_COLORS.map(c => (
                  <button key={c} onClick={() => setRoleColor(c)} className="w-5 h-5 rounded-full border-2 transition-all" style={{ background: c, borderColor: roleColor === c ? c : 'transparent' }} />
                ))}
              </div>
            </div>
          </div>

          {/* Permission toggles */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Modules ({rolePerms.size}/{ALL_MODULES.length})</label>
              <div className="flex gap-2">
                <button onClick={() => setRolePerms(new Set(ALL_MODULES))} className="text-[10px] font-bold text-[#059669] hover:underline">Tout activer</button>
                <button onClick={() => setRolePerms(new Set())} className="text-[10px] font-bold text-[#7a7a76] hover:underline">Tout désactiver</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {ALL_MODULES.map(mod => {
                const cfg = PERMISSION_MODULES[mod];
                const enabled = rolePerms.has(mod);
                return (
                  <button
                    key={mod}
                    onClick={() => {
                      const next = new Set(rolePerms);
                      if (enabled) next.delete(mod); else next.add(mod);
                      setRolePerms(next);
                    }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all",
                      enabled
                        ? 'border-[#26251e] bg-[#26251e]/5 text-[#26251e]'
                        : 'border-[#e5e5e0] bg-white text-[#7a7a76] hover:border-[#c5c5c0]'
                    )}
                  >
                    <div className={cn("w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all", enabled ? 'bg-[#26251e]' : 'bg-[#e5e5e0]')}>
                      {enabled && <Check className="h-2.5 w-2.5 text-white" />}
                    </div>
                    <span className="text-[9px] font-black leading-tight">
                      {cfg?.icon} {cfg?.label ?? mod}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className="text-xs font-semibold text-red-600">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button onClick={() => router.back()} className="flex-1 py-2.5 text-xs font-bold border border-[#e5e5e0] rounded-xl hover:bg-[#f4f4f3] transition-colors bg-white">
              Annuler
            </button>
            <button
              onClick={handleSaveRole}
              disabled={savingRole || !roleName.trim()}
              className="flex-1 py-2.5 text-xs font-bold text-white rounded-xl transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
              style={{ background: roleColor }}
            >
              {savingRole ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Créer le rôle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
