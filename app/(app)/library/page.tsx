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
  Loader2,
  MoreHorizontal,
  FolderInput,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getFolders, addFolder } from '@/lib/onboarding-store';
import { useLanguage } from '@/lib/language-context';
import { useReach } from '@/lib/reach-context';
import { createClient } from '@/lib/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DocumentRow {
  id: string;
  user_id: string;
  workspace_id: string | null;
  title: string;
  type: 'markdown' | 'pdf' | 'docx' | 'blank';
  content: string | null;
  is_shared: boolean;
  folder_name: string | null;
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
    label: "Plan d'affaires",
    emoji: '📊',
    type: 'markdown' as const,
    content: `<h1>Plan d'affaires</h1>
<h2>1. Résumé exécutif</h2>
<p><em>Décrivez votre entreprise en 2-3 paragraphes.</em></p>
<h2>2. Description de l'entreprise</h2>
<ul>
  <li><strong>Nom :</strong> </li>
  <li><strong>Secteur :</strong> </li>
  <li><strong>Date de fondation :</strong> </li>
  <li><strong>Mission :</strong> </li>
</ul>
<h2>3. Analyse du marché</h2>
<h3>Marché cible</h3>
<p></p>
<h3>Concurrents principaux</h3>
<p></p>
<h2>4. Produits / Services</h2>
<p></p>
<h2>5. Stratégie de vente &amp; marketing</h2>
<p></p>
<h2>6. Structure opérationnelle</h2>
<p></p>
<h2>7. Projections financières</h2>
<p><strong>2025 :</strong> Revenus — Dépenses — Bénéfice</p>
<p><strong>2026 :</strong> Revenus — Dépenses — Bénéfice</p>
<p><strong>2027 :</strong> Revenus — Dépenses — Bénéfice</p>`,
  },
  {
    id: 'audit-gmb',
    label: 'Audit GMB',
    emoji: '🔍',
    type: 'markdown' as const,
    content: `<h1>Audit Google My Business</h1>
<p><strong>Client :</strong> </p>
<p><strong>Date :</strong> </p>
<p><strong>Score GMB :</strong> /100</p>
<h2>✅ Points positifs</h2>
<ul><li></li><li></li></ul>
<h2>❌ Points à améliorer</h2>
<h3>Informations de base</h3>
<ul>
  <li>Nom exact</li>
  <li>Adresse complète</li>
  <li>Numéro de téléphone</li>
  <li>Site web</li>
  <li>Horaires à jour</li>
</ul>
<h3>Photos</h3>
<ul>
  <li>Photo de profil</li>
  <li>Photos de l'intérieur</li>
  <li>Photos des produits/services</li>
</ul>
<h3>Avis</h3>
<ul>
  <li>Réponses aux avis négatifs</li>
  <li>Invitation à laisser des avis</li>
</ul>
<h3>Catégories &amp; attributs</h3>
<ul>
  <li>Catégorie principale correcte</li>
  <li>Attributs renseignés</li>
</ul>
<h2>💡 Recommandations prioritaires</h2>
<ol><li></li><li></li><li></li></ol>`,
  },
  {
    id: 'email-prospection',
    label: 'Email de prospection',
    emoji: '✉️',
    type: 'markdown' as const,
    content: `<h1>Email de prospection</h1>
<p><strong>Sujet :</strong> [Prénom], j'ai trouvé quelque chose d'intéressant pour [Entreprise]</p>
<hr>
<p>Bonjour [Prénom],</p>
<p>J'ai récemment découvert [Entreprise] et j'ai remarqué [observation spécifique].</p>
<p>Je me spécialise dans [votre service] et j'aide des entreprises comme la vôtre à [bénéfice principal].</p>
<p>Par exemple, j'ai récemment aidé [entreprise similaire] à [résultat concret] en seulement [délai].</p>
<p>Seriez-vous disponible pour un appel de 15 minutes cette semaine afin que je puisse vous montrer comment nous pourrions obtenir des résultats similaires pour [Entreprise] ?</p>
<p>Cordialement,<br>[Votre nom]<br>[Votre poste] | [Votre entreprise]<br>[Téléphone] | [Site web]</p>
<hr>
<p><em>Personnalisez [les crochets] avant d'envoyer.</em></p>`,
  },
  {
    id: 'rapport-hebdo',
    label: 'Rapport hebdo',
    emoji: '📅',
    type: 'markdown' as const,
    content: `<h1>Rapport hebdomadaire</h1>
<p><strong>Semaine du :</strong> </p>
<p><strong>Préparé par :</strong> </p>
<h2>📈 Résultats de la semaine</h2>
<ul>
  <li><strong>Leads contactés :</strong> Objectif — Résultat</li>
  <li><strong>Rendez-vous obtenus :</strong> Objectif — Résultat</li>
  <li><strong>Propositions envoyées :</strong> Objectif — Résultat</li>
  <li><strong>Ventes conclues :</strong> Objectif — Résultat</li>
</ul>
<h2>🎯 Objectifs atteints</h2>
<ul><li></li><li></li></ul>
<h2>⚠️ Défis rencontrés</h2>
<ul><li></li></ul>
<h2>📋 Plan pour la semaine prochaine</h2>
<ol><li></li><li></li><li></li></ol>
<h2>💬 Notes &amp; observations</h2>
<p></p>`,
  },
];

