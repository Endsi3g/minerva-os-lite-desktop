'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Folder as FolderIcon,
  FileText,
  FileSpreadsheet,
  FileCode,
  Upload,
  Search,
  Lock,
  Globe,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getFolders, addFolder } from '@/lib/onboarding-store';
import { useLanguage } from '@/lib/language-context';
import { useReach } from '@/lib/reach-context';
import { createClient } from '@/lib/supabase/client';

interface DocumentRow {
  id: string;
  user_id: string;
  workspace_id: string | null;
  title: string;
  type: 'markdown' | 'pdf' | 'docx' | 'blank';
  content: string | null;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}

const getFileIcon = (type: DocumentRow['type']) => {
  if (type === 'pdf') return FileText;
  if (type === 'docx') return FileSpreadsheet;
  return FileCode;
};

const formatRelativeTime = (dateStr: string) => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
};

const ENTREPRENEUR_TEMPLATES = [
  {
    id: 'business-plan',
    label: 'Plan d\'affaires',
    emoji: '📊',
    type: 'markdown' as const,
    content: `# Plan d'affaires\n\n## 1. Résumé exécutif\n\n_Décrivez votre entreprise en 2-3 paragraphes._\n\n## 2. Description de l'entreprise\n\n- **Nom :** \n- **Secteur :** \n- **Date de fondation :** \n- **Mission :** \n\n## 3. Analyse du marché\n\n### Marché cible\n\n### Concurrents principaux\n\n## 4. Produits / Services\n\n## 5. Stratégie de vente & marketing\n\n## 6. Structure opérationnelle\n\n## 7. Projections financières\n\n| Année | Revenus | Dépenses | Bénéfice |\n|-------|---------|----------|----------|\n| 2025  |         |          |          |\n| 2026  |         |          |          |\n| 2027  |         |          |          |\n`,
  },
  {
    id: 'audit-gmb',
    label: 'Audit GMB',
    emoji: '🔍',
    type: 'markdown' as const,
    content: `# Audit Google My Business\n\n**Client :** \n**Date :** \n**Score GMB :** /100\n\n## ✅ Points positifs\n\n- \n- \n\n## ❌ Points à améliorer\n\n### Informations de base\n- [ ] Nom exact\n- [ ] Adresse complète\n- [ ] Numéro de téléphone\n- [ ] Site web\n- [ ] Horaires à jour\n\n### Photos\n- [ ] Photo de profil\n- [ ] Photos de l'intérieur\n- [ ] Photos des produits/services\n\n### Avis\n- [ ] Réponses aux avis négatifs\n- [ ] Invitation à laisser des avis\n\n### Catégories & attributs\n- [ ] Catégorie principale correcte\n- [ ] Attributs renseignés\n\n## 💡 Recommandations prioritaires\n\n1. \n2. \n3. \n`,
  },
  {
    id: 'email-prospection',
    label: 'Email de prospection',
    emoji: '✉️',
    type: 'markdown' as const,
    content: `# Email de prospection\n\n**Sujet :** [Prénom], j'ai trouvé quelque chose d'intéressant pour [Entreprise]\n\n---\n\nBonjour [Prénom],\n\nJ'ai récemment découvert [Entreprise] et j'ai remarqué [observation spécifique].\n\nJe me spécialise dans [votre service] et j'aide des entreprises comme la vôtre à [bénéfice principal].\n\nPar exemple, j'ai récemment aidé [entreprise similaire] à [résultat concret] en seulement [délai].\n\nSeriez-vous disponible pour un appel de 15 minutes cette semaine afin que je puisse vous montrer comment nous pourrions obtenir des résultats similaires pour [Entreprise] ?\n\nCordialement,\n[Votre nom]\n[Votre poste] | [Votre entreprise]\n[Téléphone] | [Site web]\n\n---\n\n**Notes :** _Personnalisez [les crochets] avant d'envoyer._\n`,
  },
  {
    id: 'rapport-hebdo',
    label: 'Rapport hebdo',
    emoji: '📅',
    type: 'markdown' as const,
    content: `# Rapport hebdomadaire\n\n**Semaine du :** \n**Préparé par :** \n\n## 📈 Résultats de la semaine\n\n| Métrique | Objectif | Résultat | Écart |\n|----------|----------|----------|-------|\n| Leads contactés | | | |\n| Rendez-vous obtenus | | | |\n| Propositions envoyées | | | |\n| Ventes conclues | | | |\n\n## 🎯 Objectifs atteints\n\n- \n- \n\n## ⚠️ Défis rencontrés\n\n- \n\n## 📋 Plan pour la semaine prochaine\n\n1. \n2. \n3. \n\n## 💬 Notes & observations\n\n`,
  },
];

