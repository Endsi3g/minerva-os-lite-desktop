'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Loader2, Sparkles, MapPin, Phone, Globe, Star,
  MessageSquare, CheckCircle2, Users, ClipboardList, Send, Check,
  AlertCircle, RefreshCw,
} from 'lucide-react';
import { useReach } from '@/lib/reach-context';
import { getApiUrl } from '@/lib/api-helper';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

export default function FieldPreparePage() {
  const params = useParams();
  const router = useRouter();
  const planId = params.planId as string;
  const leadId = params.leadId as string;

  const { leads } = useReach();
  const lead = leads.find((l) => l.id === leadId);

  const [script, setScript] = useState('');
  const [loadingScript, setLoadingScript] = useState(false);
  const [preNotes, setPreNotes] = useState('');
  const [savedNotes, setSavedNotes] = useState(false);
  const [notified, setNotified] = useState(false);
  const [notifying, setNotifying] = useState(false);

  const generateScript = useCallback(async () => {
    if (!lead) return;
    setLoadingScript(true);
    setScript('');
    try {
      const res = await fetch(getApiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Tu es un assistant de vente expert. Génère un script de visite terrain court (5-7 points) pour rendre visite à ce prospect :\n\nEntreprise : ${lead.businessName}\nSecteur : ${lead.niche || 'non précisé'}\nSite web : ${lead.website || 'aucun'}\nNote Google : ${lead.rating || 'inconnue'}\nStatut actuel : ${lead.status || 'Nouveau'}\nNotes précédentes : ${lead.notes?.map(n => n.content).join(' | ') || 'aucune'}\n\nFormat : liste numérotée avec accroche, valeur proposée, objections probables et call-to-action. Sois direct, professionnel et adapté au terrain. Réponds en français.`,
          }],
          model: 'claude-haiku-4-5-20251001',
        }),
      });

      if (!res.body) throw new Error('No stream');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const json = JSON.parse(line.slice(6));
              if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta') {
                fullText += json.delta.text;
                setScript(fullText);
              }
            } catch { /* skip */ }
          }
        }
      }
    } catch (e) {
      setScript('Impossible de générer le script. Vérifiez votre connexion et réessayez.');
    } finally {
      setLoadingScript(false);
    }
  }, [lead]);

  useEffect(() => {
    if (lead) generateScript();
  }, [lead, generateScript]);

  const handleSaveNotes = async () => {
    if (!lead) return;
    setSavedNotes(false);
    try {
      const supabase = createClient();
      await supabase.from('leads').update({
        ai_notes: `[Pré-visite ${new Date().toLocaleDateString('fr-CA')}] ${preNotes}`,
      }).eq('id', lead.id);
      setSavedNotes(true);
      setTimeout(() => setSavedNotes(false), 2000);
    } catch { /* ignore */ }
  };

  const handleNotifyTeam = async () => {
    if (!lead) return;
    setNotifying(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Insert a team notification record
      await supabase.from('notifications').insert({
        user_id: user.id,
        title: `Visite terrain — ${lead.businessName}`,
        body: `Départ en visite chez ${lead.businessName}${lead.city ? ` (${lead.city})` : ''}. Notes : ${preNotes || 'aucune'}`,
        type: 'field_visit',
        is_read: false,
      });
      setNotified(true);
    } catch { /* ignore */ }
    finally { setNotifying(false); }
  };

  if (!lead) {
    return (
      <div className="flex h-full items-center justify-center gap-3 text-[#7a7a76]">
        <AlertCircle className="h-5 w-5" />
        <span className="text-sm">Lead introuvable dans ce plan.</span>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf8] font-sans text-[#26251e]">
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">

        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 rounded-xl border border-[#e5e5e0] hover:bg-[#f4f4f3] transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-black">Préparer la visite</h1>
            <p className="text-xs text-[#7a7a76] mt-0.5">{lead.businessName}</p>
          </div>
        </div>

        {/* Lead info card */}
        <div className="border border-[#e5e5e0] rounded-2xl p-5 bg-white space-y-3">
          <h2 className="text-base font-black">{lead.businessName}</h2>
          <div className="flex flex-wrap gap-3 text-xs text-[#7a7a76]">
            {lead.city && (
              <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{lead.city}</span>
            )}
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 hover:text-[#f54e00] transition-colors">
                <Phone className="h-3.5 w-3.5" />{lead.phone}
              </a>
            )}
            {lead.website && (
              <a href={lead.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-[#f54e00] transition-colors">
                <Globe className="h-3.5 w-3.5" />Site web
              </a>
            )}
            {lead.rating && (
              <span className="flex items-center gap-1 text-amber-500 font-bold">
                <Star className="h-3.5 w-3.5 fill-amber-400" />{lead.rating}
              </span>
            )}
          </div>
          {lead.niche && (
            <span className="inline-block text-[10px] font-bold px-2 py-1 rounded-lg border border-[#e5e5e0] bg-[#f4f4f3] text-[#7a7a76]">
              {lead.niche}
            </span>
          )}
        </div>

        {/* Past notes */}
        {lead.notes && lead.notes.length > 0 && (
          <div className="border border-[#e5e5e0] rounded-2xl p-5 bg-white space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
              <ClipboardList className="h-3.5 w-3.5" />
              Notes précédentes ({lead.notes.length})
            </div>
            {lead.notes.slice(0, 3).map((n, i) => (
              <p key={i} className="text-xs text-[#26251e] leading-relaxed whitespace-pre-line border-l-2 border-[#e5e5e0] pl-3">
                {n.content}
              </p>
            ))}
          </div>
        )}

        {/* AI Script */}
        <div className="border border-[#e5e5e0] rounded-2xl p-5 bg-white space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
              <Sparkles className="h-3.5 w-3.5" />
              Script IA de visite
            </div>
            <button
              onClick={generateScript}
              disabled={loadingScript}
              className="flex items-center gap-1 text-xs font-bold text-[#f54e00] hover:underline disabled:opacity-50"
            >
              <RefreshCw className={cn('h-3 w-3', loadingScript && 'animate-spin')} />
              Regénérer
            </button>
          </div>

          {loadingScript && !script && (
            <div className="flex items-center gap-2 text-xs text-[#7a7a76] py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Génération du script en cours…
            </div>
          )}

          {script && (
            <div className="text-xs text-[#26251e] leading-relaxed whitespace-pre-line bg-[#fafaf8] border border-[#e5e5e0] rounded-xl p-4">
              {script}
              {loadingScript && <span className="inline-block w-1 h-3 bg-[#f54e00] animate-pulse ml-0.5" />}
            </div>
          )}
        </div>

        {/* Pre-visit notes */}
        <div className="border border-[#e5e5e0] rounded-2xl p-5 bg-white space-y-4">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
            <MessageSquare className="h-3.5 w-3.5" />
            Notes avant visite
          </div>
          <textarea
            value={preNotes}
            onChange={(e) => setPreNotes(e.target.value)}
            placeholder="Objectif de la visite, produit à présenter, point de contact…"
            rows={4}
            className="w-full border border-[#e5e5e0] rounded-xl px-4 py-3 text-xs font-semibold text-[#26251e] outline-none focus:ring-1 focus:ring-[#f54e00] resize-none bg-[#fafaf8]"
          />
          <button
            onClick={handleSaveNotes}
            disabled={!preNotes.trim()}
            className="flex items-center gap-1.5 text-xs font-bold text-white px-4 py-2 rounded-xl disabled:opacity-50 transition-all"
            style={{ background: '#f54e00' }}
          >
            {savedNotes ? <Check className="h-3.5 w-3.5" /> : null}
            {savedNotes ? 'Sauvegardées !' : 'Sauvegarder les notes'}
          </button>
        </div>

        {/* Team notification */}
        <div className="border border-[#e5e5e0] rounded-2xl p-5 bg-white space-y-4">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
            <Users className="h-3.5 w-3.5" />
            Notification équipe
          </div>
          <p className="text-xs text-[#7a7a76]">
            Prévenez votre équipe que vous partez en visite chez <span className="font-bold text-[#26251e]">{lead.businessName}</span>.
          </p>
          <button
            onClick={handleNotifyTeam}
            disabled={notifying || notified}
            className={cn(
              'flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition-all disabled:opacity-70 border-2',
              notified ? 'border-[#059669] bg-[#059669]/10 text-[#059669]' : 'border-[#26251e] bg-[#26251e] text-white hover:bg-[#3d3c35]'
            )}
          >
            {notifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : notified ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
            {notified ? 'Équipe notifiée !' : 'Notifier l\'équipe'}
          </button>
        </div>

        {/* Go button */}
        <button
          onClick={() => router.push(`/field/${planId}/outcome/${leadId}`)}
          className="w-full py-4 rounded-2xl bg-[#26251e] text-white font-black text-sm hover:bg-[#3d3c35] transition-colors"
        >
          Démarrer la visite →
        </button>
      </div>
    </div>
  );
}
