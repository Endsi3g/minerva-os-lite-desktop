'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TiptapLink from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import {
  ArrowLeft,
  Loader2,
  Check,
  Download,
  Globe,
  Lock,
  Bold,
  Italic,
  UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  FileText,
  Share2,
  Copy,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

interface DocumentRow {
  id: string;
  user_id: string;
  title: string;
  type: 'markdown' | 'pdf' | 'docx' | 'blank';
  content: string | null;
  is_shared: boolean;
}

function htmlToMarkdown(html: string): string {
  return html
    .replace(/<h1>(.*?)<\/h1>/g, '# $1\n\n')
    .replace(/<h2>(.*?)<\/h2>/g, '## $1\n\n')
    .replace(/<h3>(.*?)<\/h3>/g, '### $1\n\n')
    .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
    .replace(/<em>(.*?)<\/em>/g, '*$1*')
    .replace(/<u>(.*?)<\/u>/g, '$1')
    .replace(/<li>(.*?)<\/li>/g, '- $1\n')
    .replace(/<\/?(ul|ol)>/g, '')
    .replace(/<p>(.*?)<\/p>/g, '$1\n\n')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<a href="(.*?)".*?>(.*?)<\/a>/g, '[$2]($1)')
    .replace(/<[^>]+>/g, '')
    .trim();
}

function ToolbarButton({ onClick, active, title, children }: { onClick: () => void; active?: boolean; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "w-7 h-7 rounded-md flex items-center justify-center transition-colors",
        active ? "bg-[#059669]/10 text-[#059669]" : "text-[#555552] hover:bg-[#f4f4f3]"
      )}
    >
      {children}
    </button>
  );
}

