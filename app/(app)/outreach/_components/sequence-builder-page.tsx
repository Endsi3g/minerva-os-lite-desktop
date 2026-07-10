'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useLanguage } from '@/lib/language-context';
import type { TranslationKey } from '@/lib/translations';
import { getApiUrl } from '@/lib/api-helper';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Mail,
  Clock,
  CheckSquare,
  GitBranch,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type StepType = 'email' | 'delay' | 'task' | 'condition';

interface Step {
  id: string;
  type: StepType;
  // email
  subject?: string;
  bodyHtml?: string;
  // delay
  delayDays?: number;
  // task
  taskTitle?: string;
  taskCategory?: string;
  // condition
  conditionOn?: 'reply' | 'open';
  conditionThen?: 'stop' | 'next';
}

// ── Variable chips ─────────────────────────────────────────────────────────────

const VARIABLES = ['{{prenom}}', '{{business}}', '{{ville}}', '{{niche}}'];

// ── Email Step Editor (manages its own TipTap instance) ──────────────────────

interface EmailStepEditorProps {
  step: Step;
  onUpdate: (id: string, updates: Partial<Step>) => void;
  stepNumber: number;
  t: (key: TranslationKey, fallback?: string) => string;
}

function EmailStepEditor({ step, onUpdate, stepNumber, t }: EmailStepEditorProps) {
  const [generating, setGenerating] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Corps de l'email..." }),
    ],
    content: step.bodyHtml || '',
    onUpdate: ({ editor }) => {
      onUpdate(step.id, { bodyHtml: editor.getHTML() });
    },
    immediatelyRender: false,
  });

  const insertVariable = (variable: string) => {
    if (editor) {
      editor.chain().focus().insertContent(variable).run();
    }
  };

  const handleAiGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(getApiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Génère un email de prospection B2B pour l'étape ${stepNumber} d'une séquence outreach. Objet de l'email : "${step.subject || 'Prise de contact'}". L'email doit être court (3-5 phrases), professionnel, personnalisé. Utilise les variables {{prenom}}, {{business}}, {{ville}} si pertinent. Renvoie seulement le corps de l'email en texte brut, sans titre ni introduction.`,
            },
          ],
          provider: 'openrouter',
        }),
      });

      if (res.ok) {
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter((l) => l.startsWith('data: '));
            for (const line of lines) {
              const json = line.replace('data: ', '').trim();
              if (json === '[DONE]') break;
              try {
                const parsed = JSON.parse(json);
                const delta = parsed.choices?.[0]?.delta?.content || '';
                fullText += delta;
              } catch {}
            }
          }
        }

        if (fullText && editor) {
          editor.commands.setContent(`<p>${fullText.replace(/\n/g, '</p><p>')}</p>`);
          onUpdate(step.id, { bodyHtml: editor.getHTML() });
        }
      }
    } catch (err) {
      console.error('AI generate error:', err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Subject */}
      <div>
        <label className="text-[10px] font-semibold tracking-wider uppercase text-[#7a7a76] mb-1 block">
          {t('sequence.step_email_subject')}
        </label>
        <Input
          value={step.subject || ''}
          onChange={(e) => onUpdate(step.id, { subject: e.target.value })}
          placeholder="Ex: Bonjour {{prenom}}, une question rapide..."
          className="h-8 text-xs border-[#e5e5e0] bg-white"
        />
      </div>

      {/* Body */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] font-semibold tracking-wider uppercase text-[#7a7a76]">
            Corps
          </label>
          <button
            onClick={handleAiGenerate}
            disabled={generating}
            className="flex items-center gap-1 text-[10px] font-semibold text-[#059669] hover:text-[#047857] transition-colors disabled:opacity-50"
          >
            {generating ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
            {t('sequence.ai_generate')}
          </button>
        </div>
        <div className="border border-[#e5e5e0] rounded-lg bg-white min-h-[96px] text-sm text-[#26251e] overflow-hidden [&_.ProseMirror]:outline-none [&_.ProseMirror]:p-3 [&_.ProseMirror]:min-h-[96px] [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-[#7a7a76] [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Variable chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] text-[#7a7a76] font-semibold">{t('sequence.vars_insert')}:</span>
        {VARIABLES.map((v) => (
          <button
            key={v}
            onClick={() => insertVariable(v)}
            className="text-[10px] font-mono bg-[#f4f4f3] hover:bg-[#059669]/10 hover:text-[#059669] border border-[#e5e5e0] rounded px-1.5 py-0.5 transition-colors"
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Step icons / colors ───────────────────────────────────────────────────────

function stepIcon(type: StepType) {
  switch (type) {
    case 'email': return <Mail className="w-4 h-4" />;
    case 'delay': return <Clock className="w-4 h-4" />;
    case 'task': return <CheckSquare className="w-4 h-4" />;
    case 'condition': return <GitBranch className="w-4 h-4" />;
  }
}

function stepColor(type: StepType): string {
  switch (type) {
    case 'email': return 'bg-blue-50 text-blue-600 border-blue-200';
    case 'delay': return 'bg-[#f4f4f3] text-[#7a7a76] border-[#e5e5e0]';
    case 'task': return 'bg-[#059669]/10 text-[#059669] border-[#059669]/20';
    case 'condition': return 'bg-amber-50 text-amber-600 border-amber-200';
  }
}

function stepLabel(type: StepType, t: (key: TranslationKey, fallback?: string) => string): string {
  switch (type) {
    case 'email': return t('sequence.step_email');
    case 'delay': return t('sequence.step_delay');
    case 'task': return t('sequence.step_task');
    case 'condition': return t('sequence.step_condition');
  }
}

// ── Timeline preview ──────────────────────────────────────────────────────────

interface TimelineItem {
  day: number;
  step: Step;
  index: number;
}

function buildTimeline(steps: Step[]): TimelineItem[] {
  const items: TimelineItem[] = [];
  let currentDay = 0;
  steps.forEach((step, index) => {
    if (step.type === 'delay') {
      currentDay += step.delayDays ?? 1;
    } else {
      items.push({ day: currentDay, step, index });
    }
  });
  return items;
}

function timelineDescription(step: Step, t: (key: TranslationKey, fallback?: string) => string): string {
  switch (step.type) {
    case 'email':
      return step.subject ? `"${step.subject}"` : t('sequence.empty_body');
    case 'task':
      return step.taskTitle || '(sans titre)';
    case 'condition': {
      const on = step.conditionOn === 'reply' ? t('sequence.condition_reply') : t('sequence.condition_open');
      const then = step.conditionThen === 'stop' ? t('sequence.condition_stop') : t('sequence.condition_continue');
      return `${on} → ${then}`;
    }
    default:
      return '';
  }
}

function timelineDotColor(type: StepType): string {
  switch (type) {
    case 'email': return 'bg-blue-500';
    case 'task': return 'bg-[#059669]';
    case 'condition': return 'bg-amber-500';
    default: return 'bg-[#7a7a76]';
  }
}

// ── Default steps ─────────────────────────────────────────────────────────────

function makeStep(type: StepType): Step {
  const id = `step_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  switch (type) {
    case 'email': return { id, type: 'email', subject: '', bodyHtml: '' };
    case 'delay': return { id, type: 'delay', delayDays: 3 };
    case 'task': return { id, type: 'task', taskTitle: '', taskCategory: 'Follow-up' };
    case 'condition': return { id, type: 'condition', conditionOn: 'reply', conditionThen: 'stop' };
  }
}

const DEFAULT_STEPS: Step[] = [
  { id: 'step_default_1', type: 'email', subject: '', bodyHtml: '' },
  { id: 'step_default_2', type: 'delay', delayDays: 3 },
  { id: 'step_default_3', type: 'email', subject: '', bodyHtml: '' },
];

// ── Main component ─────────────────────────────────────────────────────────────

interface SequenceBuilderPageProps {
  /** When set, loads and PATCHes this existing sequence_templates row instead of creating a new one. */
  templateId?: string;
  /** When set, the "back"/cancel links return here and a newly-created template gets attached to this campaign. */
  campaignId?: string;
}

export default function SequenceBuilderPage({ templateId, campaignId }: SequenceBuilderPageProps = {}) {
  const { t } = useLanguage();
  const router = useRouter();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState<Step[]>(templateId ? [] : DEFAULT_STEPS);
  const [saving, setSaving] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(!!templateId);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const backHref = campaignId ? `/campaigns/${campaignId}` : '/outreach';

  useEffect(() => {
    if (!templateId) return;
    fetch(getApiUrl(`/api/outreach/sequences?id=${templateId}`))
      .then((r) => r.json())
      .then((data) => {
        if (data?.id) {
          setName(data.name || '');
          setDescription(data.description || '');
          setSteps(Array.isArray(data.steps) && data.steps.length > 0 ? data.steps : DEFAULT_STEPS);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingTemplate(false));
  }, [templateId]);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  // Update a step
  const updateStep = useCallback((id: string, updates: Partial<Step>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  }, []);

  // Delete a step
  const deleteStep = (id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  };

  // Add a step
  const addStep = (type: StepType) => {
    setSteps((prev) => [...prev, makeStep(type)]);
  };

  // Reorder steps
  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newSteps = [...steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSteps.length) return;
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    setSteps(newSteps);
  };

  // Save (POST to create, PATCH when editing an existing template)
  const handleSave = async () => {
    if (!name.trim()) {
      showToast('error', 'Veuillez donner un nom à la séquence');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(getApiUrl('/api/outreach/sequences'), {
        method: templateId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(templateId ? { id: templateId } : {}),
          name: name.trim(),
          description: description.trim() || null,
          steps,
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        // First save from a campaign's "Séquence" tab — attach the new template to it.
        if (!templateId && campaignId && saved?.id) {
          await fetch(getApiUrl('/api/outreach/campaigns'), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: campaignId, sequence_ids: [saved.id] }),
          }).catch(() => {});
        }
        showToast('success', t('sequence.saved_success'));
        setTimeout(() => router.push(backHref), 1200);
      } else {
        const data = await res.json();
        showToast('error', data.error || t('sequence.save_error'));
      }
    } catch {
      showToast('error', t('sequence.save_error'));
    } finally {
      setSaving(false);
    }
  };

  const timeline = buildTimeline(steps);

  return (
    <div className="relative flex flex-col h-full overflow-hidden bg-[#fafaf8] text-[#26251e]">
      {/* Toast */}
      {toast && (
        <div
          className={cn(
            'fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-semibold animate-in slide-in-from-top-2 duration-200',
            toast.type === 'success'
              ? 'bg-[#059669] text-white'
              : 'bg-red-500 text-white'
          )}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div
        className="relative px-6 pt-6 pb-5 border-b border-[#e5e5e0] bg-white shrink-0"
        style={{
          backgroundImage: 'radial-gradient(circle, #a1a1aa 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0',
        }}
      >
        <div className="relative z-10">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7a7a76] hover:text-[#26251e] transition-colors mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t('sequence.back')}
          </Link>
          <h1 className="text-2xl font-bold text-[#26251e] tracking-tight">
            {templateId ? 'Éditer la séquence' : t('sequence.new_title')}
          </h1>
        </div>
      </div>

      {loadingTemplate && (
        <div className="absolute inset-0 top-[93px] bg-[#fafaf8] flex items-center justify-center z-20">
          <Loader2 className="w-5 h-5 animate-spin text-[#7a7a76]" />
        </div>
      )}

      {/* Name + description bar */}
      <div className="px-6 py-3 border-b border-[#e5e5e0] bg-white shrink-0 flex items-center gap-4">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('sequence.name_placeholder')}
          className="max-w-xs h-9 text-sm font-semibold border-[#e5e5e0]"
        />
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('sequence.desc_placeholder')}
          className="flex-1 h-9 text-sm border-[#e5e5e0]"
        />
      </div>

      {/* Main content: Steps + Timeline */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left panel — Steps editor */}
        <div className="w-[480px] flex-shrink-0 border-r border-[#e5e5e0] flex flex-col overflow-hidden">
          <div className="px-5 py-3 border-b border-[#e5e5e0] bg-white shrink-0 flex items-center justify-between">
            <h2 className="text-xs font-bold tracking-wider uppercase text-[#7a7a76]">
              {t('sequence.steps_title')} ({steps.length})
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="space-y-3">
              {steps.map((step, index) => (
                <StepCard
                  key={step.id}
                  step={step}
                  index={index}
                  total={steps.length}
                  onUpdate={updateStep}
                  onDelete={() => deleteStep(step.id)}
                  onMove={moveStep}
                  t={t}
                />
              ))}

              {steps.length === 0 && (
                <p className="text-xs text-[#7a7a76] text-center py-8">
                  Aucune étape. Ajoutez-en une ci-dessous.
                </p>
              )}

              {/* Add step button */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full h-8 text-xs border-dashed border-[#e5e5e0] text-[#7a7a76] hover:text-[#059669] hover:border-[#059669]/40 hover:bg-[#059669]/5 gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {t('sequence.add_step')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-40">
                  <DropdownMenuItem onClick={() => addStep('email')} className="text-xs gap-2">
                    <Mail className="w-3.5 h-3.5 text-blue-500" />
                    {t('sequence.step_email')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addStep('delay')} className="text-xs gap-2">
                    <Clock className="w-3.5 h-3.5 text-[#7a7a76]" />
                    {t('sequence.step_delay')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addStep('task')} className="text-xs gap-2">
                    <CheckSquare className="w-3.5 h-3.5 text-[#059669]" />
                    {t('sequence.step_task')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addStep('condition')} className="text-xs gap-2">
                    <GitBranch className="w-3.5 h-3.5 text-amber-500" />
                    {t('sequence.step_condition')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Footer actions */}
          <div className="px-4 py-3 border-t border-[#e5e5e0] bg-white shrink-0 flex items-center gap-2">
            <Button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="h-8 px-4 text-xs font-bold bg-[#059669] hover:bg-[#047857] text-white rounded-lg gap-1.5"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {t('sequence.save')}
            </Button>
            <Button
              onClick={() => router.push(backHref)}
              variant="outline"
              className="h-8 px-4 text-xs font-semibold border-[#e5e5e0] text-[#7a7a76] hover:bg-[#f4f4f3]"
            >
              {t('sequence.cancel')}
            </Button>
          </div>
        </div>

        {/* Right panel — Timeline preview */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#fafaf8]">
          <div className="px-5 py-3 border-b border-[#e5e5e0] bg-white shrink-0">
            <h2 className="text-xs font-bold tracking-wider uppercase text-[#7a7a76]">
              {t('sequence.preview_title')}
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            {timeline.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Clock className="w-10 h-10 text-[#e5e5e0] mb-3" />
                <p className="text-sm font-semibold text-[#26251e]">Aucune étape à prévisualiser</p>
                <p className="text-xs text-[#7a7a76] mt-1">Ajoutez des étapes à gauche</p>
              </div>
            ) : (
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[18px] top-2 bottom-2 w-px bg-[#e5e5e0]" />

                <div className="space-y-5">
                  {timeline.map(({ day, step, index }) => (
                    <div key={step.id} className="flex items-start gap-4 relative">
                      {/* Dot */}
                      <div
                        className={cn(
                          'w-[18px] h-[18px] rounded-full shrink-0 mt-0.5 relative z-10 flex items-center justify-center',
                          timelineDotColor(step.type)
                        )}
                      >
                        <div className="w-2 h-2 rounded-full bg-white/70" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 pb-2">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge
                            variant="outline"
                            className="text-[9px] font-bold px-1.5 py-0 border-[#e5e5e0] text-[#7a7a76]"
                          >
                            {t('sequence.timeline_day')} {day}
                          </Badge>
                          <span className="text-[10px] font-semibold text-[#26251e] flex items-center gap-1">
                            {stepIcon(step.type)}
                            {stepLabel(step.type, t)}
                          </span>
                        </div>
                        <p className="text-xs text-[#7a7a76] leading-relaxed pl-1">
                          {timelineDescription(step, t)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Step Card ──────────────────────────────────────────────────────────────────

interface StepCardProps {
  step: Step;
  index: number;
  total: number;
  onUpdate: (id: string, updates: Partial<Step>) => void;
  onDelete: () => void;
  onMove: (index: number, direction: 'up' | 'down') => void;
  t: (key: TranslationKey, fallback?: string) => string;
}

function StepCard({ step, index, total, onUpdate, onDelete, onMove, t }: StepCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="border border-[#e5e5e0] rounded-xl bg-white overflow-hidden"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Card header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#e5e5e0] bg-[#fafaf8]">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border',
              stepColor(step.type)
            )}
          >
            {stepIcon(step.type)}
            {stepLabel(step.type, t)}
          </span>
          <span className="text-[10px] text-[#7a7a76] font-mono">#{index + 1}</span>
        </div>

        <div className={cn('flex items-center gap-0.5 transition-opacity', hovered ? 'opacity-100' : 'opacity-0')}>
          <button
            onClick={() => onMove(index, 'up')}
            disabled={index === 0}
            className="p-1 rounded hover:bg-[#f4f4f3] text-[#7a7a76] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onMove(index, 'down')}
            disabled={index === total - 1}
            className="p-1 rounded hover:bg-[#f4f4f3] text-[#7a7a76] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 rounded hover:bg-red-50 text-[#7a7a76] hover:text-red-500"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Card body */}
      <div className="px-3 py-3">
        {step.type === 'email' && (
          <EmailStepEditor step={step} onUpdate={onUpdate} stepNumber={index + 1} t={t} />
        )}

        {step.type === 'delay' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#7a7a76] font-semibold shrink-0">{t('sequence.step_delay_label')}</span>
            <Input
              type="number"
              min={1}
              max={365}
              value={step.delayDays ?? 1}
              onChange={(e) => onUpdate(step.id, { delayDays: parseInt(e.target.value, 10) || 1 })}
              className="w-20 h-8 text-sm text-center border-[#e5e5e0]"
            />
            <span className="text-xs text-[#7a7a76] font-semibold shrink-0">{t('sequence.step_delay_unit')}</span>
          </div>
        )}

        {step.type === 'task' && (
          <div className="space-y-2">
            <Input
              value={step.taskTitle || ''}
              onChange={(e) => onUpdate(step.id, { taskTitle: e.target.value })}
              placeholder={t('sequence.step_task_title')}
              className="h-8 text-xs border-[#e5e5e0]"
            />
            <Select
              value={step.taskCategory || 'Follow-up'}
              onValueChange={(v) => onUpdate(step.id, { taskCategory: v })}
            >
              <SelectTrigger className="h-8 text-xs border-[#e5e5e0]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Follow-up" className="text-xs">Follow-up</SelectItem>
                <SelectItem value="Terrain" className="text-xs">Terrain</SelectItem>
                <SelectItem value="Appel" className="text-xs">Appel</SelectItem>
                <SelectItem value="Autre" className="text-xs">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {step.type === 'condition' && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-[#7a7a76] font-semibold">{t('sequence.step_condition_if')}</span>
            <Select
              value={step.conditionOn || 'reply'}
              onValueChange={(v: 'reply' | 'open') => onUpdate(step.id, { conditionOn: v })}
            >
              <SelectTrigger className="h-8 text-xs border-[#e5e5e0] w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reply" className="text-xs">{t('sequence.condition_reply')}</SelectItem>
                <SelectItem value="open" className="text-xs">{t('sequence.condition_open')}</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-[#7a7a76] font-semibold">{t('sequence.step_condition_then')}</span>
            <Select
              value={step.conditionThen || 'stop'}
              onValueChange={(v: 'stop' | 'next') => onUpdate(step.id, { conditionThen: v })}
            >
              <SelectTrigger className="h-8 text-xs border-[#e5e5e0] w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stop" className="text-xs">{t('sequence.condition_stop')}</SelectItem>
                <SelectItem value="next" className="text-xs">{t('sequence.condition_continue')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}
