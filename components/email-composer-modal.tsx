'use client';

import { useState, useEffect } from 'react';
import {
  Send, Loader2, Bold, Italic, Underline as UnderlineIcon,
  List, CheckCircle2, AlertCircle, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { getApiUrl } from '@/lib/api-helper';
import { useReach } from '@/lib/reach-context';
import type { Lead } from '@/lib/mock-data';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';

function substituteVars(text: string, lead: Lead): string {
  return text
    .replace(/\{\{prenom\}\}/g, lead.contactName?.split(' ')[0] || lead.businessName)
    .replace(/\{\{business\}\}/g, lead.businessName || '')
    .replace(/\{\{ville\}\}/g, lead.city || '')
    .replace(/\{\{niche\}\}/g, lead.niche || '');
}

const VARS = [
  { label: '{{prenom}}', key: 'prenom' },
  { label: '{{business}}', key: 'business' },
  { label: '{{ville}}', key: 'ville' },
  { label: '{{niche}}', key: 'niche' },
];

function EditorToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;
  return (
    <div className="flex items-center gap-0.5 border-b border-[#e5e5e0] p-1.5">
      {[
        { icon: Bold, action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold'), title: 'Gras' },
        { icon: Italic, action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic'), title: 'Italique' },
        { icon: UnderlineIcon, action: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive('underline'), title: 'Souligné' },
        { icon: List, action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList'), title: 'Liste' },
      ].map(({ icon: Icon, action, active, title }) => (
        <button
          key={title}
          type="button"
          onClick={action}
          title={title}
          className={`p-1.5 rounded transition-colors ${active ? 'bg-[#059669]/10 text-[#059669]' : 'text-[#7a7a76] hover:bg-[#f4f4f3] hover:text-[#26251e]'}`}
        >
          <Icon className="w-3.5 h-3.5" />
        </button>
      ))}
    </div>
  );
}

interface EmailComposerModalProps {
  open: boolean;
  onClose: () => void;
  lead?: Lead;
  defaultSubject?: string;
  defaultBody?: string;
}

export function EmailComposerModal({ open, onClose, lead, defaultSubject = '', defaultBody = '' }: EmailComposerModalProps) {
  const { activeWorkspace } = useReach();
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState(defaultSubject);
  const [sending, setSending] = useState(false);
  const [queuing, setQueuing] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder: 'Corps de l\'email…' }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: defaultBody,
  });

  useEffect(() => {
    if (open && lead) {
      setTo(lead.contactEmail || '');
      setSubject(defaultSubject);
      if (defaultBody && editor) editor.commands.setContent(defaultBody);
    }
    if (!open) setMsg(null);
  }, [open, lead, defaultSubject, defaultBody, editor]);

  const insertVar = (v: string) => {
    editor?.chain().focus().insertContent(v).run();
  };

  const getBodyHtml = () => {
    const html = editor?.getHTML() || '';
    return lead ? substituteVars(html, lead) : html;
  };

  const getBodyText = () => {
    const text = editor?.getText() || '';
    return lead ? substituteVars(text, lead) : text;
  };

  const getSubject = () => lead ? substituteVars(subject, lead) : subject;

  const handleSend = async () => {
    if (!to || !subject || !editor) return;
    setSending(true);
    setMsg(null);
    try {
      const res = await fetch(getApiUrl('/api/send-email'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          subject: getSubject(),
          body: getBodyHtml(),
          leadId: lead?.id,
          workspaceId: activeWorkspace?.id,
        }),
      });
      if (res.ok) {
        // Log to queue as sent
        await fetch(getApiUrl('/api/outreach/queue'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId: lead?.id,
            toEmail: to,
            toName: lead?.contactName || lead?.businessName,
            subject: getSubject(),
            bodyHtml: getBodyHtml(),
            bodyText: getBodyText(),
            scheduledAt: new Date().toISOString(),
          }),
        });
        setMsg({ type: 'success', text: 'Email envoyé !' });
        setTimeout(onClose, 1500);
      } else {
        const d = await res.json();
        setMsg({ type: 'error', text: d.error || 'Erreur d\'envoi' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Erreur réseau' });
    } finally {
      setSending(false);
    }
  };

  const handleQueue = async () => {
    if (!to || !subject || !editor) return;
    setQueuing(true);
    setMsg(null);
    try {
      const res = await fetch(getApiUrl('/api/outreach/queue'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead?.id,
          toEmail: to,
          toName: lead?.contactName || lead?.businessName,
          subject: getSubject(),
          bodyHtml: getBodyHtml(),
          bodyText: getBodyText(),
          scheduledAt: new Date().toISOString(),
        }),
      });
      if (res.ok) {
        setMsg({ type: 'success', text: 'Ajouté à la queue !' });
        setTimeout(onClose, 1500);
      } else {
        setMsg({ type: 'error', text: 'Erreur' });
      }
    } finally {
      setQueuing(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[520px] sm:max-w-[520px] p-0 flex flex-col bg-white overflow-hidden" side="right">
        <SheetHeader className="px-5 py-4 border-b border-[#e5e5e0] shrink-0 flex-row items-center justify-between">
          <SheetTitle className="text-sm font-bold text-[#26251e]">
            Composer un email
            {lead && <span className="text-[#7a7a76] font-normal ml-1">→ {lead.businessName}</span>}
          </SheetTitle>
          <button onClick={onClose} className="p-1 rounded hover:bg-[#f4f4f3] text-[#7a7a76] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#7a7a76] w-8 shrink-0">À</span>
            <Input
              value={to}
              onChange={e => setTo(e.target.value)}
              placeholder="email@exemple.com"
              className="h-7 text-xs border-[#e5e5e0] flex-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#7a7a76] w-8 shrink-0">Objet</span>
            <Input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Objet de l'email"
              className="h-7 text-xs border-[#e5e5e0] flex-1"
            />
          </div>

          {/* Variable chips */}
          <div className="flex flex-wrap gap-1">
            {VARS.map(v => (
              <button
                key={v.key}
                type="button"
                onClick={() => insertVar(`{{${v.key}}}`)}
                className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#e5e5e0] bg-white hover:bg-[#059669]/5 hover:border-[#059669]/30 text-[#26251e] transition-colors"
              >
                {v.label}
              </button>
            ))}
          </div>

          <Separator className="bg-[#e5e5e0]" />

          <div className="border border-[#e5e5e0] rounded-lg overflow-hidden">
            {editor && <EditorToolbar editor={editor} />}
            <div className="min-h-[200px] text-xs p-3 prose prose-xs max-w-none">
              <EditorContent editor={editor} />
            </div>
          </div>

          {msg && (
            <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg border ${
              msg.type === 'success'
                ? 'bg-[#059669]/10 text-[#059669] border-[#059669]/20'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              {msg.type === 'success'
                ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
              {msg.text}
            </div>
          )}
        </div>

        <div className="shrink-0 px-5 py-4 border-t border-[#e5e5e0] flex items-center gap-2">
          <Button
            onClick={handleSend}
            disabled={sending || !to || !subject}
            className="h-8 bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs gap-1.5"
          >
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Envoyer maintenant
          </Button>
          <Button
            variant="outline"
            onClick={handleQueue}
            disabled={queuing || !to || !subject}
            className="h-8 text-xs font-bold border-[#e5e5e0] gap-1.5"
          >
            {queuing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Mettre en queue
          </Button>
          <Button variant="ghost" onClick={onClose} className="h-8 text-xs text-[#7a7a76] ml-auto">
            Annuler
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
