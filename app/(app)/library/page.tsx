"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
  Check,
  Move,
  Share2,
  Image as ImageIcon,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getFolders, addFolder } from "@/lib/onboarding-store";
import { useLanguage } from "@/lib/language-context";
import { useReach } from "@/lib/reach-context";
import { createClient } from "@/lib/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LeverageLibraryRoot } from "@/app/(app)/leverage-library/_components/leverage-library-root";
import EmailTemplatesPage from "@/app/(app)/settings/email-templates/page";
import { WebsitePortfolioSection } from "@/app/(app)/website-builder/_components/website-portfolio-section";

interface DocumentRow {
  id: string;
  user_id: string;
  workspace_id: string | null;
  title: string;
  type: "markdown" | "pdf" | "docx" | "blank";
  content: string | null;
  is_shared: boolean;
  folder_name: string | null;
  created_at: string;
  updated_at: string;
}

const getFileIcon = (type: DocumentRow["type"]) => {
  if (type === "pdf") return FileText;
  if (type === "docx") return FileSpreadsheet;
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
    id: "business-plan",
    label: "Plan d'affaires",
    emoji: "📊",
    type: "markdown" as const,
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
    id: "audit-gmb",
    label: "Audit GMB",
    emoji: "🔍",
    type: "markdown" as const,
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
    id: "email-prospection",
    label: "Email de prospection",
    emoji: "✉️",
    type: "markdown" as const,
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
    id: "rapport-hebdo",
    label: "Rapport hebdo",
    emoji: "📅",
    type: "markdown" as const,
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
  useEffect(() => { document.title = 'Bibliothèque — Minerva'; }, []);
  const { t } = useLanguage();
  const router = useRouter();
  const { activeWorkspace } = useReach();

  const [mainCategory, setMainCategory] = useState<'documents' | 'proofs' | 'emailTemplates' | 'websites'>('documents');
  const [activeTab, setActiveTab] = useState<"All" | "Shared" | "Private">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [folders, setFolders] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image gallery state
  const [images, setImages] = useState<{ name: string; url: string; created_at: string }[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Multi-select features
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  // Public Folders (Offline settings / localstorage cache)
  const [publicFolders, setPublicFolders] = useState<string[]>([]);
  const [copiedFolder, setCopiedFolder] = useState<string | null>(null);

  useEffect(() => {
    const syncStore = () => {
      setFolders(getFolders());
    };
    syncStore();
    window.addEventListener("minerva_store_update", syncStore);

    // Load public folders cache
    const cachedPublic = localStorage.getItem("minerva_public_folders");
    if (cachedPublic) setPublicFolders(JSON.parse(cachedPublic));

    return () => {
      window.removeEventListener("minerva_store_update", syncStore);
    };
  }, []);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase.from("documents").select("*").order("updated_at", { ascending: false });

      if (activeTab === "Shared") {
        query = query.eq("is_shared", true);
      } else if (activeTab === "Private") {
        query = query.eq("user_id", user.id).eq("is_shared", false);
      } else {
        query = query.or(`user_id.eq.${user.id},is_shared.eq.true`);
      }

      const { data, error } = await query;
      if (!error && data) setDocuments(data as DocumentRow[]);
    } catch (err) {
      console.error("Error fetching documents:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Bulk actions handlers
  const handleBulkMoveToFolder = async (folderName: string | null) => {
    if (selectedDocIds.length === 0) return;
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("documents")
        .update({ folder_name: folderName })
        .in("id", selectedDocIds);

      if (!error) {
        setDocuments((prev) =>
          prev.map((d) => (selectedDocIds.includes(d.id) ? { ...d, folder_name: folderName } : d))
        );
        setSelectedDocIds([]);
      }
    } catch (err) {
      console.error("Error bulk moving documents:", err);
    }
  };

  const handleBulkShare = async (isShared: boolean) => {
    if (selectedDocIds.length === 0) return;
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("documents")
        .update({ is_shared: isShared })
        .in("id", selectedDocIds);

      if (!error) {
        setDocuments((prev) =>
          prev.map((d) => (selectedDocIds.includes(d.id) ? { ...d, is_shared: isShared } : d))
        );
        setSelectedDocIds([]);
      }
    } catch (err) {
      console.error("Error bulk sharing documents:", err);
    }
  };

  const handleToggleFolderPublic = (folderName: string) => {
    const next = publicFolders.includes(folderName)
      ? publicFolders.filter((f) => f !== folderName)
      : [...publicFolders, folderName];
    setPublicFolders(next);
    localStorage.setItem("minerva_public_folders", JSON.stringify(next));
  };

  const handleCopyFolderLink = (folderName: string) => {
    const link = `${window.location.origin}/share/folder/${encodeURIComponent(folderName)}`;
    navigator.clipboard.writeText(link);
    setCopiedFolder(folderName);
    setTimeout(() => setCopiedFolder(null), 1500);
  };

  const handleCreateBlank = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("documents")
        .insert({
          user_id: user.id,
          workspace_id: activeWorkspace?.id || null,
          title: "Sans titre",
          type: "blank",
          content: "",
          is_shared: false,
          folder_name: selectedFolder || null,
        })
        .select()
        .single();

      if (error) throw error;
      router.push(`/library/${data.id}`);
    } catch (err) {
      console.error("Error creating blank document:", err);
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

      const ext = file.name.split(".").pop()?.toLowerCase();
      const type: DocumentRow["type"] = ext === "pdf" ? "pdf" : ext === "docx" ? "docx" : "markdown";

      const content: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        if (type === "markdown") {
          reader.readAsText(file);
        } else {
          reader.readAsDataURL(file);
        }
      });

      const { data, error } = await supabase
        .from("documents")
        .insert({
          user_id: user.id,
          workspace_id: activeWorkspace?.id || null,
          title: file.name.replace(/\.[^/.]+$/, ""),
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
      console.error("Error uploading document:", err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCreateFromTemplate = async (template: typeof ENTREPRENEUR_TEMPLATES[number]) => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("documents")
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
      console.error("Error creating from template:", err);
    }
  };

  const handleMoveToFolder = async (doc: DocumentRow, folderName: string | null) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("documents")
        .update({ folder_name: folderName })
        .eq("id", doc.id);
      if (!error) {
        setDocuments((prev) => prev.map((d) => (d.id === doc.id ? { ...d, folder_name: folderName } : d)));
      }
    } catch (err) {
      console.error("Error moving document to folder:", err);
    }
  };

  const handleToggleShareSingle = async (doc: DocumentRow) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("documents")
        .update({ is_shared: !doc.is_shared })
        .eq("id", doc.id);
      if (!error) {
        setDocuments((prev) => prev.map((d) => (d.id === doc.id ? { ...d, is_shared: !doc.is_shared } : d)));
      }
    } catch (err) {
      console.error("Error toggling document share:", err);
    }
  };

  // Load images from Supabase Storage
  const loadImages = useCallback(async () => {
    setImagesLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase.storage.from('library-assets').list('', {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' },
      });
      if (data) {
        const imgs = data
          .filter((f: { name: string }) => /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(f.name))
          .map((f: { name: string; created_at?: string }) => {
            const { data: urlData } = supabase.storage.from('library-assets').getPublicUrl(f.name);
            return { name: f.name, url: urlData.publicUrl, created_at: f.created_at || '' };
          });
        setImages(imgs);
      }
    } catch { /* bucket may not exist yet */ }
    finally { setImagesLoading(false); }
  }, []);

  useEffect(() => { loadImages(); }, [loadImages]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    try {
      const supabase = createClient();
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;
      const ext = file.name.split('.').pop() || 'jpg';
      const filename = `${authData.user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('library-assets').upload(filename, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) {
        if (error.message.includes('Bucket not found')) {
          toast.error('Le bucket "library-assets" n\'existe pas encore. Créez-le dans Supabase Storage → Buckets (public).');
        } else {
          toast.error(error.message);
        }
        return;
      }
      toast.success('Image uploadée !');
      await loadImages();
    } catch { toast.error('Erreur lors de l\'upload.'); }
    finally {
      setImageUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleDeleteImage = async (name: string) => {
    const supabase = createClient();
    const { error } = await supabase.storage.from('library-assets').remove([name]);
    if (!error) {
      setImages(prev => prev.filter(i => i.name !== name));
      toast.success('Image supprimée.');
    }
  };

  const folderDocCount = (folderName: string) =>
    documents.filter((d) => d.folder_name === folderName).length;

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFolder = selectedFolder === null ? true : doc.folder_name === selectedFolder;
    return matchesSearch && matchesFolder;
  });

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf9]">
      <div className="max-w-6xl mx-auto p-8 space-y-8 text-[#26251e] font-sans selection:bg-[#10b981]/10 text-left">
        
        {/* Header Section */}
        <div className="space-y-3 text-left border-b border-[#e5e5e0] pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-[#26251e] font-sans">{t("library.title")}</h1>
              <p className="text-xs text-[#807d72]">
                Source unique de tous vos assets, preuves sociales, modèles et documents.
              </p>
            </div>
          </div>
          {/* Main Category Tabs */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setMainCategory('documents')}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                mainCategory === 'documents'
                  ? "bg-[#059669] text-white shadow-sm"
                  : "bg-white text-[#7a7a76] border border-[#e5e5e0] hover:text-[#26251e] hover:bg-[#fafaf8]"
              )}
            >
              Documents & Fichiers
            </button>
            <button
              type="button"
              onClick={() => setMainCategory('proofs')}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                mainCategory === 'proofs'
                  ? "bg-[#059669] text-white shadow-sm"
                  : "bg-white text-[#7a7a76] border border-[#e5e5e0] hover:text-[#26251e] hover:bg-[#fafaf8]"
              )}
            >
              Preuves & Témoignages
            </button>
            <button
              type="button"
              onClick={() => setMainCategory('emailTemplates')}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                mainCategory === 'emailTemplates'
                  ? "bg-[#059669] text-white shadow-sm"
                  : "bg-white text-[#7a7a76] border border-[#e5e5e0] hover:text-[#26251e] hover:bg-[#fafaf8]"
              )}
            >
              Modèles d'Emails
            </button>
            <button
              type="button"
              onClick={() => setMainCategory('websites')}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                mainCategory === 'websites'
                  ? "bg-[#059669] text-white shadow-sm"
                  : "bg-white text-[#7a7a76] border border-[#e5e5e0] hover:text-[#26251e] hover:bg-[#fafaf8]"
              )}
            >
              Sites de référence
            </button>
          </div>
        </div>

        {mainCategory === 'proofs' && (
          <div className="rounded-2xl border border-[#e5e5e0] bg-white overflow-hidden p-2">
            <LeverageLibraryRoot />
          </div>
        )}

        {mainCategory === 'emailTemplates' && (
          <div className="rounded-2xl border border-[#e5e5e0] bg-white overflow-hidden p-2">
            <EmailTemplatesPage />
          </div>
        )}

        {mainCategory === 'websites' && (
          <div className="rounded-2xl border border-[#e5e5e0] bg-white overflow-hidden p-2">
            <WebsitePortfolioSection />
          </div>
        )}

        {mainCategory === 'documents' && (
          <>

        {/* Create new file Row */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#807d72]">{t("library.create_new")}</h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            
            {/* Blank File Card */}
            <div className="flex flex-col gap-2">
              <button
                onClick={handleCreateBlank}
                className="aspect-[4/3] w-full border border-dashed border-[#e5e5e0] hover:border-[#7a7a76] rounded-xl bg-white flex flex-col items-center justify-center cursor-pointer transition-all"
              >
                <Plus className="h-5 w-5 text-[#807d72] stroke-[2.5]" />
              </button>
              <div className="flex items-center justify-between text-[11px] px-1">
                <span className="font-semibold text-[#26251e]">{t("library.blank_file")}</span>
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
                className="aspect-[4/3] w-full border border-dashed border-[#e5e5e0] hover:border-[#7a7a76] rounded-xl bg-white flex flex-col items-center justify-center cursor-pointer transition-all"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 text-[#807d72] animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 text-[#807d72] mb-1 stroke-[2]" />
                )}
                <span className="text-[9px] font-bold text-[#807d72] uppercase tracking-wider">{t("library.add_template")}</span>
              </button>
            </div>

            {/* Entrepreneur template cards */}
            {ENTREPRENEUR_TEMPLATES.map((tpl) => (
              <div key={tpl.id} className="flex flex-col gap-2">
                <button
                  onClick={() => handleCreateFromTemplate(tpl)}
                  className="aspect-[4/3] w-full border border-[#e5e5e0] hover:border-[#10b981]/50 rounded-xl bg-white hover:bg-neutral-50 flex flex-col items-center justify-center cursor-pointer transition-all gap-1"
                >
                  <span className="text-2xl">{tpl.emoji}</span>
                </button>
                <div className="text-[11px] px-1 font-semibold text-[#26251e] truncate">{tpl.label}</div>
              </div>
            ))}

          </div>
        </div>

        {/* Folders Section */}
        <div className="space-y-4">
          <div className="border-b border-[#e5e5e0] pb-2 flex justify-between items-end">
            
            {/* Filter pills */}
            <div className="flex gap-2 items-center flex-wrap">
              {(["All", "Shared", "Private"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border border-transparent",
                    activeTab === tab
                      ? "bg-[#26251e] text-white"
                      : "text-[#807d72] hover:bg-[#e5e5e2]/60 bg-white border-[#e5e5e0]"
                  )}
                >
                  {tab}
                </button>
              ))}
              {selectedFolder && (
                <span className="inline-flex items-center gap-1.5 bg-[#10b981]/10 border border-[#10b981]/20 text-[#059669] px-2.5 py-1 rounded-full text-xs font-semibold">
                  <FolderIcon className="h-3 w-3" />
                  {selectedFolder}
                  <button onClick={() => setSelectedFolder(null)} className="hover:text-[#047857] ml-0.5 cursor-pointer">
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
                className="h-8 text-xs font-bold bg-[#10b981] hover:bg-[#059669] text-white flex items-center gap-1 rounded-xl px-3 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t("library.create_folder")}</span>
              </Button>
            </div>

          </div>

          {/* Folders Table */}
          {activeTab !== "Shared" && folders.length > 0 && (
            <div className="border border-[#e5e5e0] bg-white rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#fafaf9] border-b border-[#e5e5e0] text-[#807d72] font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">{t("library.table_name")}</th>
                    <th className="py-3 px-4">Visibilité & Partage</th>
                    <th className="py-3 px-4">{t("library.table_files")}</th>
                    <th className="py-3 px-4 text-right pr-6">{t("library.table_updated")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e5e0]">
                  {folders.map((folder) => {
                    const count = folderDocCount(folder);
                    const isActive = selectedFolder === folder;
                    const isPublic = publicFolders.includes(folder);
                    const isCopied = copiedFolder === folder;

                    return (
                      <tr
                        key={folder}
                        onClick={() => setSelectedFolder(isActive ? null : folder)}
                        className={cn(
                          "transition-colors cursor-pointer",
                          isActive ? "bg-[#10b981]/5" : "hover:bg-[#fafaf9]"
                        )}
                      >
                        {/* Name & Folder Icon */}
                        <td className="py-3.5 px-4 font-bold text-[#26251e] flex items-center gap-2">
                          <FolderIcon
                            className={cn(
                              "h-4 w-4 fill-current/20 shrink-0",
                              isActive ? "text-[#059669]" : "text-[#10b981]"
                            )}
                          />
                          <span>{folder}</span>
                        </td>

                        {/* Visibility column with inline toggle button */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleToggleFolderPublic(folder)}
                              className={cn(
                                "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer",
                                isPublic
                                  ? "bg-[#10b981]/15 text-[#059669] border-[#10b981]/30 hover:bg-[#10b981]/25"
                                  : "bg-[#f4f4f3] text-[#807d72] border-[#e5e5e0] hover:bg-neutral-100"
                              )}
                            >
                              {isPublic ? (
                                <>
                                  <Globe className="h-2.5 w-2.5 animate-pulse" /> Public
                                </>
                              ) : (
                                <>
                                  <Lock className="h-2.5 w-2.5" /> Privé
                                </>
                              )}
                            </button>

                            {isPublic && (
                              <button
                                onClick={() => handleCopyFolderLink(folder)}
                                className="text-[10px] text-[#10b981] hover:underline font-bold transition-all cursor-pointer"
                              >
                                {isCopied ? "Lien copié !" : "Copier le lien"}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Document count */}
                        <td className="py-3.5 px-4 text-[#807d72]">
                          {count > 0 ? (
                            <span className="font-semibold text-[#26251e]">
                              {count} {t("library.files_count")}
                            </span>
                          ) : (
                            t("library.zero_files")
                          )}
                        </td>

                        {/* Updated at */}
                        <td className="py-3.5 px-4 text-right text-[#807d72] pr-6">—</td>
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
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#807d72]">
              {selectedFolder ? selectedFolder : t("library.recent_files")}
            </h2>

            <div className="flex items-center gap-3">
              {/* Search input */}
              <div className="relative w-44">
                <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-[#807d72]" />
                <Input
                  placeholder={t("library.search_placeholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-7.5 pl-7 text-xs bg-white border-[#e5e5e0] focus-visible:ring-1 focus-visible:ring-[#10b981] rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Files Grid */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-6 h-6 text-[#10b981] animate-spin" />
              <p className="text-xs text-[#807d72]">{t("library.loading")}</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="border border-dashed border-[#e5e5e0] rounded-xl bg-white p-10 flex flex-col items-center justify-center space-y-2">
              <FileText className="h-6 w-6 text-[#807d72]" />
              <p className="text-xs text-[#807d72]">
                {t("library.empty_desc")} « {t("library.blank_file")} » {t("library.empty_desc_suffix")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
              {filteredDocuments.map((doc) => {
                const Icon = getFileIcon(doc.type);
                const previewText = doc.content
                  ? doc.content.replace(/[#*`_\[\]]/g, "").trim().slice(0, 120)
                  : null;
                const isSelected = selectedDocIds.includes(doc.id);

                return (
                  <div
                    key={doc.id}
                    className={cn(
                      "border rounded-xl overflow-hidden bg-white shadow-xs flex flex-col group transition-all text-left relative",
                      isSelected
                        ? "border-[#10b981] ring-1 ring-[#10b981]"
                        : "border-[#e5e5e0] hover:border-[#7a7a76]"
                    )}
                  >
                    {/* Hover check boxes selection overlay */}
                    <div
                      className={cn(
                        "absolute top-2.5 left-2.5 z-10 transition-opacity",
                        selectedDocIds.length > 0
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100"
                      )}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDocIds((prev) => [...prev, doc.id]);
                          } else {
                            setSelectedDocIds((prev) => prev.filter((id) => id !== doc.id));
                          }
                        }}
                        className="w-4 h-4 rounded border-[#e5e5e0] text-[#10b981] focus:ring-[#10b981] bg-white cursor-pointer"
                      />
                    </div>

                    <button
                      onClick={() => router.push(`/library/${doc.id}`)}
                      className="flex-1 w-full text-left"
                    >
                      <div className="aspect-[4/3] bg-[#fafaf9] border-b border-[#e5e5e0] p-3 flex flex-col justify-start overflow-hidden relative pt-8">
                        {previewText ? (
                          <p className="text-[9px] text-[#807d72] leading-relaxed line-clamp-6 whitespace-pre-line select-none">
                            {previewText}
                          </p>
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <Icon className="h-8 w-8 text-[#10b981]" />
                          </div>
                        )}
                        {doc.folder_name && (
                          <span className="absolute top-2 right-2 inline-flex items-center gap-1 bg-white/90 border border-[#e5e5e0] px-1.5 py-0.5 rounded text-[9px] font-semibold text-[#807d72]">
                            <FolderIcon className="h-2.5 w-2.5" />
                            {doc.folder_name}
                          </span>
                        )}
                      </div>
                      <div className="p-3 space-y-1 w-full">
                        <div className="flex items-center justify-between text-[10px] text-[#807d72]">
                          <span>{formatRelativeTime(doc.updated_at)}</span>
                          {doc.is_shared ? (
                            <Globe className="h-2.5 w-2.5 text-[#059669]" />
                          ) : (
                            <Lock className="h-2.5 w-2.5" />
                          )}
                        </div>
                        <div className="text-xs font-semibold text-[#26251e] truncate">{doc.title}</div>
                        <div className="text-[10px] text-[#807d72] uppercase font-bold tracking-wider">{doc.type}</div>
                      </div>
                    </button>

                    {/* Folder assignment dropdown menu (Top Right Corner) */}
                    {folders.length > 0 && (
                      <div
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="h-6 w-6 bg-white/90 border border-[#e5e5e0] rounded-lg flex items-center justify-center hover:bg-[#f4f4f3] text-[#807d72] cursor-pointer"
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 text-xs font-sans">
                            <div className="px-2 py-1 text-[10px] font-bold text-[#807d72] uppercase tracking-wider">
                              Partager / Actions
                            </div>
                            <DropdownMenuItem
                              onClick={() => handleToggleShareSingle(doc)}
                              className="cursor-pointer gap-2 font-semibold text-[#26251e]"
                            >
                              <Share2 className="h-3.5 w-3.5" />
                              {doc.is_shared ? "Rendre Privé" : "Partager (Public)"}
                            </DropdownMenuItem>
                            
                            {doc.is_shared && (
                              <DropdownMenuItem
                                onClick={() => {
                                  const link = `${window.location.origin}/share/document/${doc.id}`;
                                  navigator.clipboard.writeText(link);
                                  toast.success("Lien de partage du document copié !");
                                }}
                                className="cursor-pointer gap-2 text-[#10b981]"
                              >
                                <Globe className="h-3.5 w-3.5" />
                                Copier le lien
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            <div className="px-2 py-1 text-[10px] font-bold text-[#807d72] uppercase tracking-wider">
                              {t("library.move_to_folder")}
                            </div>
                            {folders.map((folder) => (
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
                                  className="cursor-pointer gap-2 text-red-600 hover:bg-red-50"
                                >
                                  <X className="h-3.5 w-3.5" />
                                  {t("library.remove_from_folder")}
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

        {/* Floating Bulk Action Bar (appears at bottom when item(s) are selected) */}
        {selectedDocIds.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white border border-[#e5e5e0] rounded-2xl px-6 py-3.5 shadow-2xl z-[90] flex items-center gap-6 animate-in slide-in-from-bottom-5 duration-250 w-full max-w-xl">
            <span className="text-xs font-bold text-[#26251e] shrink-0">
              {selectedDocIds.length} fichier{selectedDocIds.length > 1 ? "s" : ""} sélectionné{selectedDocIds.length > 1 ? "s" : ""}
            </span>

            <div className="h-5 w-px bg-[#e5e5e0]" />

            {/* Folder move dropdown selector */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs font-bold flex items-center gap-1 border-[#e5e5e0] rounded-xl shrink-0 cursor-pointer"
                  >
                    <Move className="w-3.5 h-3.5 text-[#807d72]" />
                    Déplacer vers...
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48 text-xs font-sans max-h-48 overflow-y-auto" align="start">
                  {folders.map((folder) => (
                    <DropdownMenuItem
                      key={folder}
                      onClick={() => handleBulkMoveToFolder(folder)}
                      className="cursor-pointer gap-2"
                    >
                      <FolderIcon className="w-3.5 h-3.5 text-[#10b981]" />
                      {folder}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleBulkMoveToFolder(null)}
                    className="cursor-pointer gap-2 text-red-600 hover:bg-red-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    Aucun dossier
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Share/Private Bulk buttons */}
              <Button
                onClick={() => handleBulkShare(true)}
                size="sm"
                variant="outline"
                className="h-8 text-xs font-bold flex items-center gap-1 border-[#e5e5e0] rounded-xl cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5 text-[#059669]" />
                Partager
              </Button>

              <Button
                onClick={() => handleBulkShare(false)}
                size="sm"
                variant="outline"
                className="h-8 text-xs font-bold flex items-center gap-1 border-[#e5e5e0] rounded-xl cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-[#807d72]" />
                Privé
              </Button>
            </div>

            {/* Cancel Button */}
            <button
              onClick={() => setSelectedDocIds([])}
              className="p-1 rounded-lg hover:bg-neutral-100 text-[#807d72] hover:text-[#26251e] transition-colors cursor-pointer shrink-0"
              title="Annuler la sélection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Images Section (Supabase Storage) ── */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-[#059669]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#807d72]">Images</h2>
            </div>
            <div className="flex items-center gap-2">
              {imagesLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#059669]" />}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <Button
                size="sm"
                onClick={() => imageInputRef.current?.click()}
                disabled={imageUploading}
                className="h-7 bg-[#059669] hover:bg-[#047857] text-white text-xs gap-1.5 rounded-xl"
              >
                {imageUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                Importer
              </Button>
            </div>
          </div>

          {images.length === 0 && !imagesLoading ? (
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={imageUploading}
              className="w-full border-2 border-dashed border-[#e5e5e0] hover:border-[#059669]/40 rounded-2xl py-12 flex flex-col items-center justify-center gap-2 transition-colors group"
            >
              <ImageIcon className="h-8 w-8 text-[#807d72] group-hover:text-[#059669] transition-colors" />
              <p className="text-xs font-bold text-[#807d72] group-hover:text-[#26251e]">Importer des images</p>
              <p className="text-[10px] text-[#807d72]">PNG, JPG, GIF, WebP, SVG — stockés dans Supabase Storage</p>
            </button>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {images.map((img) => (
                <div key={img.name} className="group relative aspect-square rounded-xl overflow-hidden border border-[#e5e5e0] bg-[#fafaf8]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <a
                      href={img.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-[#26251e] text-[10px] font-bold"
                    >
                      <Globe className="w-3 h-3" />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(img.name)}
                      className="p-1.5 rounded-lg bg-white/90 hover:bg-red-50 text-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  {/* Copy URL on click */}
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(img.url); toast.success('URL copiée !'); }}
                    className="absolute bottom-0 left-0 right-0 text-[8px] font-bold text-white bg-black/60 px-1 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity text-center"
                  >
                    Copier l'URL
                  </button>
                </div>
              ))}
              {/* Upload card */}
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={imageUploading}
                className="aspect-square rounded-xl border-2 border-dashed border-[#e5e5e0] hover:border-[#059669]/50 flex flex-col items-center justify-center gap-1 transition-colors group"
              >
                {imageUploading ? (
                  <Loader2 className="h-5 w-5 text-[#059669] animate-spin" />
                ) : (
                  <>
                    <Plus className="h-5 w-5 text-[#807d72] group-hover:text-[#059669] transition-colors" />
                    <span className="text-[9px] font-bold text-[#807d72] group-hover:text-[#059669]">Ajouter</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
        </>
        )}

      </div>

      {showNewFolderModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white border border-[#e6e5e0] rounded-2xl p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#26251e] text-left">{t("library.new_folder_modal_title")}</h3>
              <p className="text-xs text-[#807d72] text-left">{t("library.new_folder_modal_desc")}</p>
            </div>
            <input
              type="text"
              placeholder={t("library.folder_name_placeholder")}
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="w-full text-xs p-2.5 bg-white border border-[#e6e5e0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#10b981]"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (newFolderName.trim()) {
                    addFolder(newFolderName.trim());
                    setNewFolderName("");
                    setShowNewFolderModal(false);
                  }
                }
              }}
            />
            <div className="flex justify-end gap-2 text-xs pt-1">
              <Button
                variant="ghost"
                onClick={() => {
                  setNewFolderName("");
                  setShowNewFolderModal(false);
                }}
                className="h-8 text-[#807d72] rounded-lg cursor-pointer"
              >
                {t("library.cancel")}
              </Button>
              <Button
                onClick={() => {
                  if (newFolderName.trim()) {
                    addFolder(newFolderName.trim());
                    setNewFolderName("");
                    setShowNewFolderModal(false);
                  }
                }}
                className="h-8 bg-[#10b981] hover:bg-[#059669] text-white font-bold rounded-lg cursor-pointer"
              >
                {t("library.create_btn")}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