export default function LibraryPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { activeWorkspace } = useReach();
  const [activeTab, setActiveTab] = useState<'All' | 'Shared' | 'Private'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [folders, setFolders] = useState<string[]>([]);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const syncStore = () => {
      setFolders(getFolders());
    };
    syncStore();
    window.addEventListener('minerva_store_update', syncStore);
    return () => window.removeEventListener('minerva_store_update', syncStore);
  }, []);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase.from('documents').select('*').order('updated_at', { ascending: false });

      if (activeTab === 'Shared') {
        query = query.eq('is_shared', true);
      } else if (activeTab === 'Private') {
        query = query.eq('user_id', user.id).eq('is_shared', false);
      } else {
        query = query.or(`user_id.eq.${user.id},is_shared.eq.true`);
      }

      const { data, error } = await query;
      if (!error && data) setDocuments(data as DocumentRow[]);
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleCreateBlank = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          workspace_id: activeWorkspace?.id || null,
          title: 'Sans titre',
          type: 'blank',
          content: '',
          is_shared: false,
        })
        .select()
        .single();

      if (error) throw error;
      router.push(`/library/${data.id}`);
    } catch (err) {
      console.error('Error creating blank document:', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const ext = file.name.split('.').pop()?.toLowerCase();
      const type: DocumentRow['type'] = ext === 'pdf' ? 'pdf' : ext === 'docx' ? 'docx' : 'markdown';

      const content: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        if (type === 'markdown') {
          reader.readAsText(file);
        } else {
          reader.readAsDataURL(file);
        }
      });

      const { data, error } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          workspace_id: activeWorkspace?.id || null,
          title: file.name.replace(/\.[^/.]+$/, ''),
          type,
          content,
          is_shared: false,
        })
        .select()
        .single();

      if (error) throw error;
      router.push(`/library/${data.id}`);
    } catch (err) {
      console.error('Error uploading document:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreateFromTemplate = async (template: typeof ENTREPRENEUR_TEMPLATES[number]) => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          workspace_id: activeWorkspace?.id || null,
          title: template.label,
          type: template.type,
          content: template.content,
          is_shared: false,
        })
        .select()
        .single();

      if (error) throw error;
      router.push(`/library/${data.id}`);
    } catch (err) {
      console.error('Error creating from template:', err);
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="max-w-6xl mx-auto p-8 space-y-8 text-[#26251e] font-sans selection:bg-[#10b981]/10 text-left">

        {/* Header Section */}
        <div className="space-y-1.5 text-left">
          <h1 className="text-xl font-bold text-[#26251e]">{t('library.title')}</h1>
          <p className="text-xs text-[#7a7a76]">
            {t('library.subtitle')}
          </p>
        </div>

        {/* Create new file Row */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#7a7a76]">{t('library.create_new')}</h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">

            {/* Blank File Card */}
            <div className="flex flex-col gap-2">
              <button
                onClick={handleCreateBlank}
                className="aspect-[4/3] w-full border border-dashed border-[#e5e5e0] hover:border-[#7a7a76] rounded-lg bg-[#f4f4f3]/40 flex flex-col items-center justify-center cursor-pointer transition-all"
              >
                <Plus className="h-5 w-5 text-[#7a7a76] stroke-[2.5]" />
              </button>
              <div className="flex items-center justify-between text-xs px-1">
                <span className="font-semibold text-[#26251e]">{t('library.blank_file')}</span>
              </div>
            </div>

            {/* Add Template Card (upload PDF/DOCX/MD) */}
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.md,.markdown"
                onChange={handleFileUpload}
                className="hidden"
                title="Importer un fichier"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="aspect-[4/3] w-full border border-dashed border-[#e5e5e0] hover:border-[#7a7a76] rounded-lg bg-[#f4f4f3]/20 flex flex-col items-center justify-center cursor-pointer transition-all"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 text-[#7a7a76] animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 text-[#7a7a76] mb-1 stroke-[2]" />
                )}
                <span className="text-[10px] font-bold text-[#7a7a76] uppercase tracking-wider">{t('library.add_template')}</span>
              </button>
            </div>

            {/* Entrepreneur template cards */}
            {ENTREPRENEUR_TEMPLATES.map((tpl) => (
              <div key={tpl.id} className="flex flex-col gap-2">
                <button
                  onClick={() => handleCreateFromTemplate(tpl)}
                  className="aspect-[4/3] w-full border border-[#e5e5e0] hover:border-[#059669]/50 rounded-lg bg-[#f4f4f3]/30 hover:bg-[#059669]/5 flex flex-col items-center justify-center cursor-pointer transition-all gap-1"
                >
                  <span className="text-2xl">{tpl.emoji}</span>
                </button>
                <div className="text-xs px-1 font-semibold text-[#26251e] truncate">{tpl.label}</div>
              </div>
            ))}

          </div>
        </div>

        {/* Folders Section */}
        <div className="space-y-4">
          <div className="border-b border-[#e5e5e0] pb-2 flex justify-between items-end">

            {/* Filter pills */}
            <div className="flex gap-2">
              {(['All', 'Shared', 'Private'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer",
                    activeTab === tab
                      ? "bg-[#26251e] text-white"
                      : "text-[#555552] hover:bg-[#e5e5e2]/60"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Right Tools */}
            <div className="flex items-center gap-1.5">
              <Button
                onClick={() => setShowNewFolderModal(true)}
                size="sm"
                className="h-7 text-xs font-bold bg-[#059669] hover:bg-[#047857] text-white flex items-center gap-1 rounded px-2.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t('library.create_folder')}</span>
              </Button>
            </div>

          </div>

          {/* Folders Table */}
          {activeTab !== 'Shared' && folders.length > 0 && (
            <div className="border border-[#e5e5e0] rounded-lg overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#f4f4f3]/60 border-b border-[#e5e5e0] text-[#7a7a76] font-semibold">
                    <th className="py-2.5 px-4 w-6">
                      <input type="checkbox" className="rounded border-[#e5e5e0]" />
                    </th>
                    <th className="py-2.5 px-3">{t('library.table_name')}</th>
                    <th className="py-2.5 px-3">{t('library.table_visibility')}</th>
                    <th className="py-2.5 px-3">{t('library.table_files')}</th>
                    <th className="py-2.5 px-3 text-right pr-6">{t('library.table_updated')}</th>
                  </tr>
                </thead>
                <tbody>
                  {folders.map((folder) => (
                    <tr key={folder} className="hover:bg-[#f4f4f3]/25 transition-colors">
                      <td className="py-3.5 px-4">
                        <input type="checkbox" className="rounded border-[#e5e5e0]" />
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-[#26251e] flex items-center gap-2">
                        <FolderIcon className="h-4 w-4 text-[#10b981] fill-[#10b981]/20" />
                        <span>{folder}</span>
                      </td>
                      <td className="py-3.5 px-3 text-[#7a7a76]">
                        <span className="inline-flex items-center gap-1 bg-[#f4f4f3] px-2 py-0.5 rounded text-[10px] font-semibold text-[#555552]">
                          <Lock className="h-2.5 w-2.5" />
                          {t('library.private')}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-[#7a7a76]">{t('library.zero_files')}</td>
                      <td className="py-3.5 px-3 text-right text-[#7a7a76] pr-6">—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent files Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#7a7a76]">{t('library.recent_files')}</h2>

            <div className="flex items-center gap-3">
              {/* Search input */}
              <div className="relative w-44">
                <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-[#7a7a76]" />
                <Input
                  placeholder={t('library.search_placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-7.5 pl-7 text-xs bg-white border-[#e5e5e0] focus-visible:ring-1 focus-visible:ring-[#059669]"
                />
              </div>
            </div>
          </div>

          {/* Files Grid */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-6 h-6 text-[#059669] animate-spin" />
              <p className="text-xs text-[#7a7a76]">Chargement des documents...</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="border border-dashed border-[#e5e5e0] rounded-lg p-10 flex flex-col items-center justify-center space-y-2">
              <FileText className="h-6 w-6 text-[#7a7a76]" />
              <p className="text-xs text-[#7a7a76]">Aucun document. Créez-en un avec « {t('library.blank_file')} » ci-dessus.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
              {filteredDocuments.map((doc) => {
                const Icon = getFileIcon(doc.type);
                const previewText = doc.content
                  ? doc.content.replace(/[#*`_\[\]]/g, '').trim().slice(0, 120)
                  : null;
                return (
                  <button
                    key={doc.id}
                    onClick={() => router.push(`/library/${doc.id}`)}
                    className="border border-[#e5e5e0] hover:border-[#7a7a76] rounded-lg overflow-hidden bg-white shadow-xs flex flex-col group cursor-pointer transition-all text-left"
                  >
                    <div className="aspect-[4/3] bg-[#f4f4f3]/40 border-b border-[#e5e5e0] p-3 flex flex-col justify-start overflow-hidden relative">
                      {previewText ? (
                        <p className="text-[9px] text-[#7a7a76] leading-relaxed line-clamp-6 whitespace-pre-line select-none">
                          {previewText}
                        </p>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Icon className="h-8 w-8 text-[#10b981]" />
                        </div>
                      )}
                    </div>
                    <div className="p-3 space-y-1 w-full">
                      <div className="flex items-center justify-between text-[10px] text-[#7a7a76]">
                        <span>{formatRelativeTime(doc.updated_at)}</span>
                        {doc.is_shared ? (
                          <Globe className="h-2.5 w-2.5 text-[#059669]" />
                        ) : (
                          <Lock className="h-2.5 w-2.5" />
                        )}
                      </div>
                      <div className="text-xs font-semibold text-[#26251e] truncate">{doc.title}</div>
                      <div className="text-[10px] text-[#7a7a76] uppercase">{doc.type}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* New Folder Modal Overlay */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white border border-[#e6e5e0] rounded-xl p-5 space-y-4 shadow-xl animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#26251e] text-left">{t('library.new_folder_modal_title')}</h3>
              <p className="text-xs text-[#7a7a76] text-left">{t('library.new_folder_modal_desc')}</p>
            </div>
            <input
              type="text"
              placeholder={t('library.folder_name_placeholder')}
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="w-full text-xs p-2.5 bg-white border border-[#e6e5e0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#059669]"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (newFolderName.trim()) {
                    addFolder(newFolderName.trim());
                    setNewFolderName('');
                    setShowNewFolderModal(false);
                  }
                }
              }}
            />
            <div className="flex justify-end gap-2 text-xs pt-1">
              <Button
                variant="ghost"
                onClick={() => {
                  setNewFolderName('');
                  setShowNewFolderModal(false);
                }}
                className="h-8 text-[#555552]"
              >
                {t('library.cancel')}
              </Button>
              <Button
                onClick={() => {
                  if (newFolderName.trim()) {
                    addFolder(newFolderName.trim());
                    setNewFolderName('');
                    setShowNewFolderModal(false);
                  }
                }}
                className="h-8 bg-[#059669] hover:bg-[#047857] text-white font-bold"
              >
                {t('library.create_btn')}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