export default function LibraryPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { activeWorkspace } = useReach();
  const [activeTab, setActiveTab] = useState<'All' | 'Shared' | 'Private'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [folders, setFolders] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
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
          folder_name: selectedFolder || null,
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
          folder_name: selectedFolder || null,
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
          folder_name: selectedFolder || null,
        })
        .select()
        .single();

      if (error) throw error;
      router.push(`/library/${data.id}`);
    } catch (err) {
      console.error('Error creating from template:', err);
    }
  };

  const handleMoveToFolder = async (doc: DocumentRow, folderName: string | null) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('documents')
        .update({ folder_name: folderName })
        .eq('id', doc.id);
      if (!error) {
        setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, folder_name: folderName } : d));
      }
    } catch (err) {
      console.error('Error moving document to folder:', err);
    }
  };

  const folderDocCount = (folderName: string) =>
    documents.filter(d => d.folder_name === folderName).length;

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFolder = selectedFolder === null ? true : doc.folder_name === selectedFolder;
    return matchesSearch && matchesFolder;
  });

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
            <div className="flex gap-2 items-center flex-wrap">
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
              {selectedFolder && (
                <span className="inline-flex items-center gap-1.5 bg-[#059669]/10 border border-[#059669]/20 text-[#059669] px-2.5 py-1 rounded-full text-xs font-semibold">
                  <FolderIcon className="h-3 w-3" />
                  {selectedFolder}
                  <button onClick={() => setSelectedFolder(null)} className="hover:text-[#047857] ml-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
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
                  {folders.map((folder) => {
                    const count = folderDocCount(folder);
                    const isActive = selectedFolder === folder;
                    return (
                      <tr
                        key={folder}
                        onClick={() => setSelectedFolder(isActive ? null : folder)}
                        className={cn(
                          "transition-colors cursor-pointer",
                          isActive ? "bg-[#059669]/5 border-l-2 border-l-[#059669]" : "hover:bg-[#f4f4f3]/25"
                        )}
                      >
                        <td className="py-3.5 px-4">
                          <input type="checkbox" className="rounded border-[#e5e5e0]" onClick={e => e.stopPropagation()} />
                        </td>
                        <td className="py-3.5 px-3 font-semibold text-[#26251e] flex items-center gap-2">
                          <FolderIcon className={cn("h-4 w-4 fill-current/20", isActive ? "text-[#059669] fill-[#059669]/20" : "text-[#10b981] fill-[#10b981]/20")} />
                          <span>{folder}</span>
                        </td>
                        <td className="py-3.5 px-3 text-[#7a7a76]">
                          <span className="inline-flex items-center gap-1 bg-[#f4f4f3] px-2 py-0.5 rounded text-[10px] font-semibold text-[#555552]">
                            <Lock className="h-2.5 w-2.5" />
                            {t('library.private')}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-[#7a7a76]">
                          {count > 0
                            ? <span className="font-semibold text-[#26251e]">{count} {t('library.files_count')}</span>
                            : t('library.zero_files')}
                        </td>
                        <td className="py-3.5 px-3 text-right text-[#7a7a76] pr-6">—</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent files Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#7a7a76]">
              {selectedFolder ? selectedFolder : t('library.recent_files')}
            </h2>

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
              <p className="text-xs text-[#7a7a76]">{t('library.loading')}</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="border border-dashed border-[#e5e5e0] rounded-lg p-10 flex flex-col items-center justify-center space-y-2">
              <FileText className="h-6 w-6 text-[#7a7a76]" />
              <p className="text-xs text-[#7a7a76]">{t('library.empty_desc')} « {t('library.blank_file')} » {t('library.empty_desc_suffix')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
              {filteredDocuments.map((doc) => {
                const Icon = getFileIcon(doc.type);
                const previewText = doc.content
                  ? doc.content.replace(/[#*`_\[\]]/g, '').trim().slice(0, 120)
                  : null;
                return (
                  <div
                    key={doc.id}
                    className="border border-[#e5e5e0] hover:border-[#7a7a76] rounded-lg overflow-hidden bg-white shadow-xs flex flex-col group cursor-pointer transition-all text-left relative"
                  >
                    <button
                      onClick={() => router.push(`/library/${doc.id}`)}
                      className="flex-1 w-full text-left"
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
                        {doc.folder_name && (
                          <span className="absolute top-2 right-2 inline-flex items-center gap-1 bg-white/90 border border-[#e5e5e0] px-1.5 py-0.5 rounded text-[9px] font-semibold text-[#7a7a76]">
                            <FolderIcon className="h-2.5 w-2.5" />
                            {doc.folder_name}
                          </span>
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

                    {/* Folder assignment menu */}
                    {folders.length > 0 && (
                      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="h-6 w-6 bg-white/90 border border-[#e5e5e0] rounded flex items-center justify-center hover:bg-[#f4f4f3] text-[#7a7a76]"
                              onClick={e => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-3 w-3" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-48 text-xs">
                            <div className="px-2 py-1 text-[10px] font-bold text-[#7a7a76] uppercase tracking-wider">
                              {t('library.move_to_folder')}
                            </div>
                            <DropdownMenuSeparator />
                            {folders.map(folder => (
                              <DropdownMenuItem
                                key={folder}
                                onClick={() => handleMoveToFolder(doc, folder)}
                                className={cn("cursor-pointer gap-2", doc.folder_name === folder && "text-[#059669] font-semibold")}
                              >
                                <FolderInput className="h-3.5 w-3.5" />
                                {folder}
                              </DropdownMenuItem>
                            ))}
                            {doc.folder_name && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleMoveToFolder(doc, null)}
                                  className="cursor-pointer gap-2 text-muted-foreground"
                                >
                                  <X className="h-3.5 w-3.5" />
                                  {t('library.remove_from_folder')}
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
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
