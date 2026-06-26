'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Video, Loader2 } from 'lucide-react';
import { GoogleCalendarIcon } from '@/components/icons';
import { getApiUrl } from '@/lib/api-helper';
import { GoogleConnectModal } from '@/components/google-connect-modal';

interface CalendarEvent {
  id: string;
  summary: string;
  start: string | null;
  end: string | null;
  hangoutLink: string | null;
  location?: string | null;
}

function formatTime(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg border border-[#e5e5e0] bg-[#f4f4f3]/50 animate-pulse">
      <div className="w-12 h-4 rounded bg-[#e5e5e0]" />
      <div className="flex-1 h-3 rounded bg-[#e5e5e0]" />
    </div>
  );
}

export function TodayGoogleCalendarCard() {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showConnect, setShowConnect] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(getApiUrl('/api/google/calendar/today'))
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.connected === false) {
          setConnected(false);
        } else {
          setConnected(true);
          setEvents(data.events || []);
          if (data.error) setError(data.error);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <Card className="border border-[#e5e5e0] bg-white shadow-none">
      <CardHeader className="flex flex-row items-center gap-2.5 pb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md">
          <GoogleCalendarIcon size={22} />
        </div>
        <div>
          <CardTitle className="text-base font-semibold font-sans">Google Calendar</CardTitle>
          <CardDescription className="text-xs">Événements du jour</CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex flex-col gap-2">
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : !connected ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <p className="text-xs text-[#7a7a76]">Connectez Google Calendar pour voir vos événements ici.</p>
            <button
              onClick={() => setShowConnect(true)}
              className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold transition-colors"
            >
              <GoogleCalendarIcon size={14} />
              Connecter Google Calendar
            </button>
            <GoogleConnectModal
              open={showConnect}
              onClose={() => setShowConnect(false)}
              pack="communication"
              redirect="/today"
            />
          </div>
        ) : error ? (
          <p className="text-xs text-red-600 py-2">{error}</p>
        ) : events.length === 0 ? (
          <p className="text-xs text-[#7a7a76] py-2 text-center">Aucun événement aujourd'hui.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="flex items-start justify-between gap-3 p-2.5 rounded-lg border border-[#e5e5e0] bg-[#f4f4f3]/40 hover:bg-[#f4f4f3] transition-colors"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  {/* Time pill */}
                  <span className="shrink-0 text-[10px] font-mono font-bold text-[#059669] bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded mt-0.5">
                    {formatTime(ev.start)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#26251e] truncate">{ev.summary}</p>
                    {ev.end && (
                      <p className="text-[10px] text-[#7a7a76]">
                        jusqu'à {formatTime(ev.end)}
                      </p>
                    )}
                  </div>
                </div>
                {ev.hangoutLink && (
                  <a
                    href={ev.hangoutLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Rejoindre Google Meet"
                    className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold text-[#059669] border border-[#059669]/30 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 transition-colors"
                  >
                    <Video className="h-3 w-3" />
                    Meet
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TodayGoogleCalendarCard;
