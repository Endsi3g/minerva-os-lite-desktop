'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Calendar } from '@/components/ui/calendar';
import { Loader2, Clock, CalendarDays, Check, ChevronLeft, User, Building2, Video, AlertCircle } from 'lucide-react';
import { getApiUrl } from '@/lib/api-helper';
import { cn } from '@/lib/utils';
import { fr } from 'date-fns/locale';

const DAY_NAMES_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MONTH_NAMES_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

function formatTime(iso: string, timezone: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: timezone });
}

function formatDate(date: Date): string {
  return `${DAY_NAMES_FR[date.getDay()]} ${date.getDate()} ${MONTH_NAMES_FR[date.getMonth()]} ${date.getFullYear()}`;
}

function toDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

interface BookingSettings {
  user_id: string;
  username: string;
  title: string;
  description?: string;
  duration_minutes: number;
  buffer_minutes: number;
  timezone: string;
  host?: {
    full_name: string;
    company_name: string;
    avatar_base64?: string;
  };
}

type Step = 'calendar' | 'slots' | 'form' | 'success';

export default function BookPage() {
  const params = useParams();
  const username = params.username as string;

  const [settings, setSettings] = useState<BookingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [step, setStep] = useState<Step>('calendar');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const [form, setForm] = useState({ name: '', email: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetch(getApiUrl(`/api/booking/settings?username=${username}`))
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) setNotFound(true);
        else setSettings(data);
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [username]);

  const fetchSlots = useCallback(async (date: Date) => {
    setLoadingSlots(true);
    setSlots([]);
    try {
      const res = await fetch(getApiUrl(`/api/booking/slots?username=${username}&date=${toDateStr(date)}`));
      const data = await res.json();
      setSlots(data.slots ?? []);
    } catch { setSlots([]); }
    finally { setLoadingSlots(false); }
  }, [username]);

  const handleDateSelect = async (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
    setStep('slots');
    setSelectedSlot(null);
    await fetchSlots(date);
  };

  const handleSlotSelect = (slot: string) => {
    setSelectedSlot(slot);
    setStep('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !selectedSlot) return;
    setSubmitting(true);
    setFormError('');
    try {
      const res = await fetch(getApiUrl('/api/booking/appointments'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          guestName: form.name,
          guestEmail: form.email,
          guestNotes: form.notes,
          startAt: selectedSlot,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error || 'Erreur lors de la réservation'); return; }
      setStep('success');
    } catch { setFormError('Erreur réseau. Réessayez.'); }
    finally { setSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafaf8]">
        <Loader2 className="h-7 w-7 animate-spin text-[#7a7a76]" />
      </div>
    );
  }

  if (notFound || !settings) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#fafaf8] text-[#26251e] px-4">
        <div className="w-14 h-14 bg-[#f4f4f3] border border-[#e5e5e0] rounded-2xl flex items-center justify-center">
          <AlertCircle className="h-7 w-7 text-[#7a7a76]" />
        </div>
        <h1 className="text-xl font-black">Page introuvable</h1>
        <p className="text-sm text-[#7a7a76] text-center max-w-xs">
          Cette page de réservation n&apos;existe pas ou a été supprimée.
        </p>
      </div>
    );
  }

  const accentColor = '#f54e00';
  const hostInitials = settings.host?.full_name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() ?? '?';

  return (
    <div className="min-h-screen bg-[#fafaf8] text-[#26251e] font-sans">
      {/* Top brand bar */}
      <div className="border-b border-[#e5e5e0] bg-white px-6 py-3 flex items-center gap-2.5">
        <div className="w-6 h-6 bg-[#26251e] rounded-md flex items-center justify-center">
          <span className="text-white font-extrabold text-[10px]">M</span>
        </div>
        <span className="text-xs font-bold text-[#26251e]">Minerva OS</span>
        <span className="text-[#e5e5e0]">·</span>
        <span className="text-xs text-[#7a7a76]">Réservation</span>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-[280px,1fr] gap-8">

        {/* Left — Host card */}
        <div className="space-y-5">
          {/* Avatar */}
          <div className="flex flex-col items-start gap-3">
            {settings.host?.avatar_base64 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.host.avatar_base64} alt="" className="w-14 h-14 rounded-2xl object-cover border border-[#e5e5e0]" />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-[#f4f4f3] border border-[#e5e5e0] flex items-center justify-center text-lg font-black text-[#26251e]">
                {hostInitials}
              </div>
            )}
            <div>
              <h1 className="text-xl font-black text-[#26251e] leading-tight">{settings.title}</h1>
              {settings.host?.full_name && (
                <p className="text-sm text-[#7a7a76] mt-0.5 flex items-center gap-1.5">
                  <User className="h-3 w-3" />
                  {settings.host.full_name}
                </p>
              )}
              {settings.host?.company_name && (
                <p className="text-xs text-[#7a7a76] flex items-center gap-1.5 mt-0.5">
                  <Building2 className="h-3 w-3" />
                  {settings.host.company_name}
                </p>
              )}
            </div>
          </div>

          {/* Meta */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs text-[#7a7a76]">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>{settings.duration_minutes} minutes</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#7a7a76]">
              <Video className="h-3.5 w-3.5 shrink-0" />
              <span>Visioconférence</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#7a7a76]">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              <span>{settings.timezone}</span>
            </div>
          </div>

          {settings.description && (
            <p className="text-xs text-[#7a7a76] leading-relaxed border-t border-[#e5e5e0] pt-4">{settings.description}</p>
          )}

          {/* Breadcrumb */}
          {step !== 'calendar' && step !== 'success' && (
            <div className="hidden md:block pt-2 border-t border-[#e5e5e0]">
              <div className="space-y-1 text-[11px]">
                {selectedDate && (
                  <p className="font-bold text-[#26251e]">{formatDate(selectedDate)}</p>
                )}
                {selectedSlot && step === 'form' && (
                  <p className="font-bold" style={{ color: accentColor }}>{formatTime(selectedSlot, settings.timezone)}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right — Steps */}
        <div className="bg-white border border-[#e5e5e0] rounded-2xl p-6 shadow-sm min-h-[400px]">

          {/* ── Step: Calendar ── */}
          {step === 'calendar' && (
            <div>
              <h2 className="text-sm font-black text-[#26251e] mb-4">Choisissez une date</h2>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                locale={fr}
                disabled={(date) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return date < today;
                }}
                className="rounded-xl border-0"
              />
            </div>
          )}

          {/* ── Step: Slots ── */}
          {step === 'slots' && selectedDate && (
            <div>
              <button onClick={() => setStep('calendar')} className="flex items-center gap-1.5 text-xs font-bold text-[#7a7a76] hover:text-[#26251e] mb-4 transition-colors">
                <ChevronLeft className="h-3.5 w-3.5" />
                Retour au calendrier
              </button>
              <h2 className="text-sm font-black text-[#26251e] mb-1">{formatDate(selectedDate)}</h2>
              <p className="text-[11px] text-[#7a7a76] mb-5">{settings.duration_minutes} min · Sélectionnez un créneau</p>

              {loadingSlots ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-[#7a7a76]" />
                </div>
              ) : slots.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <CalendarDays className="h-8 w-8 text-[#d4d4d0]" />
                  <p className="text-sm font-bold text-[#7a7a76]">Aucun créneau disponible</p>
                  <p className="text-xs text-[#b0b0a8]">Essayez une autre date.</p>
                  <button onClick={() => setStep('calendar')} className="mt-1 text-xs font-bold underline" style={{ color: accentColor }}>
                    Choisir une autre date
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {slots.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => handleSlotSelect(slot)}
                      className="py-2.5 px-3 rounded-xl border border-[#e5e5e0] text-xs font-bold text-[#26251e] hover:border-[#f54e00] hover:text-[#f54e00] hover:bg-[#fff4f0] transition-all"
                    >
                      {formatTime(slot, settings.timezone)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Step: Form ── */}
          {step === 'form' && selectedSlot && selectedDate && (
            <div>
              <button onClick={() => setStep('slots')} className="flex items-center gap-1.5 text-xs font-bold text-[#7a7a76] hover:text-[#26251e] mb-4 transition-colors">
                <ChevronLeft className="h-3.5 w-3.5" />
                Retour aux créneaux
              </button>

              <div className="mb-5 p-3 bg-[#f4f4f3] border border-[#e5e5e0] rounded-xl">
                <p className="text-xs font-black text-[#26251e]">{formatDate(selectedDate)}</p>
                <p className="text-xs font-bold mt-0.5" style={{ color: accentColor }}>
                  {formatTime(selectedSlot, settings.timezone)} · {settings.duration_minutes} min
                </p>
              </div>

              <h2 className="text-sm font-black text-[#26251e] mb-4">Vos informations</h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Nom complet *</label>
                  <input
                    required
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Jean Dupont"
                    className="w-full h-9 border border-[#e5e5e0] rounded-xl px-3 text-xs font-semibold text-[#26251e] outline-none focus:ring-1 focus:ring-[#f54e00] bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Email *</label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="jean@example.com"
                    className="w-full h-9 border border-[#e5e5e0] rounded-xl px-3 text-xs font-semibold text-[#26251e] outline-none focus:ring-1 focus:ring-[#f54e00] bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Notes (optionnel)</label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Sujet de l'appel, questions..."
                    rows={3}
                    className="w-full border border-[#e5e5e0] rounded-xl px-3 py-2 text-xs font-semibold text-[#26251e] outline-none focus:ring-1 focus:ring-[#f54e00] bg-white resize-none"
                  />
                </div>

                {formError && (
                  <p className="text-xs text-red-600 font-semibold bg-red-50 border border-red-200 rounded-xl px-3 py-2">{formError}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting || !form.name || !form.email}
                  className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                  style={{ background: accentColor }}
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirmer la réservation
                </button>
              </form>
            </div>
          )}

          {/* ── Step: Success ── */}
          {step === 'success' && (
            <div className="flex flex-col items-center justify-center gap-5 py-10 text-center">
              <div
                className="w-20 h-20 rounded-3xl border-2 flex items-center justify-center"
                style={{ background: `${accentColor}15`, borderColor: `${accentColor}40` }}
              >
                <Check className="h-10 w-10" style={{ color: accentColor }} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-[#26251e]">Réservation confirmée !</h2>
                {selectedDate && selectedSlot && (
                  <p className="text-sm text-[#7a7a76] mt-2">
                    {formatDate(selectedDate)} à {formatTime(selectedSlot, settings.timezone)}
                  </p>
                )}
                <p className="text-xs text-[#7a7a76] mt-3 max-w-xs mx-auto">
                  Un email de confirmation a été envoyé à <span className="font-bold text-[#26251e]">{form.email}</span>.
                </p>
              </div>
              <button
                onClick={() => { setStep('calendar'); setSelectedDate(undefined); setSelectedSlot(null); setForm({ name: '', email: '', notes: '' }); }}
                className="mt-2 text-xs font-bold underline text-[#7a7a76] hover:text-[#26251e] transition-colors"
              >
                Faire une autre réservation
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
