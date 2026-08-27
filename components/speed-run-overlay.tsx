'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Zap,
  X,
  Sparkles,
  Send,
  Navigation,
  Edit3,
  SkipForward,
  CheckCircle2,
  Phone,
  Mail,
  Building2,
  MapPin,
  Flame,
  Clock,
  ArrowRight,
  RotateCcw,
  MessageSquare,
  Globe,
  Star,
  Check
} from 'lucide-react';
import { useReach } from '@/lib/reach-context';
import type { Lead } from '@/lib/mock-data';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getApiUrl } from '@/lib/api-helper';

const getLeadEmail = (l: Lead) => l.contactEmail || (l as any).email || '';

interface SpeedRunOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  customLeads?: Lead[];
}

export function SpeedRunOverlay({ isOpen, onClose, customLeads }: SpeedRunOverlayProps) {
  const { leads, updateLead, activeWorkspace } = useReach();

  // Filter actionable leads for the session
  const sessionLeads = useMemo(() => {
    if (customLeads && customLeads.length > 0) return customLeads;
    // Default queue: Warm/Hot leads or leads not yet converted/contacted
    const active = leads.filter(
      (l) => l.status === 'New' || l.status === 'Contacted' || l.temperature === 'Hot' || l.temperature === 'Warm'
    );
    return active.length > 0 ? active.slice(0, 15) : leads.slice(0, 10);
  }, [leads, customLeads]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [channel, setChannel] = useState<'email' | 'sms' | 'field' | 'call'>('email');
  const [isEditing, setIsEditing] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [stats, setStats] = useState({ sent: 0, fieldAdded: 0, skipped: 0 });
  const [streak, setStreak] = useState(0);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const currentLead: Lead | undefined = sessionLeads[currentIndex];

  // Timer
  useEffect(() => {
    if (!isOpen || isCompleted) return;
    const interval = setInterval(() => {
      setSecondsElapsed((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, isCompleted]);

  // Generate dynamic AI hook/pitch for the current lead
  const generatedPitch = useMemo(() => {
    if (!currentLead) return '';
    const name = currentLead.contactName || currentLead.businessName || 'Bonjour';
    const company = currentLead.businessName || 'votre établissement';
    const city = currentLead.city || 'votre région';
    const niche = currentLead.niche || 'votre secteur';

    if (channel === 'field') {
      return `Bonjour ${name}, je suis de passage aujourd'hui sur ${city} pour rencontrer des acteurs clés en ${niche}. Avez-vous 5 minutes pour échanger sur la modernisation de votre acquisition ?`;
    }
    if (channel === 'sms') {
      return `Bonjour ${name}, avez-vous 3 min cette semaine pour voir comment booster les prises de RDV de ${company} ? - Minerva OS`;
    }
    if (channel === 'call') {
      return `Pitch Téléphonique : Accroche immédiate sur la visibilité locale de ${company} à ${city} et proposition d'un diagnostic d'impact de 10 min.`;
    }
    return `Bonjour ${name},\n\nJ'ai analysé la présence locale de ${company} sur ${city} et j'ai identifié 2 leviers immédiats pour doubler vos demandes entrantes en ${niche}.\n\nSeriez-vous ouvert à un rapide échange de 10 minutes ce jeudi ?\n\nBien cordialement,\nL'équipe`;
  }, [currentLead, channel]);

  // Sync custom message when lead or channel changes
  useEffect(() => {
    setCustomMessage(generatedPitch);
    setIsEditing(false);
  }, [generatedPitch]);

  // Format seconds to mm:ss
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Next card helper
  const nextLead = useCallback(() => {
    if (currentIndex + 1 >= sessionLeads.length) {
      setIsCompleted(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, sessionLeads.length]);

  // Action: Validate & Send / Contact
  const handleValidateAndSend = async () => {
    if (!currentLead || isSending) return;
    setIsSending(true);

    try {
      // If email channel, try calling outreach composer API
      const emailToUse = getLeadEmail(currentLead);
      if (channel === 'email' && emailToUse) {
        const workspaceId = activeWorkspace?.id || localStorage.getItem('minerva_active_workspace_id');
        await fetch(getApiUrl('/api/outreach/send'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspace_id: workspaceId,
            lead_id: currentLead.id,
            to: emailToUse,
            subject: `Opportunité de croissance pour ${currentLead.businessName}`,
            body: customMessage,
          }),
        }).catch(() => {});
      }

      // Update lead in state
      await updateLead(currentLead.id, {
        status: 'Contacted',
        nextAction: `Message ${channel.toUpperCase()} envoyé en Speed Run`,
        nextActionDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      });

      setStats((prev) => ({ ...prev, sent: prev.sent + 1 }));
      setStreak((s) => s + 1);
      toast.success(`Action validée pour ${currentLead.businessName} ! 🔥`, { duration: 1500 });
      nextLead();
    } catch (err: any) {
      toast.error(`Erreur: ${err?.message || 'Action impossible'}`);
    } finally {
      setIsSending(false);
    }
  };

  // Action: Add to Field Tour
  const handleAddToFieldTour = async () => {
    if (!currentLead || isSending) return;
    setIsSending(true);

    try {
      const newNote = {
        id: crypto.randomUUID(),
        leadId: currentLead.id,
        type: 'visit' as const,
        content: `[Tournée Terrain - Speed Run]: ${customMessage}`,
        createdAt: new Date().toISOString(),
      };

      await updateLead(currentLead.id, {
        status: 'Meeting Booked',
        nextAction: 'Visite terrain planifiée (Speed Run)',
        notes: Array.isArray(currentLead.notes) ? [...currentLead.notes, newNote] : [newNote],
      });

      setStats((prev) => ({ ...prev, fieldAdded: prev.fieldAdded + 1 }));
      setStreak((s) => s + 1);
      toast.success(`${currentLead.businessName} ajouté à la tournée terrain ! 🚗`, { duration: 1500 });
      nextLead();
    } catch (err: any) {
      toast.error('Erreur lors de l’ajout en tournée');
    } finally {
      setIsSending(false);
    }
  };

  // Action: Skip / Snooze
  const handleSkip = () => {
    setStats((prev) => ({ ...prev, skipped: prev.skipped + 1 }));
    setStreak(0);
    toast.info('Prospect reporté', { duration: 1000 });
    nextLead();
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    if (!isOpen || isCompleted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // If typing inside an input or textarea, don't capture global single keys
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        if (e.key === 'Escape') {
          setIsEditing(false);
        }
        return;
      }

      if (e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault();
        handleValidateAndSend();
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        handleAddToFieldTour();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setIsEditing((prev) => !prev);
      } else if (e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        handleSkip();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isCompleted, currentLead, customMessage, channel, isSending]);

  if (!isOpen) return null;

  const progressPercent = sessionLeads.length > 0 ? Math.round(((currentIndex) / sessionLeads.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0d0f11]/85 backdrop-blur-xl animate-in fade-in duration-200 p-4 select-none">
      {/* Background radial glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#e5e5e0] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header HUD */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e5e0] bg-[#fafaf8] shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
              <Zap className="h-5 w-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-[#26251e] tracking-tight">Speed Run Commercial</h2>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                  Mode 20x
                </span>
              </div>
              <p className="text-[11px] text-[#7a7a76] font-medium">
                Validation & Dispatch instantané en 1-clic
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {streak > 1 && (
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full text-amber-700 text-xs font-black"
              >
                <Flame className="h-3.5 w-3.5 fill-amber-500 text-amber-500 animate-bounce" />
                <span>{streak} d'affilée !</span>
              </motion.div>
            )}

            <div className="flex items-center gap-1.5 bg-[#f0f0ed] px-2.5 py-1 rounded-lg text-xs font-bold text-[#555552]">
              <Clock className="h-3.5 w-3.5 text-[#7a7a76]" />
              <span>{formatTime(secondsElapsed)}</span>
            </div>

            <button
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded-full bg-[#f0f0ed] hover:bg-[#e5e5e2] text-[#7a7a76] hover:text-[#26251e] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#f0f0ed] h-1.5 shrink-0 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Card Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col justify-between">
          {!isCompleted && currentLead ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentLead.id}
                initial={{ opacity: 0, x: 20, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -20, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-4"
              >
                {/* Lead Profile Header */}
                <div className="flex items-start justify-between bg-[#fafaf8] p-4 rounded-2xl border border-[#e5e5e0]">
                  <div className="flex items-start gap-3.5">
                    <div className="h-12 w-12 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-800 font-black text-base shadow-xs shrink-0">
                      {currentLead.businessName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-[#26251e]">
                          {currentLead.businessName}
                        </h3>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {currentLead.niche || 'B2B Local'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#7a7a76] mt-1">
                        {currentLead.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-[#059669]" />
                            {currentLead.city}
                          </span>
                        )}
                        {getLeadEmail(currentLead) && (
                          <span className="flex items-center gap-1 font-mono text-[11px]">
                            <Mail className="h-3 w-3 text-[#059669]" />
                            {getLeadEmail(currentLead)}
                          </span>
                        )}
                        {currentLead.phone && (
                          <span className="flex items-center gap-1 font-mono text-[11px]">
                            <Phone className="h-3 w-3 text-[#059669]" />
                            {currentLead.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
                      Action {currentIndex + 1} / {sessionLeads.length}
                    </span>
                    <div className="text-xs font-black text-emerald-700 mt-0.5">
                      Score : {currentLead.score ? `${currentLead.score}%` : 'Chaud'}
                    </div>
                  </div>
                </div>

                {/* Channel Selector */}
                <div className="flex items-center gap-2 bg-[#f0f0ed] p-1 rounded-xl">
                  <button
                    onClick={() => setChannel('email')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition-all',
                      channel === 'email'
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-[#7a7a76] hover:text-[#26251e]'
                    )}
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Email
                  </button>
                  <button
                    onClick={() => setChannel('field')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition-all',
                      channel === 'field'
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-[#7a7a76] hover:text-[#26251e]'
                    )}
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    Tournée Terrain
                  </button>
                  <button
                    onClick={() => setChannel('sms')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition-all',
                      channel === 'sms'
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-[#7a7a76] hover:text-[#26251e]'
                    )}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    SMS
                  </button>
                  <button
                    onClick={() => setChannel('call')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition-all',
                      channel === 'call'
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-[#7a7a76] hover:text-[#26251e]'
                    )}
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Appel
                  </button>
                </div>

                {/* AI Prepared Message Box */}
                <div className="relative rounded-2xl border border-emerald-500/30 bg-emerald-50/20 p-4 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-900">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Approche Pré-Générée par Minerva AI</span>
                    </div>
                    <button
                      onClick={() => setIsEditing((v) => !v)}
                      className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-white px-2 py-0.5 rounded-md border border-emerald-200 transition-colors"
                    >
                      <Edit3 className="h-3 w-3" />
                      {isEditing ? 'Verrouiller [M]' : 'Modifier le pitch [M]'}
                    </button>
                  </div>

                  {isEditing ? (
                    <textarea
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      rows={4}
                      className="w-full text-xs font-medium bg-white border border-emerald-300 rounded-xl p-3 text-[#26251e] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  ) : (
                    <div className="text-xs text-[#26251e] font-normal leading-relaxed whitespace-pre-line bg-white/70 p-3 rounded-xl border border-emerald-200/60 min-h-[90px]">
                      {customMessage}
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          ) : (
            /* Session Completed Screen */
            <div className="py-8 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-300">
              <div className="h-16 w-16 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-4 shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="h-9 w-9" />
              </div>
              <h3 className="text-xl font-black text-[#26251e]">Session Speed Run Terminée ! 🎉</h3>
              <p className="text-xs text-[#7a7a76] max-w-md mt-1">
                Vous avez traité l'intégralité de vos prospects chauds en un temps record.
              </p>

              {/* Stats recap */}
              <div className="grid grid-cols-3 gap-3 w-full max-w-sm mt-6">
                <div className="bg-[#fafaf8] border border-[#e5e5e0] p-3 rounded-xl">
                  <div className="text-xl font-black text-emerald-600">{stats.sent}</div>
                  <div className="text-[10px] font-bold text-[#7a7a76] uppercase">Envoyés</div>
                </div>
                <div className="bg-[#fafaf8] border border-[#e5e5e0] p-3 rounded-xl">
                  <div className="text-xl font-black text-blue-600">{stats.fieldAdded}</div>
                  <div className="text-[10px] font-bold text-[#7a7a76] uppercase">Tournées GPS</div>
                </div>
                <div className="bg-[#fafaf8] border border-[#e5e5e0] p-3 rounded-xl">
                  <div className="text-xl font-black text-[#7a7a76]">{stats.skipped}</div>
                  <div className="text-[10px] font-bold text-[#7a7a76] uppercase">Reportés</div>
                </div>
              </div>

              <div className="mt-8 flex items-center gap-3">
                <button
                  onClick={() => {
                    setCurrentIndex(0);
                    setIsCompleted(false);
                    setStats({ sent: 0, fieldAdded: 0, skipped: 0 });
                    setStreak(0);
                    setSecondsElapsed(0);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#555552] bg-[#f0f0ed] hover:bg-[#e5e5e2] rounded-xl transition-all"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Relancer une session
                </button>
                <button
                  onClick={onClose}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-md shadow-emerald-600/20"
                >
                  Retour au Cockpit
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Bar Footer with Keyboard Badges */}
        {!isCompleted && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-[#e5e5e0] bg-[#fafaf8] shrink-0">
            <button
              onClick={handleSkip}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#7a7a76] hover:text-[#26251e] bg-white border border-[#e5e5e0] rounded-xl hover:bg-[#f0f0ed] transition-all"
            >
              <SkipForward className="h-3.5 w-3.5" />
              <span>Passer</span>
              <kbd className="ml-1 text-[9px] font-mono bg-[#f0f0ed] px-1.5 py-0.5 rounded border border-[#e5e5e0]">
                Espace
              </kbd>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleAddToFieldTour}
                disabled={isSending}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#059669] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all"
              >
                <Navigation className="h-3.5 w-3.5" />
                <span>Ajouter à la tournée</span>
                <kbd className="ml-1 text-[9px] font-mono bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">
                  T
                </kbd>
              </button>

              <button
                onClick={handleValidateAndSend}
                disabled={isSending}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-md shadow-emerald-600/20 active:scale-95"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Valider & Envoyer</span>
                <kbd className="ml-1 text-[9px] font-mono bg-emerald-700/60 px-1.5 py-0.5 rounded text-emerald-100">
                  ↵ Entrée
                </kbd>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
