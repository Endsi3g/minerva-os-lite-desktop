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
  Email: 'bg-blue-50 text-blue-700 border-blue-200',
  Call: 'bg-green-50 text-green-700 border-green-200',
  LinkedIn: 'bg-sky-50 text-sky-700 border-sky-200',
  SMS: 'bg-purple-50 text-purple-700 border-purple-200',
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
    <Card className="border border-[#e5e5e0] bg-white shadow-none">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 text-blue-600">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold font-sans">Emails planifiés</CardTitle>
            <CardDescription className="text-xs">Étapes de séquences prévues aujourd'hui</CardDescription>
          </div>
        </div>
        {steps.length > 0 && (
          <Badge className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border-blue-200">
            {steps.length}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="px-6 pb-4">
        {loading ? (
          <p className="text-xs text-[#78716c] py-2">Chargement…</p>
        ) : steps.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <Clock className="h-7 w-7 text-[#a8a29e] opacity-50" />
            <p className="text-xs text-[#78716c]">Aucun envoi prévu aujourd'hui.</p>
            <Link href="/sequences" className="text-[10px] font-semibold text-[#059669] hover:underline flex items-center gap-0.5 cursor-pointer">
              Voir les séquences <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {steps.map(step => (
              <div key={step.id} className="flex items-start gap-3 rounded-lg border border-[#e5e5e0] bg-[#fafaf8] px-3 py-2.5">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white border border-[#e5e5e0] text-[#78716c]">
                  {CHANNEL_ICONS[step.channel] ?? <Mail className="h-3 w-3" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-xs font-semibold text-[#26251e]">{step.leadName}</span>
                    <Badge className={`text-[9px] px-1 py-0 h-4 border ${CHANNEL_COLORS[step.channel] ?? ''}`}>
                      {step.channel}
                    </Badge>
                  </div>
                  <p className="mt-0.5 truncate text-[10px] text-[#78716c]">{step.subject}</p>
                </div>
                <span className="shrink-0 text-[10px] font-mono text-[#a8a29e]">{formatTime(step.scheduledAt)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
