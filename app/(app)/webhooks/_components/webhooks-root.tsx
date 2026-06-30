'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Zap, Plus, Loader2, Trash2, Play, ToggleLeft, ToggleRight, CheckCircle2, AlertCircle, X, ArrowDownLeft, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OutboundWebhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  secret: string | null;
  last_triggered_at: string | null;
  last_status: number | null;
  last_error: string | null;
  created_at: string;
}

const WEBHOOK_EVENTS = [
  { id: 'lead.created', label: 'Lead créé', description: 'Nouveau lead ajouté à Minerva' },
  { id: 'deal.won', label: 'Deal gagné', description: 'Lead passé au statut Gagné' },
  { id: 'lead.contacted', label: 'Lead contacté', description: 'Email ou appel envoyé à un lead' },
  { id: 'lead.reply_positive', label: 'Réponse positive', description: "Réponse positive reçue dans l'inbox" },
  { id: 'campaign.started', label: 'Campagne démarrée', description: 'Nouvelle campagne activée' },
];

const EVENT_COLORS: Record<string, string> = {
  'lead.created': 'bg-blue-50 text-blue-700 border-blue-200',
  'deal.won': 'bg-[#059669]/10 text-[#059669] border-[#059669]/20',
  'lead.contacted': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'lead.reply_positive': 'bg-amber-50 text-amber-700 border-amber-200',
  'campaign.started': 'bg-purple-50 text-purple-700 border-purple-200',
};

