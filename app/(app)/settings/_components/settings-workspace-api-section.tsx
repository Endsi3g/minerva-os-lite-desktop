'use client';

import React, { useEffect, useState } from 'react';
import { Copy, Download, Plus, Trash2, Eye, EyeOff, Cpu, Terminal } from 'lucide-react';
import { SettingsSectionWrapper } from './settings-section-wrapper';
import { createClient } from '@/lib/supabase/client';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed?: string;
}

export function SettingsWorkspaceApiSection() {
  const [workspaceId, setWorkspaceId] = useState('');
  const [apiUrl, setApiUrl] = useState('https://minerva-os-lite-desktop.vercel.app');
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        if (typeof window !== 'undefined') {
          setApiUrl(window.location.origin);
        }
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('settings')
            .select('workspace_id')
            .eq('user_id', user.id)
            .single();
          if (data?.workspace_id) setWorkspaceId(data.workspace_id);
        }
      } catch { /* silent */ }
    };
    load();
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCreateKey = () => {
    if (!newKeyName.trim()) return;
    const newKey: ApiKey = {
      id: crypto.randomUUID(),
      name: newKeyName.trim(),
      key: `mk_live_${crypto.randomUUID().replace(/-/g, '')}`,
      createdAt: new Date().toLocaleDateString('fr-CA'),
    };
    setApiKeys((prev) => [...prev, newKey]);
    setNewKeyName('');
    setShowCreate(false);
  };

  const handleDeleteKey = (id: string) => {
    setApiKeys((prev) => prev.filter((k) => k.id !== id));
  };

  const maskedKey = (key: string) => key.slice(0, 10) + '••••••••••••••••••••••••••••••••';

  return (
    <SettingsSectionWrapper
      title="API"
      description="Créez et gérez vos clés API, et consultez l'utilisation de votre espace de travail."
      isSaving={false}
    >
      {/* Cost & usage */}
      <div className="border border-[#e5e5e0] rounded-xl p-5 bg-white space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-[#26251e]">Coût API & budget</p>
            <p className="text-[11px] text-[#7a7a76] mt-0.5">Coûts de la période actuelle</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-[#26251e]">0,00 $</p>
            <p className="text-[10px] text-[#7a7a76]">/ 100,00 $ limite mensuelle</p>
          </div>
        </div>
        <div className="w-full bg-[#f4f4f3] rounded-full h-1.5">
          <div className="bg-[#059669] rounded-full h-1.5" style={{ width: '0%' }} />
        </div>
      </div>

      {/* Monthly limit */}
      <div className="border border-[#e5e5e0] rounded-xl p-5 bg-white">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-[#26251e]">Limite mensuelle</p>
            <p className="text-[11px] text-[#7a7a76] mt-0.5">Plafond de dépenses mensuel pour l'utilisation de l'API.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[#26251e]">100,00 $</span>
            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-[#e5e5e0] rounded-lg text-xs font-semibold text-[#26251e] hover:bg-[#f4f4f3] transition-colors">
              Modifier
            </button>
          </div>
        </div>
      </div>

      {/* Cost breakdown */}
      <div className="border border-[#e5e5e0] rounded-xl p-5 bg-white">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-[#26251e]">Détail des coûts</p>
            <p className="text-[11px] text-[#7a7a76] mt-0.5">Téléchargez un rapport complet de votre utilisation API.</p>
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 border border-[#e5e5e0] rounded-lg text-xs font-semibold text-[#26251e] hover:bg-[#f4f4f3] transition-colors">
            <Download className="w-3.5 h-3.5" />
            Télécharger CSV
          </button>
        </div>
      </div>

      {/* Workspace ID */}
      {workspaceId && (
        <div className="border border-[#e5e5e0] rounded-xl p-5 bg-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-[#26251e]">ID de l'espace de travail</p>
              <p className="text-[11px] text-[#7a7a76] mt-0.5">Utilisez cet ID pour identifier votre espace de travail.</p>
              <p className="text-xs font-mono text-[#26251e] mt-2">{workspaceId}</p>
            </div>
            <button
              onClick={() => handleCopy(workspaceId, 'workspace-id')}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[#e5e5e0] rounded-lg text-xs font-semibold text-[#26251e] hover:bg-[#f4f4f3] transition-colors shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied === 'workspace-id' ? 'Copié !' : 'Copier'}
            </button>
          </div>
        </div>
      )}

      {/* Hermes Agent Integration */}
      <div className="border border-emerald-500/20 rounded-xl p-5 bg-white/50 space-y-4">
        <div className="flex items-center gap-2 text-emerald-600">
          <Cpu className="w-5 h-5 shrink-0" />
          <p className="text-sm font-bold">Configuration Hermes Agent ⚡</p>
        </div>
        <p className="text-[11px] text-[#7a7a76] leading-relaxed">
          Hermes Agent est une couche d'automatisation autonome qui interagit avec votre CRM via des plateformes de messagerie (Telegram, Discord, SMS) et des cron-jobs planifiés.
        </p>

        <div className="space-y-3 pt-2">
          {/* API URL Config */}
          <div className="flex items-center justify-between gap-4 p-3 bg-[#f4f4f3]/40 rounded-lg border border-[#e5e5e0]/70">
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-[#7a7a76] uppercase tracking-wider">MINERVA_API_URL</p>
              <p className="text-xs font-mono text-[#26251e] mt-1 truncate">{apiUrl}</p>
            </div>
            <button
              onClick={() => handleCopy(apiUrl, 'hermes-api-url')}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[#e5e5e0] rounded-lg text-xs font-semibold text-[#26251e] hover:bg-[#f4f4f3] transition-colors shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied === 'hermes-api-url' ? 'Copié !' : 'Copier'}
            </button>
          </div>

          {/* Workspace ID Config */}
          <div className="flex items-center justify-between gap-4 p-3 bg-[#f4f4f3]/40 rounded-lg border border-[#e5e5e0]/70">
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-[#7a7a76] uppercase tracking-wider">WORKSPACE_ID</p>
              <p className="text-xs font-mono text-[#26251e] mt-1 truncate">{workspaceId}</p>
            </div>
            <button
              onClick={() => handleCopy(workspaceId, 'hermes-workspace-id')}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[#e5e5e0] rounded-lg text-xs font-semibold text-[#26251e] hover:bg-[#f4f4f3] transition-colors shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied === 'hermes-workspace-id' ? 'Copié !' : 'Copier'}
            </button>
          </div>

          {/* Service Token Note */}
          <div className="p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
            <p className="text-[11px] font-bold text-emerald-700">
              Jeton de service sécurisé
            </p>
            <p className="text-[10px] text-emerald-600/90 mt-1 leading-relaxed">
              Assurez-vous de définir le jeton secret <code className="font-mono bg-emerald-500/10 px-1 py-0.5 rounded text-[10px]">HERMES_SERVICE_TOKEN</code> sur votre serveur Hermes et dans les variables d'environnement de Minerva (Vercel) pour valider et sécuriser les échanges.
            </p>
          </div>
        </div>
      </div>

      {/* API Keys */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-[#26251e]">Clés API</p>
            <p className="text-[11px] text-[#7a7a76] mt-0.5">
              Les clés API ne sont pas disponibles sur le plan gratuit.{' '}
              <span className="text-[#059669] cursor-pointer hover:underline">Mettez à niveau votre plan</span>{' '}
              pour créer des clés API.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-3 py-1.5 border border-[#e5e5e0] rounded-lg text-xs font-semibold text-[#26251e] hover:bg-[#f4f4f3] transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Créer une clé API
          </button>
        </div>

        {showCreate && (
          <div className="border border-[#e5e5e0] rounded-xl p-4 bg-white space-y-3 animate-in fade-in duration-150">
            <p className="text-xs font-bold text-[#26251e]">Nouvelle clé API</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nom de la clé..."
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateKey()}
                autoFocus
                className="flex-1 text-xs px-3.5 py-2 border border-[#e5e5e0] rounded-lg focus:outline-none focus:ring-1 focus:ring-primary bg-[#fafaf8] text-[#26251e]"
              />
              <button
                onClick={() => setShowCreate(false)}
                className="px-3 py-2 text-xs border border-[#e5e5e0] rounded-lg hover:bg-[#f4f4f3] transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateKey}
                disabled={!newKeyName.trim()}
                className="px-4 py-2 bg-[#059669] text-white text-xs font-bold rounded-lg hover:bg-[#059669]/90 transition-colors disabled:opacity-50"
              >
                Créer
              </button>
            </div>
          </div>
        )}

        <div className="border border-[#e5e5e0] rounded-xl overflow-hidden bg-white">
          {apiKeys.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-[#7a7a76]">
              Aucune clé API active.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {apiKeys.map((k) => (
                <div key={k.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#26251e]">{k.name}</p>
                    <p className="text-[10px] font-mono text-[#7a7a76] mt-0.5 truncate">
                      {revealedKey === k.id ? k.key : maskedKey(k.key)}
                    </p>
                    <p className="text-[10px] text-[#7a7a76] mt-0.5">Créée le {k.createdAt}</p>
                  </div>
                  <button
                    onClick={() => setRevealedKey(revealedKey === k.id ? null : k.id)}
                    className="p-1.5 rounded-md hover:bg-[#f4f4f3] text-[#7a7a76] transition-colors"
                  >
                    {revealedKey === k.id ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => handleCopy(k.key, k.id)}
                    className="p-1.5 rounded-md hover:bg-[#f4f4f3] text-[#7a7a76] transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteKey(k.id)}
                    className="p-1.5 rounded-md hover:bg-[#f4f4f3] text-destructive transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SettingsSectionWrapper>
  );
}
