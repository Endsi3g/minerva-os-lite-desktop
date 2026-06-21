'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckCircle2, Circle, ArrowRight, User, Mail,
  Users, Target, Layers, GitBranch, PartyPopper, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useReach } from '@/lib/reach-context';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface SetupItem {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  completed: boolean;
  optional?: boolean;
}

export function SetupRoot() {
  const { user, leads, goals, activeWorkspace } = useReach();

  const [loading, setLoading] = useState(true);
  const [profileDone, setProfileDone] = useState(false);
  const [gmailDone, setGmailDone] = useState(false);
  const [sequenceDone, setSequenceDone] = useState(false);
  const [teamDone, setTeamDone] = useState(false);

  useEffect(() => {
    if (!user) return;

    const check = async () => {
      setLoading(true);
      try {
        const supabase = createClient();

        const [settingsRes, googleAccountRes, sequencesRes, teamRes] = await Promise.all([
          supabase
            .from('settings')
            .select('full_name, company_name')
            .eq('user_id', user.id)
            .single(),
          supabase
            .from('google_accounts')
            .select('id')
            .eq('user_id', user.id)
            .eq('status', 'connected')
            .maybeSingle(),
          activeWorkspace
            ? supabase
                .from('email_sequences')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id)
            : Promise.resolve({ count: 0, error: null }),
          activeWorkspace
            ? supabase
                .from('team_members')
                .select('id', { count: 'exact', head: true })
                .eq('workspace_id', activeWorkspace.id)
                .eq('status', 'active')
            : Promise.resolve({ count: 0, error: null }),
        ]);

        const s = settingsRes.data;
        setProfileDone(!!(s?.full_name && s?.company_name));
        setGmailDone(!!googleAccountRes.data);
        setSequenceDone((sequencesRes.count ?? 0) > 0);
        setTeamDone((teamRes.count ?? 0) > 0);
      } catch {
        // silently fail — checklist stays unchecked
      } finally {
        setLoading(false);
      }
    };

    check();
  }, [user, activeWorkspace]);

  const items: SetupItem[] = [
    {
      id: 'profile',
      title: 'Compléter votre profil',
      description: 'Ajoutez votre nom et le nom de votre agence pour personnaliser les emails envoyés.',
      href: '/settings',
      icon: <User className="h-5 w-5" />,
      completed: profileDone,
    },
    {
      id: 'gmail',
      title: 'Connecter Gmail',
      description: 'Autorisez l\'accès Gmail pour envoyer des emails de prospection et lire les réponses dans la boîte de réception.',
      href: '/api/google/auth/start?pack=communication&redirect=/setup',
      icon: <Mail className="h-5 w-5" />,
      completed: gmailDone,
    },
    {
      id: 'leads',
      title: 'Créer votre premier lead',
      description: 'Ajoutez un lead manuellement, importez un CSV ou lancez le prospecteur automatique.',
      href: '/leads/new',
      icon: <Users className="h-5 w-5" />,
      completed: leads.length > 0,
    },
    {
      id: 'sequence',
      title: 'Créer une séquence email',
      description: 'Construisez une séquence de prospection multi-étapes pour automatiser vos relances.',
      href: '/sequences',
      icon: <GitBranch className="h-5 w-5" />,
      completed: sequenceDone,
    },
    {
      id: 'goals',
      title: 'Définir vos objectifs mensuels',
      description: 'Configurez vos quotas (leads contactés, RDV, revenus) pour suivre votre progression.',
      href: '/settings',
      icon: <Target className="h-5 w-5" />,
      completed: goals.length > 0,
    },
    {
      id: 'team',
      title: 'Inviter un membre de l\'équipe',
      description: 'Ajoutez un collaborateur à votre workspace pour travailler ensemble sur les leads.',
      href: '/team',
      icon: <Layers className="h-5 w-5" />,
      completed: teamDone,
      optional: true,
    },
  ];

  const required = items.filter(i => !i.optional);
  const completedRequired = required.filter(i => i.completed).length;
  const completedAll = items.filter(i => i.completed).length;
  const pct = Math.round((completedAll / items.length) * 100);
  const allDone = completedRequired === required.length;

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#a8a29e]" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf8]">
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">

        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f54e00]/10 text-[#f54e00]">
              <Layers className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold text-[#26251e]">Configuration initiale</h1>
          </div>
          <p className="text-sm text-[#78716c] mt-1">
            Complétez ces étapes pour tirer le meilleur de Minerva OS.
          </p>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#26251e]">{completedAll} / {items.length} étapes</span>
            <span className="text-[#78716c]">{pct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#e5e5e0]">
            <div
              className="h-full rounded-full bg-[#f54e00] transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* All done state */}
        {allDone && (
          <div className="flex items-center gap-3 rounded-xl border border-[#059669]/20 bg-[#059669]/5 px-5 py-4">
            <PartyPopper className="h-5 w-5 text-[#059669] shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[#059669]">Tout est prêt !</p>
              <p className="text-xs text-[#78716c]">Votre espace de travail est entièrement configuré. Bonne prospection.</p>
            </div>
            <Link href="/today" className="ml-auto shrink-0">
              <Button size="sm" className="h-7 text-xs bg-[#059669] hover:bg-[#047857] text-white gap-1">
                Tableau de bord <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        )}

        {/* Checklist */}
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(
                'flex items-start gap-4 rounded-xl border bg-white px-5 py-4 transition-all',
                item.completed
                  ? 'border-[#059669]/20 opacity-70'
                  : 'border-[#e5e5e0] hover:border-[#f54e00]/30 hover:shadow-sm'
              )}
            >
              {/* Status icon */}
              <div className={cn(
                'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
                item.completed ? 'bg-[#059669]/10 text-[#059669]' : 'bg-[#f4f4f3] text-[#78716c]'
              )}>
                {item.icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={cn(
                    'text-sm font-semibold',
                    item.completed ? 'text-[#78716c] line-through' : 'text-[#26251e]'
                  )}>
                    {item.title}
                  </p>
                  {item.optional && (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#a8a29e] border border-[#e5e5e0] rounded-full px-1.5 py-0.5">
                      Optionnel
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-[#78716c] leading-relaxed">{item.description}</p>
              </div>

              {/* Action */}
              <div className="shrink-0 mt-0.5">
                {item.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-[#059669]" />
                ) : (
                  <Link href={item.href}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1 border-[#e5e5e0] hover:border-[#f54e00]/40 hover:text-[#f54e00]"
                    >
                      Commencer
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <p className="text-center text-xs text-[#a8a29e]">
          Les étapes optionnelles peuvent être complétées plus tard sans impact sur les fonctionnalités principales.
        </p>
      </div>
    </div>
  );
}