export function WebhooksRoot() {
  const [webhooks, setWebhooks] = useState<OutboundWebhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { success: boolean; status: number }>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formEvents, setFormEvents] = useState<string[]>([]);
  const [formSecret, setFormSecret] = useState('');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

  const loadWebhooks = useCallback(async () => {
    const res = await fetch('/api/webhooks/outbound');
    if (res.ok) {
      const data = await res.json();
      setWebhooks(data.webhooks ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadWebhooks();
  }, [loadWebhooks]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!formName.trim() || !formUrl.trim()) {
      setFormError('Nom et URL sont requis.');
      return;
    }
    try { new URL(formUrl); } catch {
      setFormError('URL invalide — doit commencer par https://');
      return;
    }
    if (formEvents.length === 0) {
      setFormError('Sélectionnez au moins un événement.');
      return;
    }
    setCreating(true);
    const res = await fetch('/api/webhooks/outbound', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formName.trim(),
        url: formUrl.trim(),
        events: formEvents,
        secret: formSecret.trim() || null,
      }),
    });
    if (res.ok) {
      setFormName(''); setFormUrl(''); setFormEvents([]); setFormSecret('');
      setShowAddForm(false);
      await loadWebhooks();
    } else {
      const d = await res.json();
      setFormError(d.error ?? 'Erreur lors de la création');
    }
    setCreating(false);
  };

  const toggleEvent = (eventId: string) => {
    setFormEvents((prev) =>
      prev.includes(eventId) ? prev.filter((e) => e !== eventId) : [...prev, eventId]
    );
  };

  const testWebhook = async (id: string) => {
    setTestingId(id);
    const res = await fetch(`/api/webhooks/outbound/${id}/test`, { method: 'POST' });
    const data = await res.json();
    setTestResult((prev) => ({ ...prev, [id]: { success: data.success, status: data.status } }));
    setTestingId(null);
    setTimeout(() => setTestResult((prev) => { const n = { ...prev }; delete n[id]; return n; }), 5000);
  };

  const toggleActive = async (wh: OutboundWebhook) => {
    const res = await fetch(`/api/webhooks/manage/${wh.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: 'outbound_webhooks', active: !wh.active }),
    });
    if (res.ok) {
      setWebhooks((prev) => prev.map((w) => w.id === wh.id ? { ...w, active: !w.active } : w));
    }
  };

  const deleteWebhook = async (id: string) => {
    setDeletingId(id);
    await fetch(`/api/webhooks/manage/${id}?table=outbound_webhooks`, { method: 'DELETE' });
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
    setDeletingId(null);
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return 'Jamais';
    return new Date(iso).toLocaleDateString('fr-CA', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#059669]" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf8]">
      <div className="w-full p-3 sm:p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap border-b border-[#e5e5e0] pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-5 w-5 text-[#059669]" />
              <h1 className="text-xl font-bold text-[#26251e]">Webhooks</h1>
            </div>
            <p className="text-xs text-[#7a7a76]">
              Envoyez des événements Minerva vers des systèmes externes (Slack, Make, Zapier…) ou recevez des événements entrants.
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold transition-colors shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter
          </button>
        </div>

        {/* Inbound webhooks (pre-configured) */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ArrowDownLeft className="h-3.5 w-3.5 text-[#7a7a76]" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Webhooks entrants</p>
          </div>
          <div className="bg-white border border-[#e5e5e0] rounded-xl px-4 py-3 flex items-center gap-4">
            <div className="w-9 h-9 rounded-xl bg-[#059669]/10 border border-[#059669]/20 flex items-center justify-center shrink-0">
              <Zap className="h-4 w-4 text-[#059669]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[#26251e]">Resend — Événements email</p>
              <p className="text-[10px] text-[#7a7a76] font-mono truncate">/api/webhooks/resend</p>
            </div>
            <div className="flex items-center gap-1.5 bg-[#059669]/8 border border-[#059669]/20 px-2.5 py-1 rounded-lg shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#059669] animate-pulse shrink-0" />
              <span className="text-[10px] font-bold text-[#059669]">Actif</span>
            </div>
            <a
              href="https://resend.com/webhooks"
              target="_blank"
              rel="noopener noreferrer"
              className="h-8 flex items-center gap-1 px-2.5 rounded-lg border border-[#e5e5e0] text-xs font-semibold text-[#555552] hover:bg-[#f4f4f3] transition-colors shrink-0"
            >
              <ExternalLink className="h-3 w-3" />
              Resend
            </a>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 text-[#7a7a76]" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Webhooks sortants</p>
        </div>

        {/* Add form */}
        {showAddForm && (
          <div className="rounded-xl border border-[#059669]/30 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-[#26251e]">Nouveau webhook sortant</p>
              <button onClick={() => setShowAddForm(false)} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-[#f4f4f3] text-[#7a7a76]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Nom</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Mon webhook Slack"
                    className="w-full text-xs px-3 py-2 border border-[#e5e5e0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#059669] bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">URL de destination</label>
                  <input
                    type="url"
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    placeholder="https://hooks.slack.com/…"
                    className="w-full text-xs px-3 py-2 border border-[#e5e5e0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#059669] bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
                  Secret (optionnel — envoyé dans X-Webhook-Secret)
                </label>
                <input
                  type="text"
                  value={formSecret}
                  onChange={(e) => setFormSecret(e.target.value)}
                  placeholder="mon_secret_webhook"
                  className="w-full text-xs px-3 py-2 border border-[#e5e5e0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#059669] bg-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Événements déclencheurs</label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {WEBHOOK_EVENTS.map((ev) => (
                    <label
                      key={ev.id}
                      className={cn(
                        'flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors',
                        formEvents.includes(ev.id)
                          ? 'border-[#059669]/40 bg-[#059669]/5'
                          : 'border-[#e5e5e0] hover:border-[#059669]/30 hover:bg-[#059669]/3'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={formEvents.includes(ev.id)}
                        onChange={() => toggleEvent(ev.id)}
                        className="mt-0.5 accent-[#059669]"
                      />
                      <div>
                        <p className="text-xs font-semibold text-[#26251e]">{ev.label}</p>
                        <p className="text-[10px] text-[#7a7a76]">{ev.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {formError && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs font-semibold">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 rounded-lg border border-[#e5e5e0] text-xs font-semibold text-[#555552] hover:bg-[#f4f4f3] transition-colors">
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold transition-colors disabled:opacity-60"
                >
                  {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Créer le webhook
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Empty state */}
        {webhooks.length === 0 && !showAddForm && (
          <div className="flex flex-col items-center gap-3 py-16 text-center rounded-xl border border-dashed border-[#e5e5e0]">
            <Zap className="h-8 w-8 text-[#7a7a76]/40" />
            <p className="text-sm font-bold text-[#26251e]">Aucun webhook configuré</p>
            <p className="text-xs text-[#7a7a76] max-w-xs">
              Créez un webhook pour envoyer automatiquement des événements Minerva vers Slack, Make, Zapier ou votre CRM.
            </p>
          </div>
        )}

        {/* Webhooks list */}
        {webhooks.length > 0 && (
          <div className="space-y-2">
            {webhooks.map((wh) => (
              <div
                key={wh.id}
                className={cn(
                  'rounded-xl border bg-white p-4 space-y-3 transition-all relative overflow-hidden',
                  wh.active
                    ? 'border-[#e5e5e0] border-l-[3px] border-l-[#059669]'
                    : 'border-[#e5e5e0] opacity-75',
                )}
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-[#26251e]">{wh.name}</p>
                      <div className={cn(
                        'flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[10px] font-bold',
                        wh.active
                          ? 'bg-[#059669]/8 text-[#059669] border-[#059669]/20'
                          : 'bg-neutral-50 text-neutral-400 border-neutral-200'
                      )}>
                        {wh.active && <span className="w-1.5 h-1.5 rounded-full bg-[#059669] animate-pulse shrink-0" />}
                        {wh.active ? 'Actif' : 'Inactif'}
                      </div>
                    </div>
                    <p className="text-[10px] text-[#7a7a76] mt-0.5 font-mono truncate max-w-sm">{wh.url}</p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Test button */}
                    <button
                      onClick={() => testWebhook(wh.id)}
                      disabled={testingId === wh.id}
                      className="h-8 flex items-center gap-1 px-2.5 rounded-lg border border-[#e5e5e0] text-xs font-semibold text-[#555552] hover:bg-[#f4f4f3] hover:text-[#26251e] transition-colors disabled:opacity-60"
                      title="Envoyer un événement test"
                    >
                      {testingId === wh.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Play className="h-3.5 w-3.5" />
                      )}
                      Tester
                    </button>

                    {/* Toggle active */}
                    <button
                      onClick={() => toggleActive(wh)}
                      className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#e5e5e0] text-[#7a7a76] hover:bg-[#f4f4f3] hover:text-[#26251e] transition-colors"
                      title={wh.active ? 'Désactiver' : 'Activer'}
                    >
                      {wh.active ? (
                        <ToggleRight className="h-4 w-4 text-[#059669]" />
                      ) : (
                        <ToggleLeft className="h-4 w-4" />
                      )}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => deleteWebhook(wh.id)}
                      disabled={deletingId === wh.id}
                      className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#e5e5e0] text-[#7a7a76] hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-60"
                      title="Supprimer"
                    >
                      {deletingId === wh.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Events */}
                <div className="flex flex-wrap gap-1.5">
                  {(Array.isArray(wh.events) ? wh.events : []).map((ev) => {
                    const evLabel = WEBHOOK_EVENTS.find((e) => e.id === ev)?.label ?? ev;
                    return (
                      <span
                        key={ev}
                        className={cn(
                          'text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                          EVENT_COLORS[ev] ?? 'bg-neutral-100 text-neutral-600 border-neutral-200'
                        )}
                      >
                        {evLabel}
                      </span>
                    );
                  })}
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-4 text-[10px] text-[#7a7a76]">
                  <span>Dernier déclenchement : {formatDate(wh.last_triggered_at)}</span>
                  {wh.last_status !== null && (
                    <span
                      className={cn(
                        'font-semibold',
                        wh.last_status >= 200 && wh.last_status < 300
                          ? 'text-[#059669]'
                          : 'text-red-600'
                      )}
                    >
                      HTTP {wh.last_status}
                    </span>
                  )}
                </div>

                {/* Test result */}
                {testResult[wh.id] && (
                  <div
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border',
                      testResult[wh.id].success
                        ? 'bg-[#059669]/10 text-[#059669] border-[#059669]/20'
                        : 'bg-red-50 text-red-700 border-red-200'
                    )}
                  >
                    {testResult[wh.id].success ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    )}
                    {testResult[wh.id].success
                      ? `Test réussi — HTTP ${testResult[wh.id].status}`
                      : `Test échoué — HTTP ${testResult[wh.id].status || 'timeout'}`}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
