'use client';

import React, { useEffect, useState } from 'react';
import { Monitor, Smartphone, Shield, LogOut, Loader2 } from 'lucide-react';
import { SettingsSectionWrapper } from './settings-section-wrapper';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface Session {
  id: string;
  createdAt: string;
  refreshedAt: string | null;
  userAgent: string | null;
  ip: string | null;
  isCurrent: boolean;
}

function parseDevice(userAgent: string | null): { label: string; isMobile: boolean } {
  if (!userAgent) return { label: 'Appareil inconnu', isMobile: false };
  const isIOS = /iPhone|iPad/.test(userAgent);
  const isAndroid = /Android/.test(userAgent);
  const isMac = /Macintosh/.test(userAgent) && !isIOS;
  const isWin = /Windows/.test(userAgent);
  const browser = userAgent.includes('Chrome') ? 'Chrome' : userAgent.includes('Firefox') ? 'Firefox' : userAgent.includes('Safari') ? 'Safari' : 'Navigateur';
  const os = isMac ? 'macOS' : isWin ? 'Windows' : isIOS ? 'iOS' : isAndroid ? 'Android' : 'Système inconnu';
  return { label: `${browser} sur ${os}`, isMobile: isIOS || isAndroid };
}

export function SettingsSecuritySection() {
  const [userEmail, setUserEmail] = useState('');
  const [createdAt, setCreatedAt] = useState('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const loadSessions = async () => {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('list_my_sessions');
    if (!error && data) {
      setSessions((data as Record<string, unknown>[]).map((s) => ({
        id: s.id as string,
        createdAt: s.created_at as string,
        refreshedAt: (s.refreshed_at as string) ?? null,
        userAgent: (s.user_agent as string) ?? null,
        ip: (s.ip as string) ?? null,
        isCurrent: !!s.is_current,
      })));
    }
    setLoading(false);
  };

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
      await loadSessions();
    };
    load();
  }, []);

  const handleRevoke = async (sessionId: string) => {
    setRevokingId(sessionId);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc('revoke_my_session', { target_session_id: sessionId });
      if (error) throw error;
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast.success('Appareil déconnecté.');
    } catch {
      toast.error('Impossible de déconnecter cet appareil.');
    } finally {
      setRevokingId(null);
    }
  };

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
          <p className="text-[11px] text-[#7a7a76] mt-0.5">
            {sessions.length > 1
              ? `${sessions.length} appareils connectés à ce compte.`
              : 'Gérez vos sessions actives sur tous vos appareils.'}
          </p>
        </div>
        <div className="border border-[#e5e5e0] rounded-xl overflow-hidden bg-white divide-y divide-border">
          {loading ? (
            <div className="px-5 py-8 flex justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-[#7a7a76]" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="px-5 py-6 text-center text-xs text-[#7a7a76]">Aucune session active trouvée.</div>
          ) : sessions.map((s) => {
            const { label, isMobile } = parseDevice(s.userAgent);
            const lastActive = s.refreshedAt || s.createdAt;
            return (
              <div key={s.id} className="flex items-center gap-4 px-5 py-4">
                <div className="w-9 h-9 rounded-lg bg-[#f4f4f3] flex items-center justify-center shrink-0">
                  {isMobile ? <Smartphone className="w-4 h-4 text-[#7a7a76]" /> : <Monitor className="w-4 h-4 text-[#7a7a76]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#26251e]">{label}</span>
                    {s.isCurrent && (
                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                        Session actuelle
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#7a7a76] mt-0.5">
                    Active {new Date(lastActive).toLocaleString('fr-CA')} {s.ip ? `· ${s.ip}` : ''} {userEmail ? `· ${userEmail}` : ''}
                  </p>
                </div>
                {!s.isCurrent && (
                  <button
                    onClick={() => handleRevoke(s.id)}
                    disabled={revokingId === s.id}
                    className="p-1.5 rounded-md hover:bg-red-50 text-[#7a7a76] hover:text-red-500 transition-colors disabled:opacity-50"
                    title="Déconnecter cet appareil"
                  >
                    {revokingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                  </button>
                )}
              </div>
            );
          })}
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
