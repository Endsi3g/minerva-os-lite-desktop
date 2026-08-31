'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sparkles, Loader2, RefreshCw, Copy, Check, Image as ImageIcon,
  FileText, GitBranch, Library, ClipboardPaste, Send, Upload, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useReach } from '@/lib/reach-context';
import { getApiUrl } from '@/lib/api-helper';
import { cn } from '@/lib/utils';
import type { Lead } from '@/lib/mock-data';
import { LeadHeatBadge } from '@/components/lead-heat-badge';
import { CallScriptFlowchart, type ScriptFlowchart } from '@/components/call-script-flowchart';

interface ScriptTemplate {
  id: string;
  title: string;
  content: string;
  format: 'text' | 'flowchart';
  is_shared: boolean;
  owner_user_id: string;
}

type ScriptMode = 'ai' | 'paste' | 'library';
type ScriptFormat = 'text' | 'flowchart';
type ScreenshotKind = 'website' | 'social' | 'conversation';

const SCREENSHOT_KINDS: Array<{ key: ScreenshotKind; label: string }> = [
  { key: 'website', label: 'Site / Google' },
  { key: 'social', label: 'Réseaux sociaux' },
  { key: 'conversation', label: 'Échange précédent' },
];

/**
 * Shared script + screenshot + live-notes panel used by both the Field
 * (visite terrain) and Calls (appel) prepare screens — same AI engine
 * (`/api/generate-script`), same note history, same team-notification path.
 */
