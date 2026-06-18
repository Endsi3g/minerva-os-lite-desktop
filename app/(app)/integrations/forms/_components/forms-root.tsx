'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Globe, Plus, Copy, CheckCircle2, Loader2, Trash2, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface InboundWebhook {
  id: string;
  name: string;
  platform: string;
  token: string;
  active: boolean;
  last_event_at: string | null;
  leads_created: number;
  created_at: string;
}

const PLATFORMS = [
  {
    id: 'typeform',
    name: 'Typeform',
    description: "Collez l'URL de webhook dans Typeform → Settings → Integrations → Webhooks",
    color: '#2563eb',
  },
  {
    id: 'tally',
    name: 'Tally',
    description: 'Ajoutez l\'URL dans Tally → Form → Integrations → Webhooks',
    color: '#1f2937',
  },
  {
    id: 'webflow',
    name: 'Webflow Forms',
    description: 'Utilisez Logic → Webhook Action dans le canvas Webflow',
    color: '#4f46e5',
  },
  {
    id: 'framer',
    name: 'Framer Forms',
    description: 'Dans Framer, Form component → Action → Submit → Webhook URL',
    color: '#06b6d4',
  },
  {
    id: 'other',
    name: 'Webhook Générique',
    description: 'Tout outil capable d\'envoyer un POST JSON (Zapier, Make, etc.)',
    color: '#059669',
  },
];

export function FormsRoot() {
  const [webhooks, setWebhooks] = useState<InboundWebhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadWebhooks = useCallback(async () => {
    const res = await fetch('/api/webhooks/inbound');
    if (res.ok) {
      const data = await res.json();
      setWebhooks(data.webhooks ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadWebhooks();
  }, [loadWebhooks]);

  const createWebhook = async (platform: { id: string; name: string }) => {
    setCreating(platform.id);
    const res = await fetch('/api/webhooks/inbound', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: platform.name, platform: platform.id }),
    });
    if (res.ok) {
      await loadWebhooks();
    }
    setCreating(null);
  };

  const deleteWebhook = async (id: string) => {
    setDeletingId(id);
    await fetch(`/api/webhooks/manage/${id}?table=inbound_webhooks`, { method: 'DELETE' });
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
    setDeletingId(null);
  };

  const copyUrl = (token: string) => {
    const url = `${window.location.origin}/api/webhooks/inbound/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    });
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return 'Jamais';
    return new Date(iso).toLocaleDateString('fr-CA', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
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
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/integrations"
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#e5e5e0] hover:bg-[#f4f4f3] text-[#7a7a76] hover:text-[#26251e] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-[#059669]" />
              <h1 className="text-base font-bold text-[#26251e]">Webhooks Inbound</h1>
            </div>
            <p className="text-xs text-[#7a7a76] mt-0.5">
              Captez vos leads entrants automatiquement — chaque soumission de formulaire crée un lead dans Minerva
            </p>
          </div>
        </div>

        {/* Platform cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {PLATFORMS.map((platform) => {
            const wh = webhooks.find((w) => w.platform === platform.id);
            const webhookUrl = wh
              ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/inbound/${wh.token}`
              : null;

            return (
              <div
                key={platform.id}
                className="rounded-xl border border-[#e5e5e0] bg-white p-5 space-y-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${platform.color}15`, border: `1px solid ${platform.color}30` }}
                  >
                    <Globe className="h-4 w-4" style={{ color: platform.color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#26251e]">{platform.name}</p>
                    <p className="text-[10px] text-[#7a7a76] leading-relaxed mt-0.5">{platform.description}</p>
                  </div>
                </div>

                {wh && webhookUrl ? (
                  <div className="space-y-3">
                    {/* Status */}
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          'text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                          wh.active
                            ? 'bg-[#059669]/10 text-[#059669] border-[#059669]/20'
                            : 'bg-neutral-100 text-neutral-500 border-neutral-200'
                        )}
                      >
                        {wh.active ? 'Actif' : 'Inactif'}
                      </span>
                      <span className="text-[10px] text-[#7a7a76]">
                        {wh.leads_created} lead{wh.leads_created !== 1 ? 's' : ''} créé{wh.leads_created !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Webhook URL */}
                    <div className="rounded-lg border border-[#e5e5e0] bg-[#f7f7f4] px-3 py-2 flex items-center gap-2">
                      <code className="text-[10px] text-[#555552] flex-1 truncate">{webhookUrl}</code>
                      <button
                        onClick={() => copyUrl(wh.token)}
                        className="shrink-0 h-6 w-6 flex items-center justify-center rounded text-[#7a7a76] hover:text-[#26251e] hover:bg-[#e5e5e0] transition-colors"
                        title="Copier l'URL"
                      >
                        {copiedToken === wh.token ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#059669]" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Last event */}
                    <p className="text-[10px] text-[#7a7a76]">
                      Dernier événement : {formatDate(wh.last_event_at)}
                    </p>

                    {/* Delete */}
                    <button
                      onClick={() => deleteWebhook(wh.id)}
                      disabled={deletingId === wh.id}
                      className="flex items-center gap-1.5 text-[10px] font-semibold text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                    >
                      {deletingId === wh.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                      Supprimer ce webhook
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => createWebhook(platform)}
                    disabled={creating === platform.id}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-[#e5e5e0] text-xs font-semibold text-[#7a7a76] hover:border-[#059669] hover:text-[#059669] hover:bg-[#059669]/5 transition-all disabled:opacity-60"
                  >
                    {creating === platform.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    Créer un webhook {platform.name}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* How it works */}
        <div className="rounded-xl border border-[#e5e5e0] bg-[#f7f7f4] p-5 space-y-2">
          <p className="text-xs font-bold text-[#26251e]">Comment ça fonctionne</p>
          <ol className="space-y-1 text-xs text-[#555552] list-decimal list-inside leading-relaxed">
            <li>Cliquez sur « Créer un webhook » pour obtenir votre URL unique.</li>
            <li>Copiez cette URL et collez-la dans votre outil de formulaire (Typeform, Tally, Webflow…).</li>
            <li>Chaque soumission de formulaire crée automatiquement un lead dans Minerva avec <code className="bg-white border border-[#e5e5e0] px-1 rounded text-[10px]">source=inbound_form:{'{'}platform{'}'}</code>.</li>
            <li>Retrouvez vos leads dans <Link href="/leads" className="text-[#059669] underline">Prospects</Link>.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
