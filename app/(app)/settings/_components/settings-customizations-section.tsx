'use client';

import React, { useRef, useState } from 'react';
import { Upload, Plus, Trash2 } from 'lucide-react';
import { SettingsSectionWrapper } from './settings-section-wrapper';

export interface CustomizationsData {
  customColor: string;
  backgroundImageBase64: string;
  showWorkspaceLogo: boolean;
  hideModelLogo: boolean;
  chatDisclaimer: string;
  infoBoxes: string[];
}

interface Props {
  data: CustomizationsData;
  onChange: (updates: Partial<CustomizationsData>) => void;
  isSaving: boolean;
}

export function SettingsCustomizationsSection({ data, onChange, isSaving }: Props) {
  const bgInputRef = useRef<HTMLInputElement>(null);
  const [newBox, setNewBox] = useState('');

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onChange({ backgroundImageBase64: ev.target?.result as string });
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const addInfoBox = () => {
    if (!newBox.trim() || data.infoBoxes.length >= 3) return;
    onChange({ infoBoxes: [...data.infoBoxes, newBox.trim()] });
    setNewBox('');
  };

  const removeInfoBox = (idx: number) => {
    onChange({ infoBoxes: data.infoBoxes.filter((_, i) => i !== idx) });
  };

  return (
    <SettingsSectionWrapper
      title="Personnalisations"
      description="Adaptez Minerva OS à votre marque et vos exigences légales."
      isSaving={isSaving}
    >
      {/* Custom color */}
      <div className="border border-border rounded-xl p-5 bg-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-foreground">Couleur personnalisée</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Couleur principale utilisée pour les boutons et les accents dans votre espace de travail.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div
              className="w-8 h-8 rounded-lg border border-border cursor-pointer"
              style={{ backgroundColor: data.customColor || '#f54e00' }}
              onClick={() => document.getElementById('color-picker-input')?.click()}
            />
            <input
              id="color-picker-input"
              type="color"
              value={data.customColor || '#f54e00'}
              onChange={(e) => onChange({ customColor: e.target.value })}
              className="sr-only"
            />
            <span className="text-xs font-mono text-foreground border border-border rounded-lg px-3 py-1.5 bg-muted">
              {(data.customColor || '#f54e00').toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Background image */}
      <div className="border border-border rounded-xl p-5 bg-card space-y-3">
        <div>
          <p className="text-xs font-bold text-foreground">Image de fond</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Image affichée en arrière-plan sur l'écran d'accueil. PNG et JPEG acceptés. Résolution recommandée : 1920 × 1080 px.
          </p>
        </div>
        {data.backgroundImageBase64 && (
          <div className="relative w-full h-24 rounded-lg overflow-hidden border border-border">
            <img src={data.backgroundImageBase64} alt="bg" className="w-full h-full object-cover" />
            <button
              onClick={() => onChange({ backgroundImageBase64: '' })}
              className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-md hover:bg-black/70 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-3">
          <button
            onClick={() => bgInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-xs font-semibold text-foreground hover:bg-muted transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Télécharger une image
          </button>
          <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />
          <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-xs font-semibold text-foreground hover:bg-muted transition-colors">
            Télécharger le modèle
          </button>
        </div>
      </div>

      {/* Show workspace logo toggle */}
      <div className="border border-border rounded-xl p-5 bg-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-foreground">Afficher le logo de l'espace de travail</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Affiche l'icône et le nom de votre espace de travail lorsqu'un nouveau chat est démarré.
            </p>
          </div>
          <button
            onClick={() => onChange({ showWorkspaceLogo: !data.showWorkspaceLogo })}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
              data.showWorkspaceLogo ? 'bg-primary' : 'bg-muted-foreground/30'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                data.showWorkspaceLogo ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Chat section */}
      <div>
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Chat</h3>
        <div className="space-y-3">
          {/* Hide model logo */}
          <div className="border border-border rounded-xl p-5 bg-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-foreground">Masquer le logo du modèle</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Masque le logo du modèle dans les réponses du chat et affiche le logo de votre espace de travail à la place.
                </p>
              </div>
              <button
                onClick={() => onChange({ hideModelLogo: !data.hideModelLogo })}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                  data.hideModelLogo ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    data.hideModelLogo ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Chat disclaimer */}
          <div className="border border-border rounded-xl p-5 bg-card space-y-3">
            <div>
              <p className="text-xs font-bold text-foreground">Avertissement légal du chat</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Affiché avant chaque invite de saisie. Contient généralement un avertissement légal.
              </p>
            </div>
            <textarea
              placeholder="p.ex. Veuillez ne pas partager de données personnelles dans ce chat..."
              value={data.chatDisclaimer}
              onChange={(e) => onChange({ chatDisclaimer: e.target.value })}
              rows={3}
              className="w-full text-xs px-3.5 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary bg-background resize-none text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Custom info boxes */}
          <div className="border border-border rounded-xl p-5 bg-card space-y-3">
            <div>
              <p className="text-xs font-bold text-foreground">Encadrés personnalisés</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Ajoutez jusqu'à 3 encadrés affichés sur l'écran du nouveau chat.
              </p>
            </div>
            {data.infoBoxes.map((box, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="flex-1 text-xs px-3.5 py-2.5 border border-border rounded-lg bg-muted text-foreground truncate">
                  {box}
                </div>
                <button
                  onClick={() => removeInfoBox(idx)}
                  className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {data.infoBoxes.length < 3 && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Ajouter un encadré..."
                  value={newBox}
                  onChange={(e) => setNewBox(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addInfoBox()}
                  className="flex-1 text-xs px-3.5 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary bg-background text-foreground placeholder:text-muted-foreground"
                />
                <button
                  onClick={addInfoBox}
                  disabled={!newBox.trim()}
                  className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-40"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </SettingsSectionWrapper>
  );
}
