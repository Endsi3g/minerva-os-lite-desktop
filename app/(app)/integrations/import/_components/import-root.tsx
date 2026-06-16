'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, Zap, Workflow, MessageSquare, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { addImportedIntegration, type ImportedIntegration } from '@/lib/onboarding-store';

type ImportTab = 'catalog' | 'json';
type AuthMethod = ImportedIntegration['authMethod'];

const CATALOG_ITEMS: { id: string; name: string; description: string; category: string; authMethod: AuthMethod; icon: React.ComponentType<{ className?: string }> }[] = [
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Connecte Minerva à plus de 6000 applications via des automatisations Zapier.',
    category: 'automation',
    authMethod: 'key',
    icon: Zap,
  },
  {
    id: 'make',
    name: 'Make',
    description: 'Construis des scénarios visuels qui synchronisent tes leads et tâches avec Make.',
    category: 'automation',
    authMethod: 'oauth',
    icon: Workflow,
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Reçois des notifications de prospection et de pipeline directement dans Slack.',
    category: 'communication',
    authMethod: 'oauth',
    icon: MessageSquare,
  },
];

export function ImportRoot() {
  const router = useRouter();
  const [tab, setTab] = useState<ImportTab>('catalog');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('custom');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('none');
  const [jsonDraft, setJsonDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const applyCatalogItem = (item: typeof CATALOG_ITEMS[number]) => {
    setName(item.name);
    setDescription(item.description);
    setCategory(item.category);
    setAuthMethod(item.authMethod);
    setJsonDraft(JSON.stringify({ name: item.name, description: item.description, category: item.category, authMethod: item.authMethod }, null, 2));
    setTab('json');
    setError(null);
  };

  const applyJsonDraft = () => {
    if (!jsonDraft.trim()) {
      setError('Colle une configuration JSON valide.');
      return;
    }
    try {
      const parsed = JSON.parse(jsonDraft);
      if (!parsed.name || typeof parsed.name !== 'string') {
        setError('Le champ "name" est requis dans le JSON.');
        return;
      }
      setName(parsed.name);
      setDescription(typeof parsed.description === 'string' ? parsed.description : '');
      setCategory(typeof parsed.category === 'string' ? parsed.category : 'custom');
      setAuthMethod(['none', 'key', 'oauth'].includes(parsed.authMethod) ? parsed.authMethod : 'none');
      setError(null);
    } catch {
      setError('JSON invalide — vérifie la syntaxe.');
    }
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      setError('Le nom de l\'intégration est requis.');
      return;
    }
    const id = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `integration-${Date.now()}`;
    addImportedIntegration({
      id,
      name: name.trim(),
      description: description.trim() || 'Intégration importée.',
      category,
      authMethod,
    });
    setSuccess(true);
    setTimeout(() => router.push('/integrations'), 900);
  };

  return (
    <div className="h-full overflow-y-auto min-h-0 scrollbar-thin bg-white text-[#26251e]">
      <div className="mx-auto max-w-3xl flex flex-col gap-6 p-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/integrations')}
            className="h-8 w-8 flex items-center justify-center rounded-md border border-[#e5e5e0] hover:bg-slate-50 text-[#555552]"
            aria-label="Retour aux intégrations"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-base font-bold text-[#26251e]">Importer une intégration</h1>
            <p className="text-xs text-[#7a7a76]">Depuis le catalogue Minerva ou une configuration JSON personnalisée.</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-lg bg-[#f4f4f3] border border-[#e5e5e0] w-fit">
          {([
            { id: 'catalog' as const, label: 'Depuis le catalogue' },
            { id: 'json' as const, label: 'Configuration JSON' },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'px-4 py-1.5 rounded-md text-xs font-bold transition-all',
                tab === t.id
                  ? 'bg-white text-[#26251e] shadow-xs border border-[#e5e5e0]'
                  : 'text-[#7a7a76] hover:text-[#26251e]'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Catalog tab */}
        {tab === 'catalog' && (
          <div className="grid gap-3 sm:grid-cols-2">
            {CATALOG_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => applyCatalogItem(item)}
                  className="text-left p-4 rounded-xl border border-[#e5e5e0] bg-white hover:border-[#059669]/40 hover:shadow-xs transition-all flex flex-col gap-2"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#059669]/10 flex items-center justify-center border border-[#059669]/20">
                    <Icon className="h-4.5 w-4.5 text-[#059669]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#26251e]">{item.name}</p>
                    <p className="text-[11px] text-[#7a7a76] leading-relaxed mt-0.5">{item.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* JSON tab */}
        {tab === 'json' && (
          <div className="flex flex-col gap-4">
            <div className="grid gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Configuration JSON (optionnel)</label>
              <textarea
                value={jsonDraft}
                onChange={(e) => setJsonDraft(e.target.value)}
                placeholder={'{\n  "name": "Mon intégration",\n  "description": "...",\n  "category": "automation",\n  "authMethod": "key"\n}'}
                rows={8}
                className="text-xs font-mono bg-[#f4f4f3] border border-[#e5e5e0] rounded-md p-3 resize-none focus:outline-none focus:ring-1 focus:ring-[#059669] focus:border-[#059669]"
              />
              <Button type="button" variant="outline" onClick={applyJsonDraft} className="h-8 text-xs font-bold w-fit">
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Charger ce JSON dans le formulaire
              </Button>
            </div>

            <div className="border-t border-[#e5e5e0] pt-4 grid gap-3">
              <div className="grid gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Nom</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mon intégration" className="text-xs" />
              </div>
              <div className="grid gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Description</label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="À quoi sert cette intégration ?" className="text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Catégorie</label>
                  <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="custom" className="text-xs" />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Authentification</label>
                  <select
                    value={authMethod}
                    onChange={(e) => setAuthMethod(e.target.value as AuthMethod)}
                    className="h-9 text-xs bg-white border border-[#e5e5e0] rounded-md px-2.5 focus:outline-none focus:ring-1 focus:ring-[#059669] focus:border-[#059669]"
                  >
                    <option value="none">Aucune</option>
                    <option value="key">Clé API</option>
                    <option value="oauth">OAuth</option>
                  </select>
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md p-2.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </div>
            )}

            {success ? (
              <div className="flex items-center gap-2 text-xs text-[#059669] bg-[#059669]/5 border border-[#059669]/20 rounded-md p-2.5">
                <Check className="h-3.5 w-3.5 shrink-0" />
                Intégration importée — redirection...
              </div>
            ) : (
              <Button onClick={handleSubmit} className="h-9 text-xs font-bold bg-[#059669] hover:bg-[#047857] text-white w-fit">
                Importer cette intégration
              </Button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default ImportRoot;
