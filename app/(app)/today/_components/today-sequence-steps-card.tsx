'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Mail, Phone, Link2, MessageSquare, Clock, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useReach } from '@/lib/reach-context';
import { createClient } from '@/lib/supabase/client';

interface ScheduledStep {
  id: string;
  subject: string;
  channel: 'Email' | 'Call' | 'LinkedIn' | 'SMS';
  scheduledAt: string;
  leadName: string;
  leadEmail: string;
  sequenceId: string;
}

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  Email: <Mail className="h-3 w-3" />,
  Call: <Phone className="h-3 w-3" />,
  LinkedIn: <Link2 className="h-3 w-3" />,
  SMS: <MessageSquare className="h-3 w-3" />,
};

const CHANNEL_COLORS: Record<string, string> = {
  Email: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  Call: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
  LinkedIn: 'bg-sky-500/10 text-sky-700 border-sky-500/20',
  SMS: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
};

function formatTime(isoStr: string): string {
  try {
    return new Date(isoStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function TodaySequenceStepsCard() {
  const { user } = useReach();
  const [steps, setSteps] = useState<ScheduledStep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchSteps = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const { data } = await supabase
          .from('email_sequence_steps')
          .select('id, subject, channel, scheduled_at, email_sequences!inner(lead_name, lead_email, user_id)')
          .eq('status', 'pending')
          .eq('email_sequences.user_id', user.id)
          .gte('scheduled_at', todayStart.toISOString())
          .lte('scheduled_at', todayEnd.toISOString())
          .order('scheduled_at')
          .limit(10);

        if (data) {
          setSteps(
            data.map((s: any) => ({
              id: s.id,
              subject: s.subject || '(sans sujet)',
              channel: s.channel || 'Email',
              scheduledAt: s.scheduled_at,
              leadName: s.email_sequences?.lead_name || '',
              leadEmail: s.email_sequences?.lead_email || '',
              sequenceId: '',
            }))
          );
        }
      } catch {
        // silently fail — optional block
      } finally {
        setLoading(false);
      }
    };

    fetchSteps();
  }, [user]);

  return (
    <Card className="border border-border bg-card shadow-none">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/50">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 shrink-0">
            <Clock className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-base font-semibold font-sans text-foreground truncate">Emails planifiés</CardTitle>
            <CardDescription className="text-xs text-muted-foreground truncate">Étapes de séquences prévues aujourd'hui</CardDescription>
          </div>
        </div>
        {steps.length > 0 && (
          <Badge className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 border-blue-500/20 shrink-0">
            {steps.length}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="p-3 sm:p-4">
        {loading ? (
          <p className="text-xs text-muted-foreground py-2">Chargement…</p>
        ) : steps.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <Clock className="h-6 w-6 text-muted-foreground opacity-50" />
            <p className="text-xs text-muted-foreground">Aucun envoi prévu aujourd'hui.</p>
            <Link href="/sequences" className="text-[10px] font-semibold text-brand-accent-emerald hover:underline flex items-center gap-0.5 cursor-pointer">
              Voir les séquences <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {steps.map(step => (
              <div key={step.id} className="flex items-start gap-3 rounded-lg border border-border bg-card hover:bg-accent/40 px-3 py-2.5 transition-colors">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted border border-border text-foreground">
                  {CHANNEL_ICONS[step.channel] ?? <Mail className="h-3 w-3" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-xs font-semibold text-foreground">{step.leadName}</span>
                    <Badge className={`text-[9px] px-1 py-0 h-4 border ${CHANNEL_COLORS[step.channel] ?? ''}`}>
                      {step.channel}
                    </Badge>
                  </div>
                  <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{step.subject}</p>
                </div>
                <span className="shrink-0 text-[10px] font-mono text-muted-foreground">{formatTime(step.scheduledAt)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TodaySequenceStepsCard;
