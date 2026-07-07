'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, Plus, X, ChevronDown, Mail, Clock, CheckSquare,
  GitBranch, Loader2, Archive, Users, RefreshCw, Settings,
  ChevronRight, Bold, Italic, Underline as UnderlineIcon,
  List, AlignLeft, Calendar, CheckCircle2, AlertCircle, Ban,
  Phone, MessageSquare, FlaskConical, Pause, Sparkles, ThumbsUp,
  ThumbsDown, Info, CalendarCheck, OctagonX, UserX, Clock3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/lib/language-context';
import { useReach } from '@/lib/reach-context';
import { getApiUrl } from '@/lib/api-helper';
import { createClient } from '@/lib/supabase/client';
import type { SequenceTemplate, SequenceStep, Lead } from '@/lib/mock-data';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';

// ── Variable substitution ──────────────────────────────────────────────────────
function substituteVars(text: string, lead: Lead): string {
  let result = text
    .replace(/\{\{prenom\}\}/g, lead.contactName?.split(' ')[0] || lead.businessName)
    .replace(/\{\{business\}\}/g, lead.businessName || '')
    .replace(/\{\{ville\}\}/g, lead.city || '')
    .replace(/\{\{niche\}\}/g, lead.niche || '');

  if (lead.customFields && typeof lead.customFields === 'object') {
    Object.entries(lead.customFields).forEach(([key, val]) => {
      const escapedKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\{\\{${escapedKey}\\}\\}`, 'g');
      result = result.replace(regex, String(val ?? ''));
    });
  }

  return result;
}

// ── Variable chips ─────────────────────────────────────────────────────────────
const VARS = [
  { label: '{{prenom}}', key: 'prenom' },
  { label: '{{business}}', key: 'business' },
  { label: '{{ville}}', key: 'ville' },
  { label: '{{niche}}', key: 'niche' },
];

function VarChips({ onInsert, customFields }: { onInsert: (v: string) => void; customFields?: Record<string, string> }) {
  const extraKeys = customFields ? Object.keys(customFields) : [];
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {VARS.map(v => (
        <button
          key={v.key}
          type="button"
          onClick={() => onInsert(`{{${v.key}}}`)}
          className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#e5e5e0] bg-white hover:bg-[#059669]/5 hover:border-[#059669]/30 text-[#26251e] transition-colors"
        >
          {v.label}
        </button>
      ))}
      {extraKeys.map(k => (
        <button
          key={k}
          type="button"
          onClick={() => onInsert(`{{${k}}}`)}
          className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-purple-200 bg-purple-50 hover:bg-purple-100 hover:border-purple-300 text-purple-700 transition-colors"
        >
          {`{{${k}}}`}
        </button>
      ))}
    </div>
  );
}

// ── TipTap mini toolbar ────────────────────────────────────────────────────────
function EditorToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;
  return (
    <div className="flex items-center gap-0.5 border-b border-[#e5e5e0] p-1.5 flex-wrap">
      {[
        { icon: Bold, action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold'), title: 'Gras' },
        { icon: Italic, action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic'), title: 'Italique' },
        { icon: UnderlineIcon, action: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive('underline'), title: 'Souligné' },
        { icon: List, action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList'), title: 'Liste' },
        { icon: AlignLeft, action: () => editor.chain().focus().setTextAlign('left').run(), active: false, title: 'Aligner à gauche' },
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

// ── Status badge colors ────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    sending: 'bg-blue-50 text-blue-700 border-blue-200',
    sent: 'bg-[#059669]/10 text-[#059669] border-[#059669]/20',
    failed: 'bg-red-50 text-red-700 border-red-200',
    cancelled: 'bg-slate-50 text-slate-600 border-slate-200',
    active: 'bg-[#059669]/10 text-[#059669] border-[#059669]/20',
    archived: 'bg-slate-50 text-slate-600 border-slate-200',
  };
  const labels: Record<string, string> = {
    pending: 'En attente', sending: 'Envoi...', sent: 'Envoyé',
    failed: 'Échec', cancelled: 'Annulé', active: 'Actif', archived: 'Archivé',
  };
  return (
    <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full border ${colors[status] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
      {labels[status] || status}
    </span>
  );
}

// ── Sequence Step Editor ───────────────────────────────────────────────────────
function StepEditor({
  step,
  onChange,
  onDelete,
}: {
  step: SequenceStep;
  onChange: (s: SequenceStep) => void;
  onDelete: () => void;
}) {
  const emailEditor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder: 'Corps de l\'email…' }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: step.bodyHtml || '',
    onUpdate: ({ editor }) => {
      onChange({ ...step, bodyHtml: editor.getHTML() });
    },
  });

  const stepIcons: Record<string, React.ReactNode> = {
    email: <Mail className="w-3.5 h-3.5 text-[#059669]" />,
    delay: <Clock className="w-3.5 h-3.5 text-amber-500" />,
    task: <CheckSquare className="w-3.5 h-3.5 text-blue-500" />,
    condition: <GitBranch className="w-3.5 h-3.5 text-purple-500" />,
    call: <Phone className="w-3.5 h-3.5 text-emerald-500" />,
    sms: <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />,
    ab_test: <FlaskConical className="w-3.5 h-3.5 text-[#7a7a76]" />,
  };

  return (
    <div className="border border-[#e5e5e0] rounded-xl bg-white group relative">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#e5e5e0]">
        {stepIcons[step.type]}
        <Select
          value={step.type}
          onValueChange={(v: SequenceStep['type']) => onChange({ ...step, type: v })}
        >
          <SelectTrigger className="h-6 text-xs font-bold border-none shadow-none p-0 w-auto gap-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="email" className="text-xs">📧 Email</SelectItem>
            <SelectItem value="call" className="text-xs">📞 Appel</SelectItem>
            <SelectItem value="sms" className="text-xs">💬 SMS</SelectItem>
            <SelectItem value="delay" className="text-xs">⏱ Délai</SelectItem>
            <SelectItem value="task" className="text-xs">✅ Tâche</SelectItem>
            <SelectItem value="condition" className="text-xs">🔀 Condition</SelectItem>
            <SelectItem value="ab_test" className="text-xs">🧪 Test A/B</SelectItem>
          </SelectContent>
        </Select>
        <button
          type="button"
          onClick={onDelete}
          className="ml-auto opacity-0 group-hover:opacity-100 text-[#7a7a76] hover:text-red-500 transition-all p-0.5"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-3 space-y-2">
        {step.type === 'email' && (
          <>
            <Input
              placeholder="Objet de l'email"
              value={step.subject || ''}
              onChange={e => onChange({ ...step, subject: e.target.value })}
              className="h-7 text-xs border-[#e5e5e0] focus:ring-[#059669]"
            />
            <div className="border border-[#e5e5e0] rounded-lg overflow-hidden">
              {emailEditor && <EditorToolbar editor={emailEditor} />}
              <div className="min-h-[100px] text-xs p-2 prose prose-xs max-w-none">
                <EditorContent editor={emailEditor} />
              </div>
            </div>
            <VarChips onInsert={(v) => emailEditor?.chain().focus().insertContent(v).run()} />
            {/* Pause on reply toggle */}
            <label className="flex items-center gap-2 cursor-pointer group select-none mt-1">
              <div
                className={`w-8 h-4 rounded-full transition-colors ${step.pauseOnReply ? 'bg-[#059669]' : 'bg-[#e5e5e0]'}`}
                onClick={() => onChange({ ...step, pauseOnReply: !step.pauseOnReply })}
              >
                <div className={`w-3 h-3 rounded-full bg-white shadow mt-0.5 transition-transform ${step.pauseOnReply ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-[10px] font-bold text-[#7a7a76] group-hover:text-[#26251e] flex items-center gap-1">
                <Pause className="w-3 h-3" />
                Pause auto si réponse détectée
              </span>
            </label>
          </>
        )}

        {step.type === 'call' && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Script d&apos;appel</p>
            <textarea
              placeholder="Bonjour {{prenom}}, je vous appelle de la part de…"
              value={step.callScript || ''}
              onChange={e => onChange({ ...step, callScript: e.target.value })}
              rows={4}
              className="w-full text-xs border border-[#e5e5e0] rounded-lg p-2 resize-none focus:outline-none focus:ring-1 focus:ring-[#059669] placeholder:text-[#b0afa9]"
            />
            <VarChips onInsert={v => onChange({ ...step, callScript: (step.callScript || '') + v })} />
          </div>
        )}

        {step.type === 'sms' && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Texte du SMS</p>
            <textarea
              placeholder="Bonjour {{prenom}}, je m'appelle… {{business}}"
              value={step.smsText || ''}
              onChange={e => onChange({ ...step, smsText: e.target.value })}
              rows={3}
              className="w-full text-xs border border-[#e5e5e0] rounded-lg p-2 resize-none focus:outline-none focus:ring-1 focus:ring-[#059669] placeholder:text-[#b0afa9]"
            />
            <div className="flex items-center justify-between">
              <VarChips onInsert={v => onChange({ ...step, smsText: (step.smsText || '') + v })} />
              <span className={`text-[9px] font-mono ${(step.smsText || '').length > 160 ? 'text-amber-600' : 'text-[#b0afa9]'}`}>
                {(step.smsText || '').length}/160
              </span>
            </div>
          </div>
        )}

        {step.type === 'ab_test' && (
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Variante A (50%)</p>
            <Input
              placeholder="Objet variante A"
              value={step.abVariants?.[0]?.subject || ''}
              onChange={e => {
                const variants = [...(step.abVariants || [{ id: 'a', subject: '', bodyHtml: '', weight: 50 }, { id: 'b', subject: '', bodyHtml: '', weight: 50 }])];
                variants[0] = { ...variants[0], subject: e.target.value };
                onChange({ ...step, abVariants: variants });
              }}
              className="h-7 text-xs border-[#e5e5e0]"
            />
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Variante B (50%)</p>
            <Input
              placeholder="Objet variante B"
              value={step.abVariants?.[1]?.subject || ''}
              onChange={e => {
                const variants = [...(step.abVariants || [{ id: 'a', subject: '', bodyHtml: '', weight: 50 }, { id: 'b', subject: '', bodyHtml: '', weight: 50 }])];
                variants[1] = { ...variants[1], subject: e.target.value };
                onChange({ ...step, abVariants: variants });
              }}
              className="h-7 text-xs border-[#e5e5e0]"
            />
            <p className="text-[9px] text-[#b0afa9]">Le corps de l&apos;email est partagé entre les deux variantes.</p>
          </div>
        )}

        {step.type === 'delay' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#7a7a76]">Attendre</span>
            <input
              type="number"
              min={1}
              value={step.delayDays ?? 1}
              onChange={e => onChange({ ...step, delayDays: parseInt(e.target.value) || 1 })}
              className="w-16 h-7 text-xs border border-[#e5e5e0] rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-[#059669]"
            />
            <span className="text-xs text-[#7a7a76]">jours</span>
          </div>
        )}

        {step.type === 'task' && (
          <div className="space-y-2">
            <Input
              placeholder="Titre de la tâche"
              value={step.taskTitle || ''}
              onChange={e => onChange({ ...step, taskTitle: e.target.value })}
              className="h-7 text-xs border-[#e5e5e0] focus:ring-[#059669]"
            />
            <Select
              value={step.taskCategory || 'call'}
              onValueChange={v => onChange({ ...step, taskCategory: v })}
            >
              <SelectTrigger className="h-7 text-xs border-[#e5e5e0]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="call" className="text-xs">Appel</SelectItem>
                <SelectItem value="email" className="text-xs">Email</SelectItem>
                <SelectItem value="visit" className="text-xs">Visite terrain</SelectItem>
                <SelectItem value="followup" className="text-xs">Relance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {step.type === 'condition' && (
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#26251e] w-16">Si</span>
              <Select
                value={step.condition?.on || 'reply'}
                onValueChange={v => onChange({ ...step, condition: { ...(step.condition || { on: 'reply', then: 'stop', else: 'next' }), on: v as 'reply' | 'open' | 'click' | 'booking' | 'positive_reply' | 'negative_reply' } })}
              >
                <SelectTrigger className="h-7 text-xs border-[#e5e5e0] flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reply" className="text-xs">Réponse reçue</SelectItem>
                  <SelectItem value="positive_reply" className="text-xs">Réponse positive</SelectItem>
                  <SelectItem value="negative_reply" className="text-xs">Réponse négative</SelectItem>
                  <SelectItem value="open" className="text-xs">Email ouvert</SelectItem>
                  <SelectItem value="click" className="text-xs">Lien cliqué</SelectItem>
                  <SelectItem value="booking" className="text-xs">RDV booké</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="pl-4 border-l-2 border-[#059669]/30 space-y-1 text-[#7a7a76]">
              <p className="text-[#059669] font-semibold text-[10px]">→ Arrêter la séquence</p>
            </div>
            <p className="font-semibold text-[#26251e]">Sinon → Continuer</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function ComposerQueueCadenceRoot() {
  const { t } = useLanguage();
  const { leads, activeWorkspace, user: contextUser, addTask } = useReach();

  // Templates
  const [templates, setTemplates] = useState<SequenceTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);

  // Queue
  const [queueItems, setQueueItems] = useState<Array<{
    id: string;
    to_email: string;
    to_name?: string;
    subject: string;
    status: string;
    scheduled_at?: string;
    sent_at?: string;
    leads?: { business_name?: string; contact_name?: string };
  }>>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueFilter, setQueueFilter] = useState<'all' | 'pending' | 'sent' | 'failed' | 'cancelled'>('all');
  const [showQueueSettings, setShowQueueSettings] = useState(false);
  const [dailyQuota, setDailyQuota] = useState(50);
  const [windowStart, setWindowStart] = useState('09:00');
  const [windowEnd, setWindowEnd] = useState('18:00');
  const [warmupDelay, setWarmupDelay] = useState(30);

  // Builder sheet
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SequenceTemplate | null>(null);
  const [builderName, setBuilderName] = useState('');
  const [builderDesc, setBuilderDesc] = useState('');
  const [builderSteps, setBuilderSteps] = useState<SequenceStep[]>([]);
  const [builderSaving, setBuilderSaving] = useState(false);

  // Enroll dialog
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrollTemplate, setEnrollTemplate] = useState<SequenceTemplate | null>(null);
  const [enrollSearch, setEnrollSearch] = useState('');
  const [enrollSelected, setEnrollSelected] = useState<string[]>([]);
  const [enrolling, setEnrolling] = useState(false);

  // Reply Classifier v2
  const [replyPanelItem, setReplyPanelItem] = useState<null | {
    id: string;
    to_email: string;
    to_name?: string;
    subject: string;
    status: string;
    body_html?: string;
    leads?: { business_name?: string };
  }>(null);
  const [classifying, setClassifying] = useState(false);
  const [classificationResult, setClassificationResult] = useState<null | {
    intent: string;
    confidence: number;
    nextAction: string;
    suggestedReply?: string;
  }>(null);

  const handleClassifyReply = async (body: string) => {
    if (!body) return;
    setClassifying(true);
    setClassificationResult(null);
    try {
      const res = await fetch(getApiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `Classifie cette réponse email en JSON strict (intent: positive|negative|info_request|scheduling|out_of_office|bounce|not_right_person|reschedule, confidence: 0-100, nextAction: string, suggestedReply: string):\n\n${body.slice(0, 1000)}` }],
          system: 'Tu es un assistant de classification d\'emails commerciaux. Réponds uniquement en JSON valide.',
        }),
      });
      if (res.ok) {
        const text = await res.text();
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          setClassificationResult(parsed);
        }
      }
    } catch { /* silent */ }
    finally { setClassifying(false); }
  };

  // Composer
  const [composerLead, setComposerLead] = useState<Lead | null>(null);
  const [composerLeadSearch, setComposerLeadSearch] = useState('');
  const [composerTo, setComposerTo] = useState('');
  const [composerSubject, setComposerSubject] = useState('');
  const [composerSending, setComposerSending] = useState(false);
  const [composerQueuing, setComposerQueuing] = useState(false);
  const [composerSchedule, setComposerSchedule] = useState('');
  const [composerMsg, setComposerMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const composerEditor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder: 'Corps de l\'email…' }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: '',
  });

  // Schedules (cadences)
  const [cadenceItems, setCadenceItems] = useState<Array<{
    id: string;
    to_email: string;
    to_name?: string;
    subject: string;
    status: string;
    scheduled_at?: string;
    leads?: { business_name?: string; contact_name?: string };
  }>>([]);

  // Stats
  const [stats, setStats] = useState({ sequences: 0, enrollments: 0, pending: 0, sentToday: 0 });

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/outreach/sequences'));
      if (res.ok) {
        const data = await res.json();
        const mapped: SequenceTemplate[] = (data || []).map((t: {
          id: string;
          workspace_id: string;
          name: string;
          description?: string;
          steps: unknown;
          status: string;
          tags: unknown;
          created_at: string;
          updated_at: string;
        }) => ({
          id: t.id,
          workspaceId: t.workspace_id,
          name: t.name,
          description: t.description,
          steps: Array.isArray(t.steps) ? t.steps : (typeof t.steps === 'string' ? JSON.parse(t.steps) : []),
          status: t.status as 'active' | 'archived',
          tags: Array.isArray(t.tags) ? t.tags : [],
          createdAt: t.created_at,
          updatedAt: t.updated_at,
        }));
        setTemplates(mapped);
        setStats(prev => ({ ...prev, sequences: mapped.length }));
      }
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  const fetchQueue = useCallback(async () => {
    setQueueLoading(true);
    try {
      const status = queueFilter === 'all' ? '' : `?status=${queueFilter}`;
      const res = await fetch(getApiUrl(`/api/outreach/queue${status}`));
      if (res.ok) {
        const data = await res.json();
        setQueueItems(data || []);

        const pending = (data || []).filter((i: { status: string }) => i.status === 'pending').length;
        const today = new Date().toDateString();
        const sentToday = (data || []).filter((i: { status: string; sent_at?: string }) =>
          i.status === 'sent' && i.sent_at && new Date(i.sent_at).toDateString() === today
        ).length;
        setStats(prev => ({ ...prev, pending, sentToday }));

        // For cadences: future pending
        const now = new Date();
        const futurePending = (data || []).filter((i: { status: string; scheduled_at?: string }) =>
          i.status === 'pending' && i.scheduled_at && new Date(i.scheduled_at) > now
        );
        setCadenceItems(futurePending);
      }
    } finally {
      setQueueLoading(false);
    }
  }, [queueFilter]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);
  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  // Poll queue every 30s
  useEffect(() => {
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  // ── Builder handlers ────────────────────────────────────────────────────────
  const openBuilder = (template?: SequenceTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setBuilderName(template.name);
      setBuilderDesc(template.description || '');
      setBuilderSteps([...template.steps]);
    } else {
      setEditingTemplate(null);
      setBuilderName('');
      setBuilderDesc('');
      setBuilderSteps([]);
    }
    setBuilderOpen(true);
  };

  const addStep = (type: SequenceStep['type']) => {
    const id = crypto.randomUUID();
    const step: SequenceStep = { id, type };
    if (type === 'delay') step.delayDays = 1;
    if (type === 'email') { step.subject = ''; step.bodyHtml = ''; }
    if (type === 'task') { step.taskTitle = ''; step.taskCategory = 'call'; }
    setBuilderSteps(prev => [...prev, step]);
  };

  const saveTemplate = async () => {
    if (!builderName.trim()) return;
    setBuilderSaving(true);
    try {
      const payload = { name: builderName, description: builderDesc, steps: builderSteps };
      const method = editingTemplate ? 'PATCH' : 'POST';
      const body = editingTemplate ? { ...payload, id: editingTemplate.id } : payload;
      const res = await fetch(getApiUrl('/api/outreach/sequences'), {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        await fetchTemplates();
        setBuilderOpen(false);
      }
    } finally {
      setBuilderSaving(false);
    }
  };

  const archiveTemplate = async (id: string) => {
    await fetch(getApiUrl('/api/outreach/sequences'), {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    await fetchTemplates();
  };

  // ── Enroll handlers ─────────────────────────────────────────────────────────
  const openEnroll = (template: SequenceTemplate) => {
    setEnrollTemplate(template);
    setEnrollSelected([]);
    setEnrollSearch('');
    setEnrollOpen(true);
  };

  const handleEnroll = async () => {
    if (!enrollTemplate || enrollSelected.length === 0 || !activeWorkspace) return;
    setEnrolling(true);
    try {
      const supabase = createClient();
      const rows = enrollSelected.map(leadId => ({
        template_id: enrollTemplate.id,
        lead_id: leadId,
        workspace_id: activeWorkspace.id,
        status: 'active',
        current_step: 0,
        enrolled_at: new Date().toISOString(),
        enrolled_by: contextUser?.id,
      }));
      await supabase.from('sequence_enrollments').insert(rows);
      setEnrollOpen(false);
      setStats(prev => ({ ...prev, enrollments: prev.enrollments + rows.length }));
    } finally {
      setEnrolling(false);
    }
  };

  // ── Composer handlers ───────────────────────────────────────────────────────
  const selectComposerLead = (lead: Lead) => {
    setComposerLead(lead);
    setComposerTo(lead.contactEmail || '');
    setComposerLeadSearch('');
  };

  const insertVarSubject = (v: string) => {
    setComposerSubject(prev => prev + v);
  };

  const handleSendNow = async () => {
    if (!composerTo || !composerSubject || !composerEditor) return;
    setComposerSending(true);
    setComposerMsg(null);
    try {
      const bodyHtml = composerLead
        ? substituteVars(composerEditor.getHTML(), composerLead)
        : composerEditor.getHTML();
      const subject = composerLead ? substituteVars(composerSubject, composerLead) : composerSubject;

      const res = await fetch(getApiUrl('/api/send-email'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: composerTo,
          subject,
          body: bodyHtml,
          leadId: composerLead?.id,
          workspaceId: activeWorkspace?.id,
        }),
      });
      if (res.ok) {
        // Also log to queue as sent
        await fetch(getApiUrl('/api/outreach/queue'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId: composerLead?.id,
            toEmail: composerTo,
            toName: composerLead?.contactName || composerLead?.businessName,
            subject,
            bodyHtml,
            bodyText: composerEditor.getText(),
            scheduledAt: new Date().toISOString(),
          }),
        });
        setComposerMsg({ type: 'success', text: 'Email envoyé avec succès !' });
        composerEditor.commands.clearContent();
        setComposerSubject('');
      } else {
        const d = await res.json();
        setComposerMsg({ type: 'error', text: d.error || 'Erreur d\'envoi' });
      }
    } catch {
      setComposerMsg({ type: 'error', text: 'Erreur réseau' });
    } finally {
      setComposerSending(false);
    }
  };

  const handleAddToQueue = async (scheduledAt?: string) => {
    if (!composerTo || !composerSubject || !composerEditor) return;
    setComposerQueuing(true);
    setComposerMsg(null);
    try {
      const bodyHtml = composerLead
        ? substituteVars(composerEditor.getHTML(), composerLead)
        : composerEditor.getHTML();
      const subject = composerLead ? substituteVars(composerSubject, composerLead) : composerSubject;
      const res = await fetch(getApiUrl('/api/outreach/queue'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: composerLead?.id,
          toEmail: composerTo,
          toName: composerLead?.contactName || composerLead?.businessName,
          subject,
          bodyHtml,
          bodyText: composerEditor.getText(),
          scheduledAt: scheduledAt || new Date().toISOString(),
        }),
      });
      if (res.ok) {
        setComposerMsg({ type: 'success', text: scheduledAt ? 'Email planifié !' : 'Ajouté à la queue !' });
        composerEditor.commands.clearContent();
        setComposerSubject('');
        await fetchQueue();
      } else {
        setComposerMsg({ type: 'error', text: 'Erreur lors de l\'ajout' });
      }
    } finally {
      setComposerQueuing(false);
    }
  };

  // ── Queue actions ───────────────────────────────────────────────────────────
  const updateQueueStatus = async (id: string, status: string) => {
    await fetch(getApiUrl('/api/outreach/queue'), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    await fetchQueue();
  };

  // ── Cadence grouping ────────────────────────────────────────────────────────
  const cadenceByDay = () => {
    const now = new Date();
    const days: Record<string, typeof cadenceItems> = {};
    for (let i = 0; i < 14; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      days[key] = [];
    }
    cadenceItems.forEach(item => {
      if (!item.scheduled_at) return;
      const key = item.scheduled_at.split('T')[0];
      if (days[key]) days[key].push(item);
    });
    return Object.fromEntries(Object.entries(days).filter(([, items]) => items.length > 0));
  };

  const filteredLeads = leads.filter(l =>
    (l.businessName + ' ' + (l.contactName || '') + ' ' + (l.city || '')).toLowerCase()
      .includes(composerLeadSearch.toLowerCase())
  ).slice(0, 8);

  const enrollFilteredLeads = leads.filter(l =>
    (l.businessName + ' ' + (l.contactName || '') + ' ' + (l.city || '')).toLowerCase()
      .includes(enrollSearch.toLowerCase())
  ).slice(0, 20);

  const filteredQueue = queueFilter === 'all'
    ? queueItems
    : queueItems.filter(i => i.status === queueFilter);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#fafaf8]">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* ── Header with dot pattern ── */}
        <div className="relative overflow-hidden rounded-xl border border-[#e5e5e0] bg-[#f4f4f3] p-6">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 opacity-40"
            style={{ backgroundImage: 'radial-gradient(circle, #a1a1aa 1px, transparent 1px)', backgroundSize: '20px 20px' }}
          />
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-[#26251e]">{t('outreach.title')}</h1>
                <p className="text-xs text-[#7a7a76] mt-1">{t('outreach.subtitle')}</p>
              </div>
              <Button
                onClick={() => openBuilder()}
                className="h-8 bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                {t('outreach.new_sequence')}
              </Button>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
              {[
                { label: t('outreach.stats_active_sequences'), value: stats.sequences, icon: Mail },
                { label: t('outreach.stats_enrollments'), value: stats.enrollments, icon: Users },
                { label: t('outreach.stats_pending'), value: stats.pending, icon: Clock },
                { label: t('outreach.stats_sent_today'), value: stats.sentToday, icon: CheckCircle2 },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="bg-white/80 border border-[#e5e5e0] rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className="w-3.5 h-3.5 text-[#059669]" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">{label}</span>
                  </div>
                  <span className="text-xl font-bold text-[#26251e]">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <Tabs defaultValue="sequences" className="w-full">
          <TabsList className="h-9 bg-[#f4f4f3] border border-[#e5e5e0] p-1 rounded-lg">
            {[
              { value: 'sequences', label: t('outreach.tab_sequences') },
              { value: 'compose', label: t('outreach.tab_compose') },
              { value: 'queue', label: t('outreach.tab_queue') },
              { value: 'cadences', label: t('outreach.tab_cadences') },
            ].map(tab => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#26251e] data-[state=active]:shadow-sm text-[#7a7a76]"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── Tab 1: Séquences ── */}
          <TabsContent value="sequences" className="mt-4 space-y-3">
            {templatesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-[#7a7a76]" />
              </div>
            ) : templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <Mail className="w-10 h-10 text-[#e5e5e0]" />
                <p className="text-sm font-semibold text-[#26251e]">{t('outreach.empty_sequences')}</p>
                <p className="text-xs text-[#7a7a76]">Créez votre première séquence pour automatiser votre outreach.</p>
                <Button onClick={() => openBuilder()} className="h-8 bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs mt-2 gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  {t('outreach.new_sequence')}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map(tpl => (
                  <div key={tpl.id} className="border border-[#e5e5e0] rounded-xl bg-white p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[#26251e] truncate">{tpl.name}</p>
                        {tpl.description && (
                          <p className="text-xs text-[#7a7a76] mt-0.5 line-clamp-2">{tpl.description}</p>
                        )}
                      </div>
                      <StatusBadge status={tpl.status} />
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-[#7a7a76]">
                      <span className="font-bold text-[#26251e]">{tpl.steps.length}</span> étape{tpl.steps.length !== 1 ? 's' : ''}
                      <span>·</span>
                      <span className="flex gap-1">
                        {tpl.steps.map(s => ({
                          email: <Mail key={s.id} className="w-3 h-3 text-[#059669]" />,
                          delay: <Clock key={s.id} className="w-3 h-3 text-amber-500" />,
                          task: <CheckSquare key={s.id} className="w-3 h-3 text-blue-500" />,
                          condition: <GitBranch key={s.id} className="w-3 h-3 text-purple-500" />,
                          call: <CheckSquare key={s.id} className="w-3 h-3 text-emerald-500" />,
                          sms: <Mail key={s.id} className="w-3 h-3 text-indigo-500" />,
                          ab_test: <GitBranch key={s.id} className="w-3 h-3 text-[#7a7a76]" />,
                        }[s.type] ?? <Mail key={s.id} className="w-3 h-3 text-slate-400" />))}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1 border-t border-[#e5e5e0]">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px] px-2 border-[#e5e5e0]"
                        onClick={() => openBuilder(tpl)}
                      >
                        Modifier
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px] px-2 border-[#059669]/30 text-[#059669] hover:bg-[#059669]/5"
                        onClick={() => openEnroll(tpl)}
                      >
                        <Users className="w-3 h-3 mr-1" />
                        {t('outreach.enroll_leads')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] px-2 text-[#7a7a76] ml-auto"
                        onClick={() => archiveTemplate(tpl.id)}
                      >
                        <Archive className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Tab 2: Composer ── */}
          <TabsContent value="compose" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Left: lead selector */}
              <div className="border border-[#e5e5e0] rounded-xl bg-white p-4 space-y-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Sélectionner un lead</div>
                <Input
                  placeholder="Rechercher un lead…"
                  value={composerLeadSearch}
                  onChange={e => setComposerLeadSearch(e.target.value)}
                  className="h-7 text-xs border-[#e5e5e0]"
                />
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {filteredLeads.map(lead => (
                    <button
                      key={lead.id}
                      onClick={() => selectComposerLead(lead)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                        composerLead?.id === lead.id
                          ? 'bg-[#059669]/10 text-[#059669] font-semibold'
                          : 'text-[#26251e] hover:bg-[#f4f4f3]'
                      }`}
                    >
                      <p className="font-semibold truncate">{lead.businessName}</p>
                      <p className="text-[10px] text-[#7a7a76] truncate">{lead.contactEmail || 'Pas d\'email'}</p>
                    </button>
                  ))}
                  {leads.length === 0 && (
                    <p className="text-xs text-[#7a7a76] text-center py-4">Aucun lead disponible</p>
                  )}
                </div>
                {composerLead && (
                  <div className="border border-[#059669]/20 bg-[#059669]/5 rounded-lg p-2.5 space-y-1">
                    <p className="text-xs font-bold text-[#059669]">{composerLead.businessName}</p>
                    <p className="text-[10px] text-[#7a7a76]">{composerLead.contactName}</p>
                    <p className="text-[10px] text-[#7a7a76]">{composerLead.contactEmail}</p>
                  </div>
                )}
              </div>

              {/* Right: compose area */}
              <div className="md:col-span-2 border border-[#e5e5e0] rounded-xl bg-white p-4 space-y-3">
                {/* To field */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#7a7a76] w-8 shrink-0">{t('outreach.compose_to')}</span>
                  <Input
                    value={composerTo}
                    onChange={e => setComposerTo(e.target.value)}
                    placeholder="email@exemple.com"
                    className="h-7 text-xs border-[#e5e5e0] flex-1"
                  />
                </div>

                {/* Subject field */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#7a7a76] w-8 shrink-0">{t('outreach.compose_subject')}</span>
                  <Input
                    value={composerSubject}
                    onChange={e => setComposerSubject(e.target.value)}
                    placeholder="Objet de l'email"
                    className="h-7 text-xs border-[#e5e5e0] flex-1"
                  />
                </div>

                {/* Variable chips for subject */}
                <VarChips onInsert={insertVarSubject} customFields={composerLead?.customFields} />

                <Separator className="bg-[#e5e5e0]" />

                {/* TipTap editor */}
                <div className="border border-[#e5e5e0] rounded-lg overflow-hidden">
                  {composerEditor && <EditorToolbar editor={composerEditor} />}
                  <div className="min-h-[160px] text-xs p-3 prose prose-xs max-w-none">
                    <EditorContent editor={composerEditor} />
                  </div>
                </div>

                {/* Variable chips for body */}
                <VarChips onInsert={(v) => composerEditor?.chain().focus().insertContent(v).run()} customFields={composerLead?.customFields} />

                {/* Feedback */}
                {composerMsg && (
                  <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg border ${
                    composerMsg.type === 'success'
                      ? 'bg-[#059669]/10 text-[#059669] border-[#059669]/20'
                      : 'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    {composerMsg.type === 'success'
                      ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                    {composerMsg.text}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-[#e5e5e0]">
                  <Button
                    onClick={handleSendNow}
                    disabled={composerSending || !composerTo || !composerSubject}
                    className="h-8 bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs gap-1.5"
                  >
                    {composerSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    {t('outreach.send_now')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleAddToQueue()}
                    disabled={composerQueuing || !composerTo || !composerSubject}
                    className="h-8 text-xs font-bold border-[#e5e5e0] gap-1.5"
                  >
                    {composerQueuing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    {t('outreach.add_to_queue')}
                  </Button>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <Input
                      type="datetime-local"
                      value={composerSchedule}
                      onChange={e => setComposerSchedule(e.target.value)}
                      className="h-8 text-xs border-[#e5e5e0] w-44"
                    />
                    <Button
                      variant="outline"
                      onClick={() => composerSchedule && handleAddToQueue(new Date(composerSchedule).toISOString())}
                      disabled={!composerSchedule || !composerTo || !composerSubject}
                      className="h-8 text-xs font-bold border-[#e5e5e0] gap-1.5"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      {t('outreach.schedule')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── Tab 3: Queue ── */}
          <TabsContent value="queue" className="mt-4 space-y-4">
            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: t('outreach.stats_pending'), value: queueItems.filter(i => i.status === 'pending').length, color: 'text-amber-600' },
                { label: t('outreach.stats_sent_today'), value: stats.sentToday, color: 'text-[#059669]' },
                { label: t('outreach.queue_failed'), value: queueItems.filter(i => i.status === 'failed').length, color: 'text-red-600' },
                { label: t('outreach.queue_cancelled'), value: queueItems.filter(i => i.status === 'cancelled').length, color: 'text-slate-500' },
              ].map(({ label, value, color }) => (
                <div key={label} className="border border-[#e5e5e0] rounded-xl bg-white p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">{label}</p>
                  <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Queue settings (collapsible) */}
            <div className="border border-[#e5e5e0] rounded-xl bg-white overflow-hidden">
              <button
                onClick={() => setShowQueueSettings(!showQueueSettings)}
                className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold text-[#26251e] hover:bg-[#f4f4f3] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-3.5 h-3.5 text-[#7a7a76]" />
                  Paramètres de la queue
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-[#7a7a76] transition-transform ${showQueueSettings ? 'rotate-180' : ''}`} />
              </button>
              {showQueueSettings && (
                <div className="px-4 pb-4 border-t border-[#e5e5e0] pt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">{t('outreach.queue_daily_quota')}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={dailyQuota}
                        onChange={e => setDailyQuota(parseInt(e.target.value) || 50)}
                        className="w-20 h-7 text-xs border border-[#e5e5e0] rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-[#059669]"
                      />
                      <span className="text-xs text-[#7a7a76]">emails/jour</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">{t('outreach.queue_window')}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={windowStart}
                        onChange={e => setWindowStart(e.target.value)}
                        className="h-7 text-xs border border-[#e5e5e0] rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-[#059669]"
                      />
                      <span className="text-xs text-[#7a7a76]">–</span>
                      <input
                        type="time"
                        value={windowEnd}
                        onChange={e => setWindowEnd(e.target.value)}
                        className="h-7 text-xs border border-[#e5e5e0] rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-[#059669]"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">{t('outreach.queue_warmup')}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={warmupDelay}
                        onChange={e => setWarmupDelay(parseInt(e.target.value) || 30)}
                        className="w-20 h-7 text-xs border border-[#e5e5e0] rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-[#059669]"
                      />
                      <span className="text-xs text-[#7a7a76]">secondes entre envois</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-1">
              {(['all', 'pending', 'sent', 'failed', 'cancelled'] as const).map(f => {
                const count = f === 'all' ? queueItems.length : queueItems.filter(i => i.status === f).length;
                return (
                  <button
                    key={f}
                    onClick={() => setQueueFilter(f)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                      queueFilter === f
                        ? 'bg-[#26251e] text-white'
                        : 'bg-white border border-[#e5e5e0] text-[#555552] hover:bg-[#f4f4f3]'
                    }`}
                  >
                    <span>{f === 'all' ? 'Tous' : t(`outreach.queue_${f}` as keyof typeof t extends (...args: never[]) => string ? never : never) || f}</span>
                    <span className={`text-[9px] px-1 rounded-full ${queueFilter === f ? 'bg-white/20' : 'bg-[#f4f4f3]'}`}>{count}</span>
                  </button>
                );
              })}
              <button
                onClick={fetchQueue}
                className="ml-auto p-1.5 rounded-md border border-[#e5e5e0] bg-white text-[#7a7a76] hover:bg-[#f4f4f3] transition-colors"
                title="Actualiser"
              >
                {queueLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Queue list + Reply Classifier panel */}
            <div className="flex gap-4">
              <div className="flex-1 border border-[#e5e5e0] rounded-xl bg-white overflow-hidden">
                {filteredQueue.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
                    <Mail className="w-8 h-8 text-[#e5e5e0]" />
                    <p className="text-sm font-semibold text-[#26251e]">{t('outreach.empty_queue')}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#e5e5e0]">
                    {filteredQueue.map(item => (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 px-4 py-3 hover:bg-[#fafaf8] transition-colors cursor-pointer ${replyPanelItem?.id === item.id ? 'bg-[#059669]/5 border-l-2 border-[#059669]' : ''}`}
                        onClick={() => {
                          if (replyPanelItem?.id === item.id) {
                            setReplyPanelItem(null);
                            setClassificationResult(null);
                          } else {
                            setReplyPanelItem(item as typeof replyPanelItem);
                            setClassificationResult(null);
                          }
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#26251e] truncate">
                            {item.leads?.business_name || item.to_name || item.to_email}
                          </p>
                          <p className="text-[10px] text-[#7a7a76] truncate mt-0.5">{item.subject}</p>
                        </div>
                        <StatusBadge status={item.status} />
                        <span className="text-[10px] text-[#7a7a76] shrink-0 hidden md:block">
                          {item.scheduled_at
                            ? new Date(item.scheduled_at).toLocaleString('fr-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                            : item.sent_at
                              ? new Date(item.sent_at).toLocaleString('fr-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                              : '—'}
                        </span>
                        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                          {item.status === 'pending' && (
                            <button
                              onClick={() => updateQueueStatus(item.id, 'cancelled')}
                              className="text-[10px] font-bold text-[#7a7a76] hover:text-red-600 px-2 py-0.5 rounded border border-[#e5e5e0] hover:border-red-200 transition-colors flex items-center gap-1"
                            >
                              <Ban className="w-3 h-3" />
                              {t('outreach.cancel_email')}
                            </button>
                          )}
                          {item.status === 'failed' && (
                            <button
                              onClick={() => updateQueueStatus(item.id, 'pending')}
                              className="text-[10px] font-bold text-[#059669] hover:text-[#047857] px-2 py-0.5 rounded border border-[#059669]/30 hover:border-[#059669] transition-colors flex items-center gap-1"
                            >
                              <RefreshCw className="w-3 h-3" />
                              {t('outreach.retry_email')}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reply Classifier v2 Panel */}
              {replyPanelItem && (
                <div className="w-80 shrink-0 border border-[#e5e5e0] rounded-xl bg-white overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#e5e5e0]">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#059669]" />
                      <span className="text-xs font-bold text-[#26251e]">{t('outreach.reply_v2_title')}</span>
                    </div>
                    <button onClick={() => { setReplyPanelItem(null); setClassificationResult(null); }} className="text-[#7a7a76] hover:text-[#26251e] p-0.5">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {/* Email info */}
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-[#26251e] truncate">
                        {replyPanelItem.leads?.business_name || replyPanelItem.to_name || replyPanelItem.to_email}
                      </p>
                      <p className="text-[10px] text-[#7a7a76] truncate">{replyPanelItem.subject}</p>
                    </div>

                    {/* Body preview */}
                    {replyPanelItem.body_html && (
                      <div
                        className="text-[10px] text-[#555552] p-2 bg-[#fafaf8] rounded-lg border border-[#e5e5e0] max-h-24 overflow-y-auto"
                        dangerouslySetInnerHTML={{ __html: replyPanelItem.body_html.slice(0, 500) }}
                      />
                    )}

                    {/* Classify button */}
                    {!classificationResult && (
                      <button
                        type="button"
                        onClick={() => handleClassifyReply(replyPanelItem.body_html || replyPanelItem.subject)}
                        disabled={classifying}
                        className="w-full flex items-center justify-center gap-2 h-8 rounded-lg bg-[#059669] text-white text-xs font-bold hover:bg-[#047857] transition-colors border-0 cursor-pointer disabled:opacity-60"
                      >
                        {classifying
                          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />{t('outreach.reply_v2_classifying')}</>
                          : <><Sparkles className="w-3.5 h-3.5" />Classifier avec IA</>}
                      </button>
                    )}

                    {/* Classification result */}
                    {classificationResult && (() => {
                      const intentConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
                        positive: { label: t('outreach.reply_v2_positive'), icon: <ThumbsUp className="w-3.5 h-3.5" />, color: 'bg-[#059669]/10 text-[#059669] border-[#059669]/20' },
                        negative: { label: t('outreach.reply_v2_negative'), icon: <ThumbsDown className="w-3.5 h-3.5" />, color: 'bg-red-50 text-red-700 border-red-200' },
                        info_request: { label: t('outreach.reply_v2_info'), icon: <Info className="w-3.5 h-3.5" />, color: 'bg-blue-50 text-blue-700 border-blue-200' },
                        scheduling: { label: t('outreach.reply_v2_scheduling'), icon: <CalendarCheck className="w-3.5 h-3.5" />, color: 'bg-purple-50 text-purple-700 border-purple-200' },
                        out_of_office: { label: t('outreach.reply_v2_oof'), icon: <Clock3 className="w-3.5 h-3.5" />, color: 'bg-amber-50 text-amber-700 border-amber-200' },
                        bounce: { label: t('outreach.reply_v2_bounce'), icon: <OctagonX className="w-3.5 h-3.5" />, color: 'bg-slate-50 text-slate-600 border-slate-200' },
                        not_right_person: { label: t('outreach.reply_v2_wrong'), icon: <UserX className="w-3.5 h-3.5" />, color: 'bg-slate-50 text-slate-600 border-slate-200' },
                        reschedule: { label: t('outreach.reply_v2_reschedule'), icon: <Clock3 className="w-3.5 h-3.5" />, color: 'bg-amber-50 text-amber-700 border-amber-200' },
                      };
                      const cfg = intentConfig[classificationResult.intent] || intentConfig.info_request;
                      return (
                        <div className="space-y-2">
                          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold ${cfg.color}`}>
                            {cfg.icon}
                            {cfg.label}
                            <span className="ml-auto font-mono text-[9px]">{classificationResult.confidence}%</span>
                          </div>
                          <div className="px-3 py-2 rounded-lg border border-[#e5e5e0] bg-[#fafaf8]">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-[#7a7a76] mb-1">{t('outreach.reply_v2_next_action')}</p>
                            <p className="text-[10px] text-[#26251e]">{classificationResult.nextAction}</p>
                          </div>
                          {classificationResult.suggestedReply && (
                            <div className="px-3 py-2 rounded-lg border border-[#e5e5e0] bg-[#fafaf8]">
                              <p className="text-[9px] font-bold uppercase tracking-wider text-[#7a7a76] mb-1">Réponse suggérée</p>
                              <p className="text-[10px] text-[#26251e] italic">{classificationResult.suggestedReply.slice(0, 150)}…</p>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => { setClassificationResult(null); }}
                            className="w-full text-[10px] font-bold text-[#7a7a76] hover:text-[#26251e] py-1 border border-[#e5e5e0] rounded-lg hover:bg-[#f4f4f3] transition-colors"
                          >
                            Reclassifier
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Tab 4: Cadences ── */}
          <TabsContent value="cadences" className="mt-4 space-y-4">
            {(() => {
              const byDay = cadenceByDay();
              const dayEntries = Object.entries(byDay);
              if (dayEntries.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                    <Calendar className="w-10 h-10 text-[#e5e5e0]" />
                    <p className="text-sm font-semibold text-[#26251e]">{t('outreach.empty_cadences')}</p>
                    <p className="text-xs text-[#7a7a76] max-w-xs">
                      {t('outreach.empty_cadences_hint')}
                    </p>
                  </div>
                );
              }
              const totalUpcoming = dayEntries.reduce((acc, [, items]) => acc + items.length, 0);
              return (
                <>
                  <div className="flex items-center gap-2 text-[10px] text-[#7a7a76]">
                    <span className="font-bold text-[#059669]">{totalUpcoming}</span>
                    <span>{totalUpcoming > 1 ? 'envois planifiés' : 'envoi planifié'} sur les 14 prochains jours</span>
                  </div>
                  {dayEntries.map(([date, items]) => (
                    <div key={date} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#26251e]">
                          {new Date(date + 'T12:00:00').toLocaleDateString('fr-CA', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#059669]/10 text-[#059669]">
                          {items.length}
                        </span>
                      </div>
                      <div className="border border-[#e5e5e0] rounded-xl bg-white overflow-hidden">
                        {items.map(item => (
                          <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-[#e5e5e0] last:border-0 hover:bg-[#fafaf8] transition-colors">
                            <span className="text-[10px] font-mono font-bold text-[#059669] shrink-0 w-12 bg-[#059669]/8 rounded px-1 py-0.5 text-center">
                              {item.scheduled_at
                                ? new Date(item.scheduled_at).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })
                                : '—'}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-[#26251e] truncate">
                                {item.leads?.business_name || item.to_name || item.to_email}
                              </p>
                              <p className="text-[10px] text-[#7a7a76] truncate">{item.subject}</p>
                            </div>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#e5e5e0] text-[#7a7a76] shrink-0">
                              {item.status === 'pending' ? 'planifié' : item.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              );
            })()}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Sequence Builder Sheet ── */}
      <Sheet open={builderOpen} onOpenChange={setBuilderOpen}>
        <SheetContent className="w-[520px] sm:max-w-[520px] p-0 flex flex-col bg-white overflow-hidden" side="right">
          <SheetHeader className="px-5 py-4 border-b border-[#e5e5e0] shrink-0">
            <SheetTitle className="text-sm font-bold text-[#26251e]">
              {t('outreach.sequence_builder_title')}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="Nom de la séquence"
                value={builderName}
                onChange={e => setBuilderName(e.target.value)}
                className="h-8 text-xs border-[#e5e5e0] font-semibold"
              />
              <Input
                placeholder="Description (optionnel)"
                value={builderDesc}
                onChange={e => setBuilderDesc(e.target.value)}
                className="h-8 text-xs border-[#e5e5e0]"
              />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Étapes</span>
              {builderSteps.map((step, idx) => (
                <div key={step.id} className="flex items-start gap-2">
                  <div className="flex flex-col items-center pt-3 gap-1 shrink-0">
                    <span className="text-[9px] font-bold text-[#7a7a76] w-5 h-5 rounded-full bg-[#f4f4f3] flex items-center justify-center">
                      {idx + 1}
                    </span>
                    {idx < builderSteps.length - 1 && (
                      <div className="w-px h-4 bg-[#e5e5e0]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <StepEditor
                      step={step}
                      onChange={updated => setBuilderSteps(prev => prev.map(s => s.id === step.id ? updated : s))}
                      onDelete={() => setBuilderSteps(prev => prev.filter(s => s.id !== step.id))}
                    />
                  </div>
                </div>
              ))}

              {/* Add step buttons */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {([
                  { type: 'email', label: t('outreach.step_email'), icon: '📧' },
                  { type: 'call', label: t('outreach.step_call'), icon: '📞' },
                  { type: 'sms', label: t('outreach.step_sms'), icon: '💬' },
                  { type: 'delay', label: t('outreach.step_delay'), icon: '⏱' },
                  { type: 'task', label: t('outreach.step_task'), icon: '✅' },
                  { type: 'condition', label: t('outreach.step_condition'), icon: '🔀' },
                  { type: 'ab_test', label: t('outreach.step_ab'), icon: '🧪' },
                ] as const).map(({ type, label, icon }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => addStep(type)}
                    className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-md border border-dashed border-[#e5e5e0] text-[#7a7a76] hover:border-[#059669]/40 hover:text-[#059669] hover:bg-[#059669]/5 transition-colors"
                  >
                    <span>{icon}</span>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="shrink-0 px-5 py-4 border-t border-[#e5e5e0] flex items-center justify-between gap-2">
            <Button variant="ghost" onClick={() => setBuilderOpen(false)} className="h-8 text-xs text-[#7a7a76]">
              Annuler
            </Button>
            <Button
              onClick={saveTemplate}
              disabled={builderSaving || !builderName.trim()}
              className="h-8 bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs gap-1.5"
            >
              {builderSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Sauvegarder
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Enroll Leads Dialog ── */}
      <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
        <DialogContent className="w-[480px] max-w-[95vw] bg-white border border-[#e5e5e0] rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-[#26251e]">
              {t('outreach.enroll_leads')} — {enrollTemplate?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Rechercher un lead…"
              value={enrollSearch}
              onChange={e => setEnrollSearch(e.target.value)}
              className="h-7 text-xs border-[#e5e5e0]"
            />
            <div className="max-h-64 overflow-y-auto space-y-0.5 border border-[#e5e5e0] rounded-lg overflow-hidden">
              {enrollFilteredLeads.map(lead => (
                <label
                  key={lead.id}
                  className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-[#f4f4f3] transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={enrollSelected.includes(lead.id)}
                    onChange={e => {
                      if (e.target.checked) setEnrollSelected(prev => [...prev, lead.id]);
                      else setEnrollSelected(prev => prev.filter(id => id !== lead.id));
                    }}
                    className="accent-[#059669]"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#26251e] truncate">{lead.businessName}</p>
                    <p className="text-[10px] text-[#7a7a76] truncate">{lead.contactName} · {lead.city}</p>
                  </div>
                </label>
              ))}
              {enrollFilteredLeads.length === 0 && (
                <p className="text-xs text-[#7a7a76] text-center py-6">Aucun lead trouvé</p>
              )}
            </div>
            {enrollSelected.length > 0 && enrollTemplate && (
              <div className="text-xs text-[#7a7a76] bg-[#f4f4f3] rounded-lg px-3 py-2">
                <span className="font-bold text-[#059669]">{enrollSelected.length}</span> lead(s) sélectionné(s) ·{' '}
                <span className="font-bold">{enrollTemplate.steps.length}</span> étape(s) dans la séquence
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEnrollOpen(false)} className="h-8 text-xs">
                Annuler
              </Button>
              <Button
                onClick={handleEnroll}
                disabled={enrolling || enrollSelected.length === 0}
                className="h-8 bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs gap-1.5"
              >
                {enrolling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5" />}
                Inscrire {enrollSelected.length > 0 ? `${enrollSelected.length} lead${enrollSelected.length > 1 ? 's' : ''}` : ''}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
