'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Briefcase, Check, Loader2, AlertCircle, 
  Trash2, Upload, Palette
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useReach } from '@/lib/reach-context';

const PRESET_COLORS = [
  { name: 'Vert Minerva (Original)', hex: '#059669' },
  { name: 'Émeraude', hex: '#10b981' },
  { name: 'Cobalt', hex: '#2563eb' },
  { name: 'Crimson', hex: '#dc2626' },
  { name: 'Prune', hex: '#7c3aed' },
  { name: 'Anthracite', hex: '#374151' }
];

export default function WorkspaceDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { workspacesList, activeWorkspace, updateWorkspace, deleteWorkspace, switchWorkspace } = useReach();
  
  const workspaceId = id;
  const ws = workspacesList.find(w => w.id === workspaceId);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tag, setTag] = useState('');
  const [accentColor, setAccentColor] = useState('');
  const [logoBase64, setLogoBase64] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Delete states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Populate data when workspace list is loaded
  useEffect(() => {
    if (ws) {
      setName(ws.name || '');
      setDescription(ws.description || '');
      setTag(ws.tag || '');
      setAccentColor(ws.accent_color || '#059669');
      setLogoBase64(ws.logo_base64 || '');
    }
  }, [ws]);

  if (!ws) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#fafaf8] text-left">
        <div className="text-center space-y-3">
          <Briefcase className="w-10 h-10 text-[#7a7a76] mx-auto animate-pulse" />
          <p className="text-sm font-semibold text-[#26251e]">Chargement du workspace...</p>
          <Link href="/workspaces">
            <Button variant="ghost" className="text-xs text-[#10b981] mt-2">
              Retour aux espaces
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Handle Logo Upload
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 1.5MB for Base64 storage in db)
    if (file.size > 1.5 * 1024 * 1024) {
      setSaveError("L'image de logo est trop lourde (max 1.5 Mo).");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoBase64(reader.result as string);
      setSaveError('');
    };
    reader.readAsDataURL(file);
  };

  const handleClearLogo = () => {
    setLogoBase64('');
  };

  // Submit Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError('');

    try {
      await updateWorkspace(ws.id, {
        name: name.trim(),
        description: description.trim(),
        tag: tag.trim().toUpperCase(),
        accent_color: accentColor,
        logo_base64: logoBase64
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err: any) {
      console.error(err);
      setSaveError("Erreur lors de la mise à jour de l'espace.");
    } finally {
      setIsSaving(false);
    }
  };

  // Submit Delete
  const handleDeleteWorkspace = async () => {
    setIsDeleting(true);
    setDeleteError('');

    try {
      const ownedWorkspaces = workspacesList.filter(w => w.isOwner);
      if (ws.isOwner && ownedWorkspaces.length <= 1) {
        setDeleteError("Impossible de supprimer votre unique espace de travail personnel.");
        setIsDeleting(false);
        return;
      }

      await deleteWorkspace(ws.id);
      
      // Navigate back to workspaces overview
      router.push('/workspaces');
    } catch (err: any) {
      console.error(err);
      setDeleteError("Erreur lors de la suppression de l'espace.");
      setIsDeleting(false);
    }
  };

  const isCurrentActive = activeWorkspace?.id === ws.id;

  return (
    <div className="flex flex-col h-full bg-[#fafaf8] overflow-y-auto px-6 py-8 md:px-12 md:py-10 text-left">
      <div className="max-w-3xl w-full mx-auto space-y-6">
        
        {/* Breadcrumb back */}
        <div className="flex items-center gap-3">
          <Link
            href="/workspaces"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e5e5e0] bg-white hover:bg-[#f4f4f3] text-[#555552] hover:text-[#26251e] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="text-xs font-semibold text-[#7a7a76]">Retour aux espaces</span>
        </div>

        {/* Brand Header */}
        <div className="flex items-start justify-between flex-wrap gap-4 border-b border-[#e5e5e0] pb-5">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-[#26251e] tracking-tight flex items-center gap-3">
              {logoBase64 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={logoBase64} 
                  alt="Logo" 
                  className="w-7 h-7 object-contain rounded-md" 
                />
              ) : (
                <Briefcase className="w-6 h-6 text-[#7a7a76]" />
              )}
              <span>Configurer {ws.name}</span>
            </h1>
            <p className="text-xs text-[#7a7a76]">
              Personnalisez les couleurs, le logo, l'étiquette et les informations globales de votre espace.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {isCurrentActive ? (
              <span className="px-3 py-1 bg-[#26251e] text-white text-xs font-bold rounded-lg border border-transparent">
                Espace actif
              </span>
            ) : (
              <Button
                onClick={() => switchWorkspace(ws.id)}
                variant="outline"
                className="h-8 text-xs font-semibold border-[#e5e5e0] hover:bg-[#f4f4f3]"
              >
                Activer cet espace
              </Button>
            )}
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-2">
          
          {/* Left: Customization Form */}
          <form onSubmit={handleSave} className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-[#e5e5e0] rounded-xl p-5 md:p-6 space-y-5 shadow-xs">
              
              <h2 className="text-xs font-bold text-[#26251e] uppercase tracking-wider border-b border-[#e5e5e0] pb-2">
                Informations Générales
              </h2>

              {saveError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              {saveSuccess && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>Modifications enregistrées avec succès !</span>
                </div>
              )}

              {/* Workspace name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
                  Nom de l'espace de travail
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Campagne Québec 2026"
                  className="w-full text-xs p-2.5 bg-white border border-[#e5e5e0] rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description succincte de l'environnement..."
                  className="w-full text-xs p-2.5 bg-white border border-[#e5e5e0] rounded-xl focus:outline-none focus:ring-1 focus:ring-primary font-sans"
                />
              </div>

              {/* Custom Tag */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] block">
                  Tag de l'espace de travail (Initiale ou Code)
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="Ex: CAM1"
                  className="w-24 text-center text-xs font-bold p-2.5 bg-white border border-[#e5e5e0] rounded-xl focus:outline-none focus:ring-1 focus:ring-primary uppercase"
                />
                <p className="text-[9px] text-[#7a7a76]">
                  Un tag court (1 à 4 caractères) utilisé dans les listes de prospects.
                </p>
              </div>

              {/* Predefined preset accents + custom Hex */}
              <div className="space-y-2.5 pt-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-[#7a7a76]" />
                  <span>Couleur d'accentuation</span>
                </label>
                
                <div className="flex flex-wrap gap-2.5">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color.hex}
                      type="button"
                      onClick={() => setAccentColor(color.hex)}
                      className={`h-7 px-2.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
                        accentColor.toLowerCase() === color.hex.toLowerCase()
                          ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs'
                          : 'border-[#e5e5e0] bg-white text-[#555552] hover:bg-[#fafaf8]'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color.hex }} />
                      <span>{color.name}</span>
                      {accentColor.toLowerCase() === color.hex.toLowerCase() && <Check className="w-3 h-3" />}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1.5">
                  <span className="text-[10px] text-[#7a7a76] font-semibold">Custom HEX :</span>
                  <input
                    type="color"
                    value={accentColor.startsWith('#') && accentColor.length === 7 ? accentColor : '#059669'}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-7 h-7 rounded border border-[#e5e5e0] p-0 overflow-hidden cursor-pointer"
                  />
                  <input
                    type="text"
                    maxLength={7}
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    placeholder="#059669"
                    className="w-20 text-xs text-center p-1 bg-white border border-[#e5e5e0] rounded focus:outline-none"
                  />
                </div>
              </div>

              {/* Form submit */}
              <div className="pt-4 border-t border-[#e5e5e0]/60 flex justify-end">
                <Button
                  type="submit"
                  disabled={isSaving || !name.trim()}
                  className="bg-[#26251e] hover:bg-[#3d3c36] text-white font-bold text-xs h-9 px-4 flex items-center gap-2 rounded-lg"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <span>Enregistrer les modifications</span>
                  )}
                </Button>
              </div>

            </div>
          </form>

          {/* Right: Logo Uploader & Danger Zone */}
          <div className="space-y-6">
            
            {/* Logo box */}
            <div className="bg-white border border-[#e5e5e0] rounded-xl p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-[#26251e] uppercase tracking-wider border-b border-[#e5e5e0] pb-2">
                Logo du Workspace
              </h3>

              <div className="flex flex-col items-center justify-center p-4 border border-dashed border-[#e5e5e0] rounded-xl bg-[#fafaf8] space-y-3 min-h-[140px]">
                {logoBase64 ? (
                  <div className="relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logoBase64}
                      alt="Logo Uploaded"
                      className="max-h-20 max-w-[120px] object-contain rounded-md"
                    />
                    <button
                      type="button"
                      onClick={handleClearLogo}
                      className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] font-bold shadow-sm hover:bg-red-700"
                    >
                      &times;
                    </button>
                  </div>
                ) : (
                  <div className="text-center space-y-1">
                    <Upload className="w-6 h-6 text-[#7a7a76] mx-auto opacity-60" />
                    <p className="text-[10px] text-[#7a7a76] font-semibold">Aucune image</p>
                  </div>
                )}

                <label className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-[#e5e5e0] hover:bg-[#fafaf8] rounded-lg text-[10px] font-bold text-[#555552] transition-colors cursor-pointer select-none">
                  <Upload className="w-3 h-3" />
                  <span>{logoBase64 ? 'Changer d\'image' : 'Importer un logo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-[9px] text-[#7a7a76] text-center leading-normal">
                Format carré ou paysage recommandé. PNG, JPG, GIF. Max 1.5 Mo.
              </p>
            </div>

            {/* Danger Zone */}
            <div className="bg-[#fff5f5] border border-[#ffdbdb] rounded-xl p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-red-800 uppercase tracking-wider border-b border-[#ffd1d1] pb-2">
                Zone de Danger
              </h3>
              
              <p className="text-[10px] text-red-800 leading-normal">
                La suppression de ce workspace réassignera automatiquement tous ses prospects, ses tâches, ses notes et ses suggestions IA vers votre espace de travail par défaut pour éviter toute perte de données.
              </p>

              {deleteError && (
                <p className="text-[10px] text-red-700 font-bold bg-white/50 p-2 rounded-lg border border-red-200">
                  {deleteError}
                </p>
              )}

              {showDeleteConfirm ? (
                <div className="space-y-2 pt-1.5">
                  <p className="text-[11px] font-bold text-red-800">
                    Êtes-vous certain de vouloir supprimer cet espace ?
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleDeleteWorkspace}
                      disabled={isDeleting}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold text-xs h-8 rounded-lg"
                    >
                      {isDeleting ? 'Suppression...' : 'Confirmer la suppression'}
                    </Button>
                    <Button
                      onClick={() => setShowDeleteConfirm(false)}
                      variant="outline"
                      className="border-[#ffd1d1] hover:bg-white text-xs text-[#555552] h-8"
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold text-xs h-9 flex items-center justify-center gap-1.5 rounded-lg"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Supprimer le workspace</span>
                </Button>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