export default function LibraryEditorClient({ id }: { id: string }) {
  const [doc, setDoc] = useState<DocumentRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/library/${id}` : `/library/${id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).catch(() => {});
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      TiptapLink.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Commencez à écrire...' }),
      CharacterCount,
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px] text-[#26251e] leading-relaxed',
      },
    },
  });

  useEffect(() => {
    const fetchDoc = async () => {
      setIsLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error || !data) {
          setNotFound(true);
          return;
        }

        setDoc(data as DocumentRow);
        setTitle(data.title);
        setIsShared(data.is_shared);

        if ((data.type === 'markdown' || data.type === 'blank') && editor) {
          editor.commands.setContent(data.content || '');
        }
      } catch (err) {
        console.error('Error fetching document:', err);
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    };
    if (editor) fetchDoc();
  }, [id, editor]);

  const handleSave = useCallback(async () => {
    if (!doc) return;
    setIsSaving(true);
    try {
      const supabase = createClient();
      const updateFields: { title: string; is_shared: boolean; content?: string } = {
        title: title.trim() || 'Sans titre',
        is_shared: isShared,
      };
      if ((doc.type === 'markdown' || doc.type === 'blank') && editor) {
        updateFields.content = editor.getHTML();
      }

      const { error } = await supabase
        .from('documents')
        .update(updateFields)
        .eq('id', doc.id);

      if (error) throw error;
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 1500);
    } catch (err) {
      console.error('Error saving document:', err);
    } finally {
      setIsSaving(false);
    }
  }, [doc, title, isShared, editor]);

  const handleExportMd = () => {
    if (!editor) return;
    const markdown = htmlToMarkdown(editor.getHTML());
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.trim() || 'document'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    if (!editor) return;
    const html = editor.getHTML();
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>${title.trim() || 'document'}</title>
<style>
  body { font-family: Georgia, serif; max-width: 700px; margin: 40px auto; font-size: 13px; line-height: 1.7; color: #26251e; }
  h1 { font-size: 22px; margin-bottom: 8px; } h2 { font-size: 17px; } h3 { font-size: 14px; }
  p { margin: 0 0 12px; } ul, ol { margin: 0 0 12px 20px; } li { margin-bottom: 4px; }
  @media print { @page { margin: 1.5cm 2cm; } body { margin: 0; } }
</style>
</head><body>
<h1 style="margin-bottom:24px">${title.trim() || 'Document'}</h1>
${html}
</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const handleDownloadFile = () => {
    if (!doc?.content) return;
    const a = document.createElement('a');
    a.href = doc.content;
    a.download = `${title.trim() || 'document'}.${doc.type}`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <Loader2 className="w-6 h-6 text-[#059669] animate-spin" />
      </div>
    );
  }

  if (notFound || !doc) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white gap-4">
        <FileText className="w-8 h-8 text-[#7a7a76]" />
        <p className="text-xs text-[#7a7a76]">Document introuvable.</p>
        <Link href="/library">
          <Button variant="outline" size="sm" className="text-xs">Retour à la bibliothèque</Button>
        </Link>
      </div>
    );
  }

  const isEditable = doc.type === 'markdown' || doc.type === 'blank';

  return (
    <div className="h-full bg-white flex flex-col font-sans text-[#26251e]">
      {/* Topbar */}
      <div className="h-14 border-b border-[#e5e5e0] px-4 flex items-center justify-between gap-3 bg-white shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Link
            href="/library"
            className="p-2 -ml-2 rounded-lg hover:bg-slate-100 text-[#7a7a76] hover:text-[#26251e] transition-colors shrink-0"
            title="Retour à la bibliothèque"
          >
            <ArrowLeft className="w-4.5 h-4.5" />
          </Link>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre du document"
            className="text-sm font-bold bg-transparent border-0 outline-none focus:ring-0 min-w-0 flex-1 text-[#26251e]"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => { if (!isShared) setIsShared(true); setShowShareModal(true); }}
            className="h-7 px-2.5 rounded-md text-[10px] font-semibold flex items-center gap-1 border bg-[#f4f4f3] text-[#555552] border-[#e5e5e0] hover:bg-[#e5e5e0] transition-colors"
            title="Partager ce document"
          >
            <Share2 className="w-3 h-3" />
            <span>Partager</span>
          </button>
          <button
            onClick={() => setIsShared(v => !v)}
            className={cn(
              "h-7 px-2.5 rounded-md text-[10px] font-semibold flex items-center gap-1 border transition-colors",
              isShared ? "bg-[#059669]/10 text-[#059669] border-[#059669]/20" : "bg-[#f4f4f3] text-[#555552] border-[#e5e5e0]"
            )}
            title="Basculer la visibilité"
          >
            {isShared ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
            <span>{isShared ? 'Partagé' : 'Privé'}</span>
          </button>
          {isEditable && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPdf}
                className="h-7 text-xs font-semibold px-2.5 border-[#e5e5e0] text-[#555552] flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                <span>PDF</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportMd}
                className="h-7 text-xs font-semibold px-2.5 border-[#e5e5e0] text-[#555552] flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                <span>MD</span>
              </Button>
            </>
          )}
          <Button
            onClick={handleSave}
            disabled={isSaving}
            size="sm"
            className={cn(
              "h-7 text-xs font-bold px-3 flex items-center gap-1.5 rounded-md",
              saveSuccess ? "bg-[#059669]/10 text-[#059669] border border-[#059669]/20" : "bg-[#059669] hover:bg-[#047857] text-white"
            )}
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saveSuccess ? <Check className="w-3.5 h-3.5" /> : <span>Sauvegarder</span>}
          </Button>
        </div>
      </div>

      {/* Body */}
      {isEditable ? (
        <>
          {/* Toolbar */}
          {editor && (
            <div className="h-11 border-b border-[#e5e5e0] px-3 flex items-center gap-1 bg-[#fdfdfc] shrink-0 overflow-x-auto">
              <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Gras">
                <Bold className="w-3.5 h-3.5" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italique">
                <Italic className="w-3.5 h-3.5" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Souligné">
                <UnderlineIcon className="w-3.5 h-3.5" />
              </ToolbarButton>
              <div className="w-px h-5 bg-[#e5e5e0] mx-1" />
              <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Titre H1">
                <Heading1 className="w-3.5 h-3.5" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Titre H2">
                <Heading2 className="w-3.5 h-3.5" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Titre H3">
                <Heading3 className="w-3.5 h-3.5" />
              </ToolbarButton>
              <div className="w-px h-5 bg-[#e5e5e0] mx-1" />
              <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Liste à puces">
                <List className="w-3.5 h-3.5" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Liste numérotée">
                <ListOrdered className="w-3.5 h-3.5" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => {
                  const url = window.prompt('URL du lien :');
                  if (url) editor.chain().focus().setLink({ href: url }).run();
                }}
                active={editor.isActive('link')}
                title="Lien"
              >
                <Link2 className="w-3.5 h-3.5" />
              </ToolbarButton>
              <div className="w-px h-5 bg-[#e5e5e0] mx-1" />
              <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Aligner à gauche">
                <AlignLeft className="w-3.5 h-3.5" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Centrer">
                <AlignCenter className="w-3.5 h-3.5" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Aligner à droite">
                <AlignRight className="w-3.5 h-3.5" />
              </ToolbarButton>
              <div className="flex-1" />
              <span className="text-[10px] text-[#7a7a76] font-mono pr-2 shrink-0">
                {editor.storage.characterCount?.characters?.() ?? 0} caractères
              </span>
            </div>
          )}

          {/* Editor surface */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto p-10">
              <EditorContent editor={editor} />
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="h-10 border-b border-[#e5e5e0] px-4 flex items-center justify-between bg-[#fdfdfc] shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Aperçu {doc.type.toUpperCase()}</span>
            <Button variant="outline" size="sm" onClick={handleDownloadFile} className="h-6.5 text-[10px] font-semibold px-2 border-[#e5e5e0] text-[#555552] flex items-center gap-1">
              <Download className="w-3 h-3" />
              <span>Télécharger</span>
            </Button>
          </div>
          {doc.type === 'pdf' && doc.content ? (
            <iframe src={doc.content} className="flex-1 w-full" title={doc.title} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
              <FileText className="w-8 h-8 text-[#7a7a76]" />
              <p className="text-xs text-[#7a7a76] max-w-sm">
                L&apos;aperçu n&apos;est pas disponible pour les fichiers .docx dans le navigateur. Téléchargez le fichier pour le consulter.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-[420px] max-w-[95vw] p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#26251e]">Partager le document</h3>
                <p className="text-xs text-[#7a7a76] mt-0.5">
                  Seuls les utilisateurs avec un compte Minerva OS Lite peuvent accéder à ce lien.
                </p>
              </div>
              <button onClick={() => setShowShareModal(false)} className="p-1.5 rounded-lg hover:bg-[#f4f4f3] text-[#7a7a76]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 p-3 bg-[#f4f4f3] rounded-xl border border-[#e5e5e0]">
              <Globe className="w-4 h-4 text-[#059669] shrink-0" />
              <span className="text-xs text-[#26251e] font-mono flex-1 truncate">{shareUrl}</span>
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#059669] text-white text-xs font-bold rounded-lg hover:bg-[#047857] transition-colors shrink-0"
              >
                {linkCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {linkCopied ? 'Copié !' : 'Copier'}
              </button>
            </div>
            {!isShared && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                <Globe className="w-3.5 h-3.5 shrink-0" />
                Le document est actuellement <strong>privé</strong>. Il sera automatiquement rendu partageable.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
