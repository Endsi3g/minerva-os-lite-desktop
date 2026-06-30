'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SettingsSectionWrapper } from './settings-section-wrapper';
import { Eye, EyeOff, Trash2, Check, AlertCircle } from 'lucide-react';

interface ApiKeysData {
  openrouterKeyMasked: string | null;
}

interface SettingsApiKeysSectionProps {
  data: ApiKeysData;
  onSaveKey: (provider: 'openrouter', value: string) => Promise<void>;
  onDeleteKey: (provider: 'openrouter') => Promise<void>;
  isSaving: boolean;
}

function KeyRow({
  label, maskedValue, placeholder, helpUrl, onSave, onDelete,
}: {
  label: string;
  maskedValue: string | null;
  placeholder: string;
  helpUrl?: string;
  onSave: (value: string) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [inputValue, setInputValue] = useState('');
  const [show, setShow] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const handleSave = async () => {
    if (!inputValue.trim()) return;
    setIsSaving(true);
    try {
      await onSave(inputValue.trim());
      setInputValue('');
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } finally { setIsSaving(false); }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try { await onDelete(); } finally { setIsDeleting(false); }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">{label}</label>
        {maskedValue ? (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
            <Check className="w-3 h-3" />Configurée
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600">
            <AlertCircle className="w-3 h-3" />Non configurée
          </span>
        )}
      </div>

      {maskedValue ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-9 px-3 bg-[#f4f4f3]/40 border border-[#e5e5e0] rounded-md flex items-center text-xs text-[#7a7a76] font-mono select-none">
            {maskedValue}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={handleDelete} disabled={isDeleting}
            className="h-9 px-2.5 text-destructive hover:text-destructive hover:bg-destructive/10 border border-[#e5e5e0]">
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
              className="text-xs bg-white pr-9 font-mono"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            />
            <button type="button" onClick={() => setShow(!show)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7a7a76] hover:text-[#26251e] transition-colors">
              {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          <Button type="button" size="sm" onClick={handleSave} disabled={isSaving || !inputValue.trim()}
            className={`h-9 text-xs font-bold px-3 transition-all ${savedFlash ? 'bg-emerald-600 text-white' : 'bg-[#059669] hover:bg-[#047857] text-white'}`}>
            {isSaving ? '...' : savedFlash ? <Check className="w-3.5 h-3.5" /> : 'Enregistrer'}
          </Button>
        </div>
      )}

      {helpUrl && (
        <p className="text-[10px] text-[#7a7a76]">
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
      description="Connectez OpenRouter pour activer les modèles alternatifs."
      isSaving={isSaving}
    >
      <Card className="border border-[#e5e5e0] bg-white">
        <CardContent className="p-5 space-y-6">
          <p className="text-xs text-[#7a7a76] leading-relaxed">
            Les clés sont chiffrées côté serveur et ne sont jamais exposées dans le navigateur.
            Seuls les 4 derniers caractères sont affichés comme confirmation.
          </p>

          <KeyRow
            label="OpenRouter (modèles alternatifs)"
            maskedValue={data.openrouterKeyMasked}
            placeholder="sk-or-v1-..."
            helpUrl="https://openrouter.ai/keys"
            onSave={(v) => onSaveKey('openrouter', v)}
            onDelete={() => onDeleteKey('openrouter')}
          />
        </CardContent>
      </Card>

      <Card className="border border-[#bbf7d0] bg-[#f0fdf4]">
        <CardContent className="p-4">
          <p className="text-xs text-[#059669] leading-relaxed">
            <strong>Priorité :</strong> Minerva utilise Claude (Anthropic) par défaut via la clé serveur.
            Configurez une clé OpenRouter pour accéder à des modèles alternatifs gratuits ou spécialisés.
          </p>
        </CardContent>
      </Card>
    </SettingsSectionWrapper>
  );
}

export default SettingsApiKeysSection;