export function CallPrepPanel({ lead, channel }: { lead: Lead; channel: 'field' | 'call' }) {
  const { activeWorkspace, addNoteToLead } = useReach();

  // ── Script generation state ────────────────────────────────────────────
  const [mode, setMode] = useState<ScriptMode>('ai');
  const [format, setFormat] = useState<ScriptFormat>('text');
  const [pastedScript, setPastedScript] = useState('');
  const [templateStyle, setTemplateStyle] = useState<string | null>(null);
  const [templateStyleName, setTemplateStyleName] = useState<string | null>(null);
  const [script, setScript] = useState<string | null>(null);
  const [flowchart, setFlowchart] = useState<ScriptFlowchart | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // ── Template library state ─────────────────────────────────────────────
  const [templates, setTemplates] = useState<ScriptTemplate[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [extracting, setExtracting] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateShared, setTemplateShared] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  // ── Screenshot analysis state ──────────────────────────────────────────
  const screenshotInputRef = useRef<HTMLInputElement>(null);
  const [pendingKind, setPendingKind] = useState<ScreenshotKind | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [screenshotAnalysis, setScreenshotAnalysis] = useState<string | null>(null);

  // ── Live notes state ────────────────────────────────────────────────────
  const [liveNote, setLiveNote] = useState('');
  const [sendingNote, setSendingNote] = useState(false);
  const [noteSent, setNoteSent] = useState(false);

  const refreshTemplates = useCallback(() => {
    if (!activeWorkspace) return;
    fetch(getApiUrl(`/api/script-templates?workspace_id=${activeWorkspace.id}`))
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setTemplates(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [activeWorkspace]);

  useEffect(() => { refreshTemplates(); }, [refreshTemplates]);

  const saveableContent = pastedScript.trim() || script || '';

  const handleSaveAsTemplate = async () => {
    if (!activeWorkspace || !templateTitle.trim() || !saveableContent) return;
    setSavingTemplate(true);
    try {
      const res = await fetch(getApiUrl('/api/script-templates'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: activeWorkspace.id,
          title: templateTitle.trim(),
          content: saveableContent,
          format: 'text',
          source: templateStyleName ? 'imported' : 'manual',
          is_shared: templateShared,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error || 'Sauvegarde du template impossible.');
        return;
      }
      toast.success(`Template "${templateTitle.trim()}" enregistré${templateShared ? ' et partagé à l\'équipe' : ''}.`);
      setShowSaveForm(false);
      setTemplateTitle('');
      setTemplateShared(false);
      refreshTemplates();
    } catch {
      toast.error('Erreur réseau lors de la sauvegarde du template.');
    } finally {
      setSavingTemplate(false);
    }
  };

  const generateScript = useCallback(async () => {
    setGenerating(true);
    setScript(null);
    setFlowchart(null);
    try {
      const res = await fetch(getApiUrl('/api/generate-script'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: lead.businessName,
          niche: lead.niche,
          city: lead.city,
          website: lead.website,
          websiteDescription: lead.websiteDescription,
          phone: lead.phone,
          rating: lead.rating,
          reviewsCount: lead.reviewsCount,
          temperature: lead.temperature,
          contactName: lead.contactName,
          notes: lead.notes,
          format,
          oneOffScript: mode === 'paste' || mode === 'library' ? pastedScript || undefined : undefined,
          templateStyle: templateStyle || undefined,
          screenshotAnalysis: screenshotAnalysis || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || 'Génération du script impossible.');
        return;
      }
      if (format === 'flowchart') setFlowchart(data.flowchart);
      else setScript(data.script);
    } catch {
      toast.error('Erreur réseau lors de la génération du script.');
    } finally {
      setGenerating(false);
    }
  }, [lead, mode, format, pastedScript, templateStyle, screenshotAnalysis]);

  const handlePickTemplate = (tpl: ScriptTemplate) => {
    setPastedScript(tpl.content);
    setMode('paste');
    if (tpl.format === 'flowchart') setFormat('flowchart');
    toast.success(`Template "${tpl.title}" chargé — adapte-le au prospect.`);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setExtracting(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(getApiUrl('/api/script-templates/extract'), { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "Extraction impossible.");
        return;
      }
      setTemplateStyle(data.text);
      setTemplateStyleName(file.name);
      toast.success('Fichier importé — utilisé comme guide de style pour la génération.');
    } catch {
      toast.error("Erreur réseau lors de l'import du fichier.");
    } finally {
      setExtracting(false);
    }
  };

  const handleScreenshotPick = (kind: ScreenshotKind) => {
    setPendingKind(kind);
    screenshotInputRef.current?.click();
  };

  const handleScreenshotFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const kind = pendingKind;
    e.target.value = '';
    if (!file || !kind) return;
    setAnalyzing(true);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string) || '');
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch(getApiUrl('/api/analyze-screenshot'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl: dataUrl, kind, leadId: lead.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || 'Analyse de la capture impossible.');
        return;
      }
      setScreenshotAnalysis(data.analysis);
      // Also save as a note on the lead so the analysis is kept in its history.
      await addNoteToLead(lead.id, `📸 Analyse capture (${kind}) :\n${data.analysis}`, channel === 'call' ? 'call' : 'visit');
      toast.success('Capture analysée — ajoutée au contexte et aux notes.');
    } catch {
      toast.error("Erreur réseau lors de l'analyse de la capture.");
    } finally {
      setAnalyzing(false);
      setPendingKind(null);
    }
  };

  const handleCopy = async () => {
    if (!script) return;
    await navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSendNote = async () => {
    if (!liveNote.trim() || !activeWorkspace) return;
    setSendingNote(true);
    try {
      await addNoteToLead(lead.id, liveNote.trim(), channel === 'call' ? 'call' : 'visit');
      const ownerId = (activeWorkspace as { owner_id?: string }).owner_id;
      await fetch(getApiUrl('/api/notifications/team'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: activeWorkspace.id,
          workspaceOwnerId: ownerId,
          title: `Note ${channel === 'call' ? "d'appel" : 'de visite'} — ${lead.businessName}`,
          body: liveNote.trim(),
          type: 'field_visit',
          link: `/leads/${lead.id}`,
        }),
      }).catch(() => {});
      setLiveNote('');
      setNoteSent(true);
      setTimeout(() => setNoteSent(false), 2000);
    } catch {
      toast.error("Impossible d'envoyer la note.");
    } finally {
      setSendingNote(false);
    }
  };

  return (
    <div className="space-y-6">
      <LeadHeatBadge lead={lead} />

      {/* Script generation */}
      <div className="border border-[#e5e5e0] rounded-xl p-5 bg-white space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
            <Sparkles className="h-3.5 w-3.5" />
            Script IA
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-[#e5e5e0] p-0.5">
            <button
              onClick={() => setFormat('text')}
              className={cn('flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold', format === 'text' ? 'bg-[#26251e] text-white' : 'text-[#7a7a76]')}
            >
              <FileText className="h-3 w-3" /> Texte
            </button>
            <button
              onClick={() => setFormat('flowchart')}
              className={cn('flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold', format === 'flowchart' ? 'bg-[#26251e] text-white' : 'text-[#7a7a76]')}
            >
              <GitBranch className="h-3 w-3" /> Graphique
            </button>
          </div>
        </div>

        {/* Source mode */}
        <div className="flex items-center gap-1 rounded-lg border border-[#e5e5e0] p-0.5 w-fit">
          <button onClick={() => setMode('ai')} className={cn('px-2.5 py-1 rounded-md text-[10px] font-bold', mode === 'ai' ? 'bg-[#059669] text-white' : 'text-[#7a7a76]')}>
            IA
          </button>
          <button onClick={() => setMode('paste')} className={cn('flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold', mode === 'paste' ? 'bg-[#059669] text-white' : 'text-[#7a7a76]')}>
            <ClipboardPaste className="h-3 w-3" /> Coller un script
          </button>
          <button onClick={() => setMode('library')} className={cn('flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold', mode === 'library' ? 'bg-[#059669] text-white' : 'text-[#7a7a76]')}>
            <Library className="h-3 w-3" /> Bibliothèque
          </button>
        </div>

        {mode === 'paste' && (
          <textarea
            value={pastedScript}
            onChange={(e) => setPastedScript(e.target.value)}
            placeholder="Colle ton script ici — l'IA l'adaptera à ce prospect précis…"
            rows={5}
            className="w-full border border-[#e5e5e0] rounded-xl px-4 py-3 text-xs font-semibold text-[#26251e] outline-none focus:ring-1 focus:ring-[#059669] resize-none bg-[#fafaf8]"
          />
        )}

        {mode === 'library' && (
          <div className="space-y-2">
            {templates.length === 0 ? (
              <p className="text-xs text-[#7a7a76]">Aucun template pour l&apos;instant.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => handlePickTemplate(tpl)}
                    className="text-left border border-[#e5e5e0] rounded-lg px-3 py-2 hover:border-[#059669] transition-colors"
                  >
                    <div className="text-xs font-bold text-[#26251e] truncate">{tpl.title}</div>
                    <div className="text-[10px] text-[#7a7a76]">{tpl.is_shared ? 'Partagé équipe' : 'Privé'} · {tpl.format === 'flowchart' ? 'Graphique' : 'Texte'}</div>
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={extracting}
              className="flex items-center gap-1.5 text-xs font-bold text-[#059669] hover:underline disabled:opacity-50"
            >
              {extracting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              Importer un fichier de référence (PDF, Word, txt)
            </button>
            <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={handleImportFile} />
          </div>
        )}

        {templateStyleName && (
          <div className="flex items-center gap-2 text-[10px] text-[#7a7a76] bg-[#fafaf8] border border-[#e5e5e0] rounded-lg px-3 py-2">
            <FileText className="h-3 w-3" />
            Style de référence : {templateStyleName}
            <button onClick={() => { setTemplateStyle(null); setTemplateStyleName(null); }} className="ml-auto">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Screenshot analysis */}
        <div className="flex flex-wrap items-center gap-2">
          {SCREENSHOT_KINDS.map((k) => (
            <button
              key={k.key}
              onClick={() => handleScreenshotPick(k.key)}
              disabled={analyzing}
              className="flex items-center gap-1 text-[10px] font-bold text-[#7a7a76] border border-[#e5e5e0] rounded-lg px-2.5 py-1.5 hover:border-[#059669] hover:text-[#059669] disabled:opacity-50"
            >
              {analyzing && pendingKind === k.key ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImageIcon className="h-3 w-3" />}
              {k.label}
            </button>
          ))}
          <input ref={screenshotInputRef} type="file" accept="image/*" className="hidden" onChange={handleScreenshotFile} />
        </div>

        {screenshotAnalysis && (
          <div className="text-[11px] text-[#26251e] leading-relaxed whitespace-pre-line bg-[#fafaf8] border border-[#e5e5e0] rounded-lg p-3">
            {screenshotAnalysis}
          </div>
        )}

        <button
          onClick={generateScript}
          disabled={generating || (mode !== 'ai' && !pastedScript.trim())}
          className="flex items-center justify-center gap-1.5 w-full text-xs font-bold text-white px-4 py-2.5 rounded-xl disabled:opacity-50 transition-all"
          style={{ background: '#059669' }}
        >
          {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {script || flowchart ? 'Régénérer' : 'Générer le script'}
        </button>

        {generating && !script && !flowchart && (
          <div className="flex items-center gap-2 text-xs text-[#7a7a76] py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Génération en cours…
          </div>
        )}

        {script && (
          <div className="space-y-2">
            <div className="text-xs text-[#26251e] leading-relaxed whitespace-pre-line bg-[#fafaf8] border border-[#e5e5e0] rounded-xl p-4">
              {script}
            </div>
            <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs font-bold text-[#059669] hover:underline">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copié !' : 'Copier le script'}
            </button>
          </div>
        )}

        {flowchart && <CallScriptFlowchart flowchart={flowchart} />}

        {saveableContent && (
          <div className="border-t border-[#e5e5e0] pt-3">
            {!showSaveForm ? (
              <button
                onClick={() => setShowSaveForm(true)}
                className="flex items-center gap-1.5 text-xs font-bold text-[#7a7a76] hover:text-[#059669]"
              >
                <Library className="h-3.5 w-3.5" />
                Sauvegarder comme template réutilisable
              </button>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={templateTitle}
                  onChange={(e) => setTemplateTitle(e.target.value)}
                  placeholder="Nom du template (ex: Ouverture froid — commerces locaux)"
                  className="w-full border border-[#e5e5e0] rounded-lg px-3 py-2 text-xs font-semibold text-[#26251e] outline-none focus:ring-1 focus:ring-[#059669] bg-[#fafaf8]"
                />
                <label className="flex items-center gap-1.5 text-[10px] font-bold text-[#7a7a76]">
                  <input type="checkbox" checked={templateShared} onChange={(e) => setTemplateShared(e.target.checked)} />
                  Partager avec toute l&apos;équipe
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveAsTemplate}
                    disabled={!templateTitle.trim() || savingTemplate}
                    className="flex items-center gap-1.5 text-xs font-bold text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
                    style={{ background: '#059669' }}
                  >
                    {savingTemplate ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Enregistrer
                  </button>
                  <button onClick={() => setShowSaveForm(false)} className="text-xs font-bold text-[#7a7a76]">
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Live notes */}
      <div className="border border-[#e5e5e0] rounded-xl p-5 bg-white space-y-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
          Notes en direct
        </div>
        <textarea
          value={liveNote}
          onChange={(e) => setLiveNote(e.target.value)}
          placeholder={channel === 'call' ? "Note rapide pendant l'appel…" : 'Note rapide pendant la visite…'}
          rows={3}
          className="w-full border border-[#e5e5e0] rounded-xl px-4 py-3 text-xs font-semibold text-[#26251e] outline-none focus:ring-1 focus:ring-[#059669] resize-none bg-[#fafaf8]"
        />
        <button
          onClick={handleSendNote}
          disabled={!liveNote.trim() || sendingNote}
          className="flex items-center gap-1.5 text-xs font-bold text-white px-4 py-2 rounded-xl disabled:opacity-50 transition-all"
          style={{ background: '#26251e' }}
        >
          {sendingNote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : noteSent ? <Check className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
          {noteSent ? 'Envoyée à l\'équipe !' : 'Envoyer à l\'équipe'}
        </button>
      </div>
    </div>
  );
}
