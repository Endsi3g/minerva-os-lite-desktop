'use client';

import React, { useEffect, useState } from 'react';
import { Copy, Download, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
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
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
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
      <div className="border border-border rounded-xl p-5 bg-card space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-foreground">Coût API & budget</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Coûts de la période actuelle</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-foreground">0,00 $</p>
            <p className="text-[10px] text-muted-foreground">/ 100,00 $ limite mensuelle</p>
          </div>
        </div>
        <div className="w-full bg-muted rounded-full h-1.5">
          <div className="bg-primary rounded-full h-1.5" style={{ width: '0%' }} />
        </div>
      </div>

      {/* Monthly limit */}
      <div className="border border-border rounded-xl p-5 bg-card">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-foreground">Limite mensuelle</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Plafond de dépenses mensuel pour l'utilisation de l'API.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">100,00 $</span>
            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs font-semibold text-foreground hover:bg-muted transition-colors">
              Modifier
            </button>
          </div>
        </div>
      </div>

      {/* Cost breakdown */}
      <div className="border border-border rounded-xl p-5 bg-card">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-foreground">Détail des coûts</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Téléchargez un rapport complet de votre utilisation API.</p>
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg text-xs font-semibold text-foreground hover:bg-muted transition-colors">
            <Download className="w-3.5 h-3.5" />
            Télécharger CSV
          </button>
        </div>
      </div>

      {/* Workspace ID */}
      {workspaceId && (
        <div className="border border-border rounded-xl p-5 bg-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-foreground">ID de l'espace de travail</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Utilisez cet ID pour identifier votre espace de travail.</p>
              <p className="text-xs font-mono text-foreground mt-2">{workspaceId}</p>
            </div>
            <button
              onClick={() => handleCopy(workspaceId, 'workspace-id')}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs font-semibold text-foreground hover:bg-muted transition-colors shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied === 'workspace-id' ? 'Copié !' : 'Copier'}
            </button>
          </div>
        </div>
      )}

      {/* API Keys */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-foreground">Clés API</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Les clés API ne sont pas disponibles sur le plan gratuit.{' '}
              <span className="text-primary cursor-pointer hover:underline">Mettez à niveau votre plan</span>{' '}
              pour créer des clés API.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg text-xs font-semibold text-foreground hover:bg-muted transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Créer une clé API
          </button>
        </div>

        {showCreate && (
          <div className="border border-border rounded-xl p-4 bg-card space-y-3 animate-in fade-in duration-150">
            <p className="text-xs font-bold text-foreground">Nouvelle clé API</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nom de la clé..."
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateKey()}
                autoFocus
                className="flex-1 text-xs px-3.5 py-2 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary bg-background text-foreground"
              />
              <button
                onClick={() => setShowCreate(false)}
                className="px-3 py-2 text-xs border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateKey}
                disabled={!newKeyName.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Créer
              </button>
            </div>
          </div>
        )}

        <div className="border border-border rounded-xl overflow-hidden bg-card">
          {apiKeys.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-muted-foreground">
              Aucune clé API active.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {apiKeys.map((k) => (
                <div key={k.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">{k.name}</p>
                    <p className="text-[10px] font-mono text-muted-foreground mt-0.5 truncate">
                      {revealedKey === k.id ? k.key : maskedKey(k.key)}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Créée le {k.createdAt}</p>
                  </div>
                  <button
                    onClick={() => setRevealedKey(revealedKey === k.id ? null : k.id)}
                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                  >
                    {revealedKey === k.id ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => handleCopy(k.key, k.id)}
                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteKey(k.id)}
                    className="p-1.5 rounded-md hover:bg-muted text-destructive transition-colors"
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
