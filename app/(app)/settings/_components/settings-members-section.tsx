'use client';

import React, { useEffect, useState } from 'react';
import { Search, Download, UserPlus, MoreHorizontal } from 'lucide-react';
import { SettingsSectionWrapper } from './settings-section-wrapper';
import { getApiUrl } from '@/lib/api-helper';

interface Member {
  id: string;
  email: string;
  full_name: string;
  role: string;
  avatarBase64?: string;
}

export function SettingsMembersSection() {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(getApiUrl('/api/team/members'));
        if (res.ok) {
          const data = await res.json();
          setMembers(data.members ?? []);
        }
      } catch { /* silent */ } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = members.filter(
    (m) =>
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      (m.full_name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await fetch(getApiUrl('/api/team/invite'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: 'member' }),
      });
      setInviteEmail('');
      setShowInvite(false);
    } catch { /* silent */ } finally {
      setInviting(false);
    }
  };

  const initials = (m: Member) => {
    const name = m.full_name || m.email;
    return name.charAt(0).toUpperCase();
  };

  return (
    <SettingsSectionWrapper
      title="Membres"
      description="Invitez des personnes et gérez les membres de votre espace de travail."
      isSaving={false}
    >
      {/* Members overview */}
      <div className="border border-[#e5e5e0] rounded-xl p-5 bg-white space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-[#26251e]">Aperçu des membres</p>
            <p className="text-[11px] text-[#7a7a76] mt-0.5">Membres actifs dans cet espace de travail.</p>
          </div>
        </div>
        <div className="flex items-end gap-1">
          <span className="text-3xl font-bold text-[#26251e] leading-none">{members.length}</span>
          <span className="text-[11px] text-[#7a7a76] mb-0.5">membre(s)</span>
        </div>
      </div>

      {/* Manage members */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#7a7a76]" />
            <input
              type="text"
              placeholder="Rechercher des membres..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-[#e5e5e0] rounded-lg focus:outline-none focus:ring-1 focus:ring-primary bg-[#fafaf8] text-[#26251e] placeholder:text-[#7a7a76]"
            />
          </div>
          <button className="p-2 border border-[#e5e5e0] rounded-lg text-[#7a7a76] hover:bg-[#f4f4f3] transition-colors">
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#059669] text-white rounded-lg text-xs font-bold hover:bg-[#059669]/90 transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Inviter des membres
          </button>
        </div>

        {showInvite && (
          <div className="border border-[#e5e5e0] rounded-xl p-4 bg-white space-y-3 animate-in fade-in duration-150">
            <p className="text-xs font-bold text-[#26251e]">Inviter par email</p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="email@exemple.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                className="flex-1 text-xs px-3.5 py-2 border border-[#e5e5e0] rounded-lg focus:outline-none focus:ring-1 focus:ring-primary bg-[#fafaf8] text-[#26251e]"
              />
              <button
                onClick={() => setShowInvite(false)}
                className="px-3 py-2 text-xs border border-[#e5e5e0] rounded-lg hover:bg-[#f4f4f3] transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleInvite}
                disabled={inviting || !inviteEmail.trim()}
                className="px-4 py-2 bg-[#059669] text-white text-xs font-bold rounded-lg hover:bg-[#059669]/90 transition-colors disabled:opacity-50"
              >
                {inviting ? 'Envoi...' : 'Envoyer'}
              </button>
            </div>
          </div>
        )}

        <div className="border border-[#e5e5e0] rounded-xl overflow-hidden bg-white">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_120px_120px_40px] gap-2 px-4 py-2.5 border-b border-[#e5e5e0] bg-[#f4f4f3]/40">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Nom</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Rôle</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Plan</span>
            <span />
          </div>

          {loading ? (
            <div className="px-4 py-8 text-center text-xs text-[#7a7a76]">Chargement...</div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-[#7a7a76]">Aucun membre trouvé.</div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((m) => (
                <div key={m.id} className="grid grid-cols-[1fr_120px_120px_40px] gap-2 items-center px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-[#059669]/10 flex items-center justify-center shrink-0 overflow-hidden">
                      {m.avatarBase64 ? (
                        <img src={m.avatarBase64} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[11px] font-bold text-[#059669]">{initials(m)}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#26251e] truncate">{m.full_name || 'Utilisateur'}</p>
                      <p className="text-[10px] text-[#7a7a76] truncate">{m.email}</p>
                    </div>
                  </div>
                  <span className="text-xs text-[#26251e] capitalize">{m.role || 'Membre'}</span>
                  <span className="text-xs text-[#7a7a76]">Gratuit</span>
                  <button className="p-1 rounded-md hover:bg-[#f4f4f3] text-[#7a7a76] transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SettingsSectionWrapper>
  );
}
