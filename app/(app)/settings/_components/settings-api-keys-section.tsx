'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SettingsSectionWrapper } from './settings-section-wrapper';
import { Eye, EyeOff, Trash2, Check, AlertCircle } from 'lucide-react';

type Provider = 'openrouter' | 'groq' | 'together';

interface ApiKeysData {
  openrouterKeyMasked: string | null;
  groqKeyMasked: string | null;
  togetherKeyMasked: string | null;
}

interface SettingsApiKeysSectionProps {
  data: ApiKeysData;
  onSaveKey: (provider: Provider, value: string) => Promise<void>;
  onDeleteKey: (provider: Provider) => Promise<void>;
  isSaving: boolean;
}

interface KeyRowProps {
  label: string;
  provider: Provider;
  maskedValue: string | null;
  placeholder: string;
  helpUrl?: string;
  onSave: (provider: Provider, value: string) => Promise<void>;
  onDelete: (provider: Provider) => Promise<void>;
}

function KeyRow({ label, provider, maskedValue, placeholder, helpUrl, onSave, onDelete }: KeyRowProps) {
  const [inputValue, setInputValue] = useState('');
  const [show, setShow] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const handleSave = async () => {
    if (!inputValue.trim()) return;
    setIsSaving(true);
    try {
      await onSave(provider, inputValue.trim());
      setInputValue('');
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(provider);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </label>
        {maskedValue ? (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
            <Check className="w-3 h-3" />
            Configurée
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600">
            <AlertCircle className="w-3 h-3" />
            Non configurée
          </span>
        )}
      </div>

      {maskedValue ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-9 px-3 bg-muted/40 border border-border rounded-md flex items-center text-xs text-muted-foreground font-mono select-none">
            {maskedValue}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="h-9 px-2.5 text-destructive hover:text-destructive hover:bg-destructive/10 border border-border"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              type={show ? 'text' : 'password'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={placeholder}
              className="text-xs bg-card pr-9 font-mono"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !inputValue.trim()}
            className={`h-9 text-xs font-bold px-3 transition-all ${savedFlash ? 'bg-emerald-600 text-white' : 'bg-[#059669] hover:bg-[#047857] text-white'}`}
          >
            {isSaving ? '...' : savedFlash ? <Check className="w-3.5 h-3.5" /> : 'Enregistrer'}
          </Button>
        </div>
      )}

      {helpUrl && (
        <p className="text-[10px] text-muted-foreground">
          Obtenez votre clé sur{' '}
          <a href={helpUrl} target="_blank" rel="noopener noreferrer" className="text-[#059669] hover:underline font-semibold">
            {new URL(helpUrl).hostname}
          </a>
        </p>
      )}
    </div>
  );
}

export function SettingsApiKeysSection({ data, onSaveKey, onDeleteKey, isSaving }: SettingsApiKeysSectionProps) {
  return (
    <SettingsSectionWrapper
      title="Clés API"
      description="Connectez vos fournisseurs IA pour activer le chat, les agents et la génération de contenu."
      isSaving={isSaving}
    >
      <Card className="border border-border bg-card">
        <CardContent className="p-5 space-y-6">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Les clés sont chiffrées côté serveur et ne sont jamais exposées dans le navigateur.
            Seuls les 4 derniers caractères sont affichés comme confirmation.
          </p>

          <KeyRow
            label="OpenRouter"
            provider="openrouter"
            maskedValue={data.openrouterKeyMasked}
            placeholder="sk-or-v1-..."
            helpUrl="https://openrouter.ai/keys"
            onSave={onSaveKey}
            onDelete={onDeleteKey}
          />

          <div className="border-t border-border/50" />

          <KeyRow
            label="Groq"
            provider="groq"
            maskedValue={data.groqKeyMasked}
            placeholder="gsk_..."
            helpUrl="https://console.groq.com/keys"
            onSave={onSaveKey}
            onDelete={onDeleteKey}
          />

          <div className="border-t border-border/50" />

          <KeyRow
            label="Together AI"
            provider="together"
            maskedValue={data.togetherKeyMasked}
            placeholder="..."
            helpUrl="https://api.together.ai/settings/api-keys"
            onSave={onSaveKey}
            onDelete={onDeleteKey}
          />
        </CardContent>
      </Card>

      <Card className="border border-amber-200 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-950/10">
        <CardContent className="p-4">
          <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
            <strong>Priorité de fallback :</strong> Minerva OS essaie d&apos;abord OpenRouter, puis Groq, puis Together AI,
            puis Anthropic (clé serveur). Configurez au moins une clé pour activer les fonctionnalités IA.
          </p>
        </CardContent>
      </Card>
    </SettingsSectionWrapper>
  );
}

export default SettingsApiKeysSection;
