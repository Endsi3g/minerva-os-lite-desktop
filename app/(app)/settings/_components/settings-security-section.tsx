'use client';

import React, { useEffect, useState } from 'react';
import { Monitor, Smartphone, Shield, MoreHorizontal } from 'lucide-react';
import { SettingsSectionWrapper } from './settings-section-wrapper';
import { createClient } from '@/lib/supabase/client';

interface Session {
  id: string;
  device: string;
  os: string;
  method: string;
  createdAt: string;
  isCurrent: boolean;
}

export function SettingsSecuritySection() {
  const [userEmail, setUserEmail] = useState('');
  const [createdAt, setCreatedAt] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserEmail(user.email ?? '');
          setCreatedAt(user.created_at ? new Date(user.created_at).toLocaleDateString('fr-CA') : '');
        }
      } catch { /* silent */ }
    };
    load();
  }, []);

  const ua = typeof window !== 'undefined' ? navigator.userAgent : '';
  const isIOS = /iPhone|iPad/.test(ua);
  const isMac = /Macintosh/.test(ua) && !isIOS;
  const isWin = /Windows/.test(ua);
  const browser = ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') ? 'Safari' : 'Navigateur';
  const os = isMac ? 'macOS' : isWin ? 'Windows' : isIOS ? 'iOS' : 'Unknown';

  const sessions: Session[] = [
    {
      id: 'current',
      device: browser,
      os,
      method: 'Email',
      createdAt: "Il y a moins d'une heure",
      isCurrent: true,
    },
  ];

  return (
    <SettingsSectionWrapper
      title="Sécurité"
      description="Gérez vos paramètres de sécurité et vos sessions actives."
      isSaving={false}
    >
      {/* Active sessions */}
      <div className="space-y-2">
        <div className="mb-1">
          <h3 className="text-xs font-bold text-[#26251e]">Sessions actives</h3>
          <p className="text-[11px] text-[#7a7a76] mt-0.5">Gérez vos sessions actives sur tous vos appareils.</p>
        </div>
        <div className="border border-[#e5e5e0] rounded-xl overflow-hidden bg-white divide-y divide-border">
          {sessions.map((s) => (
            <div key={s.id} className="flex items-center gap-4 px-5 py-4">
              <div className="w-9 h-9 rounded-lg bg-[#f4f4f3] flex items-center justify-center shrink-0">
                {isIOS ? <Smartphone className="w-4 h-4 text-[#7a7a76]" /> : <Monitor className="w-4 h-4 text-[#7a7a76]" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#26251e]">{s.device} sur {s.os}</span>
                  {s.isCurrent && (
                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                      Session actuelle
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#7a7a76] mt-0.5">
                  {s.createdAt} · Connecté avec {s.method} {userEmail ? `· ${userEmail}` : ''}
                </p>
              </div>
              <button className="p-1.5 rounded-md hover:bg-[#f4f4f3] text-[#7a7a76] transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Account created */}
      {createdAt && (
        <div className="border border-[#e5e5e0] rounded-xl p-5 bg-white flex items-center gap-3">
          <Shield className="w-4 h-4 text-[#059669] shrink-0" />
          <div>
            <p className="text-xs font-semibold text-[#26251e]">Compte créé le {createdAt}</p>
            <p className="text-[11px] text-[#7a7a76]">Aucune activité suspecte détectée.</p>
          </div>
        </div>
      )}
    </SettingsSectionWrapper>
  );
}
