'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useReach } from '@/lib/reach-context';
import { useSkills } from '@/lib/use-skills';
import { getApiUrl } from '@/lib/api-helper';
import { toast } from 'sonner';
import { 
  X,
  Sparkles,
  Send,
  Plus,
  Mic,
  FileText,
  Copy,
  Check,
  ChevronDown,
  Undo2,
  Redo2,
  Bold,
  Italic,
  Download,
  Settings,
  History,
  MessageSquare,
  Globe,
  Trash2,
  ArrowUp,
  Paperclip,
  Maximize2,
  Database,
  Bookmark,
  TrendingUp,
  Star,
  BarChart3,
  Mail,
  Zap,
} from 'lucide-react';
import { MinervaIcon } from '@/components/icons';
import { useLanguage } from '@/lib/language-context';
import {
  dbGetSessions,
  dbCreateSession,
  dbUpdateSessionTitle,
  dbDeleteSession,
  dbGetMessages,
  dbSaveMessage,
  dbGetCanvasDocs,
  dbSaveCanvasDoc,
  dbDeleteCanvasDoc,
  dbToggleSessionPin,
  AssistantSession,
  DBMessage,
  AssistantCanvasDoc
} from './assistant-db';
import { Pin, PinOff } from 'lucide-react';
import { AiEmailTool } from '@/components/ui/ai-email-tool';
import { AiImageSearch } from '@/components/ui/ai-image-search';
import { AiImageLoader } from '@/components/ui/ai-image-loader';
import { CursorQuestions } from '@/components/ui/cursor-questions';
import { LinkPreview } from '@/components/ui/link-preview';

function MarkdownRenderer({ content, t }: { content: string; t: any }) {
  const [copiedBlock, setCopiedBlock] = React.useState<number | null>(null);

  const copyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedBlock(idx);
    setTimeout(() => setCopiedBlock(null), 1500);
  };

  // Split on fenced code blocks first
  const parts = content.split(/(```[\s\S]*?```)/g);
  let codeIdx = 0;

  return (
    <div className="space-y-2 text-sm leading-relaxed select-text">
      {parts.map((part, i) => {
        if (part.startsWith('```')) {
          const match = part.match(/^```(\w*)\n?([\s\S]*?)```$/);
          const lang = match?.[1] || '';
          const code = match?.[2] ?? part.slice(3, -3);
          const blockIdx = codeIdx++;
          return (
            <div key={i} className="relative rounded-lg bg-neutral-900 text-neutral-100 text-xs font-mono overflow-hidden border border-neutral-800">
              <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-800/60 border-b border-neutral-700">
                <span className="text-[10px] text-neutral-400 font-sans">{lang || 'code'}</span>
                <button
                  onClick={() => copyCode(code, blockIdx)}
                  className="text-[10px] text-neutral-400 hover:text-white transition-colors flex items-center gap-1"
                >
                  {copiedBlock === blockIdx ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedBlock === blockIdx ? t('assistant.copied') : t('assistant.copy')}</span>
                </button>
              </div>
              <pre className="p-3 overflow-x-auto whitespace-pre text-xs leading-relaxed">{code}</pre>
            </div>
          );
        }

        // Parse inline markdown in text blocks
        const lines = part.split('\n');
        const nodes: React.ReactNode[] = [];
        let i2 = 0;

        while (i2 < lines.length) {
          const line = lines[i2];

          // Headings
          const h3 = line.match(/^### (.+)/);
          const h2 = line.match(/^## (.+)/);
          const h1 = line.match(/^# (.+)/);
          if (h3) { nodes.push(<h3 key={`${i}-${i2}`} className="text-sm font-bold text-[#26251e] mt-2 mb-0.5">{renderInline(h3[1])}</h3>); i2++; continue; }
          if (h2) { nodes.push(<h2 key={`${i}-${i2}`} className="text-sm font-extrabold text-[#26251e] mt-3 mb-1">{renderInline(h2[1])}</h2>); i2++; continue; }
          if (h1) { nodes.push(<h1 key={`${i}-${i2}`} className="text-base font-extrabold text-[#26251e] mt-3 mb-1">{renderInline(h1[1])}</h1>); i2++; continue; }

          // Bullet list
          if (/^[-*]\s/.test(line)) {
            const items: string[] = [];
            while (i2 < lines.length && /^[-*]\s/.test(lines[i2])) {
              items.push(lines[i2].replace(/^[-*]\s+/, ''));
              i2++;
            }
            nodes.push(
              <ul key={`${i}-ul-${i2}`} className="list-disc pl-5 space-y-0.5 my-1">
                {items.map((item, idx) => <li key={idx}>{renderInline(item)}</li>)}
              </ul>
            );
            continue;
          }

          // Numbered list
          if (/^\d+\.\s/.test(line)) {
            const items: string[] = [];
            while (i2 < lines.length && /^\d+\.\s/.test(lines[i2])) {
              items.push(lines[i2].replace(/^\d+\.\s+/, ''));
              i2++;
            }
            nodes.push(
              <ol key={`${i}-ol-${i2}`} className="list-decimal pl-5 space-y-0.5 my-1">
                {items.map((item, idx) => <li key={idx}>{renderInline(item)}</li>)}
              </ol>
            );
            continue;
          }

          // Blockquote — strip "> " prefix, render as clean text (common in AI email drafts)
          if (/^>\s?/.test(line)) {
            const bqText = line.replace(/^>\s?/, '');
            nodes.push(
              bqText.trim()
                ? <p key={`${i}-${i2}`} className="whitespace-pre-wrap">{renderInline(bqText)}</p>
                : <div key={`${i}-${i2}`} className="h-1" />
            );
            i2++;
            continue;
          }

          // Horizontal rule
          if (/^---+$/.test(line.trim())) {
            nodes.push(<hr key={`${i}-${i2}`} className="border-[#e5e5e0]/60 my-2" />);
            i2++;
            continue;
          }

          // Blank line = paragraph break
          if (line.trim() === '') {
            nodes.push(<div key={`${i}-${i2}`} className="h-1" />);
            i2++;
            continue;
          }

          // Normal paragraph line
          nodes.push(<p key={`${i}-${i2}`} className="whitespace-pre-wrap">{renderInline(line)}</p>);
          i2++;
        }

        return <React.Fragment key={i}>{nodes}</React.Fragment>;
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|https?:\/\/[^\s]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={i} className="italic">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="bg-neutral-100 text-[#cf2d56] px-1 py-0.5 rounded text-[11px] font-mono">{part.slice(1, -1)}</code>;
    }
    if (/^https?:\/\//.test(part)) {
      return (
        <LinkPreview key={i} url={part}>
          <a href={part} target="_blank" rel="noopener noreferrer" className="text-[#059669] underline hover:text-[#047857] transition-colors break-all">{part}</a>
        </LinkPreview>
      );
    }
    return part;
  });
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  attachedFile?: { name: string; type: string; dataUrl?: string };
  isSimulated?: boolean;
}

interface CanvasDocument {
  id: string;
  title: string;
  content: string;
  lastSaved: string;
}

const AI_MODELS = [
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet (Anthropic)', provider: 'anthropic' },
  { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku — Rapide', provider: 'anthropic' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B (OpenRouter)', provider: 'openrouter' },
  { id: 'meta-llama/llama-3.2-11b-vision-instruct:free', name: 'Vision (texte + image)', provider: 'openrouter' },
  { id: 'google/gemini-2.5-flash:free', name: 'Gemini 2.5 Flash', provider: 'openrouter' },
  { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1 — Raisonnement', provider: 'openrouter' },
  { id: 'nousresearch/hermes-3-llama-3-8b', name: 'Hermes Agent ⚡', provider: 'openrouter' },
];

const generateUniqueId = () => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

function mdToHtml(md: string): string {
  if (!md || md.trim().startsWith('<')) return md;
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
    .replace(/^---+$/gm, '<hr/>')
    .replace(/\n\n+/g, '</p><p>')
    .replace(/\n/g, '<br/>')
    .replace(/^(.+)$/, '<p>$1</p>');
}

// ── Tool-block detection ─────────────────────────────────────────────────────

type ToolBlock =
  | { type: 'email-tool'; data: { variants: any[]; title?: string; recipientEmail?: string } }
  | { type: 'image-search'; data: { results: any[]; query?: string } }
  | { type: 'image-loader'; data: { src?: string; alt?: string; width?: number; height?: number } }
  | { type: 'questions'; data: { questions: any[] } }
  | null;

function parseToolBlock(content: string): { block: ToolBlock; before: string; after: string } | null {
  const toolTypes = ['email-tool', 'image-search', 'image-loader', 'questions'] as const;
  for (const toolType of toolTypes) {
    const regex = new RegExp('```' + toolType + '\\n([\\s\\S]*?)```');
    const match = content.match(regex);
    if (match) {
      try {
        const data = JSON.parse(match[1]);
        const fullMatch = match[0];
        const matchStart = content.indexOf(fullMatch);
        const before = content.slice(0, matchStart);
        const after = content.slice(matchStart + fullMatch.length);
        const block: ToolBlock = { type: toolType, data };
        return { block, before, after };
      } catch {
        // JSON parse failed — skip this block
      }
    }
  }
  return null;
}

// ── Action block parser ─────────────────────────────────────────────────────

type MinervaActionPayload = {
  action: string;
  params: Record<string, any>;
  summary: string;
};

function parseActionBlock(content: string): {
  action: MinervaActionPayload;
  before: string;
  after: string;
} | null {
  const regex = /```minerva-action\n([\s\S]*?)```/;
  const match = content.match(regex);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    if (!parsed.action || !parsed.summary) return null;
    const fullMatch = match[0];
    const matchStart = content.indexOf(fullMatch);
    return {
      action: parsed,
      before: content.slice(0, matchStart),
      after: content.slice(matchStart + fullMatch.length),
    };
  } catch {
    return null;
  }
}

function ActionCard({
  action,
  onExecute,
}: {
  action: MinervaActionPayload;
  onExecute: () => Promise<{ success: boolean; message: string }>;
}) {
  const [status, setStatus] = React.useState<'pending' | 'loading' | 'done' | 'error'>('pending');
  const [resultMsg, setResultMsg] = React.useState('');

  const handleConfirm = async () => {
    setStatus('loading');
    const res = await onExecute();
    setResultMsg(res.message);
    setStatus(res.success ? 'done' : 'error');
  };

  const actionLabels: Record<string, string> = {
    create_lead: 'Créer un lead',
    send_email: 'Envoyer un email',
    create_task: 'Créer une tâche',
    update_lead_status: 'Mettre à jour le statut',
    create_campaign: 'Créer une campagne',
    create_sequence: 'Créer une séquence',
    search_gmail_sent: 'Voir les emails envoyés',
    search_gmail_replies: 'Voir les réponses Gmail',
  };

  return (
    <div className="border border-[#059669]/25 bg-gradient-to-br from-[#f0fdf4] to-white rounded-xl p-3.5 space-y-2.5 my-2">
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-md bg-[#059669]/15 flex items-center justify-center">
          <Zap className="h-3.5 w-3.5 text-[#059669]" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-wider text-[#059669]">
          {actionLabels[action.action] || 'Action Minerva'}
        </span>
      </div>
      <p className="text-sm text-[#26251e] font-medium">{action.summary}</p>
      {Object.keys(action.params || {}).length > 0 && (
        <div className="bg-white/60 rounded-lg px-3 py-2 space-y-1 border border-[#e5e5e0]/60">
          {Object.entries(action.params).slice(0, 5).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2 text-[11px]">
              <span className="text-[#7a7a76] font-semibold capitalize">{k.replace(/_/g, ' ')}:</span>
              <span className="text-[#26251e] font-medium truncate max-w-[200px]">{String(v)}</span>
            </div>
          ))}
        </div>
      )}
      {status === 'pending' && (
        <div className="flex gap-2 pt-0.5">
          <button
            onClick={handleConfirm}
            className="h-7 px-3.5 bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold rounded-lg transition-colors"
          >
            Confirmer
          </button>
          <button
            onClick={() => { setStatus('error'); setResultMsg('Action annulée'); }}
            className="h-7 px-3 bg-neutral-100 hover:bg-neutral-200 text-[#26251e] text-xs font-semibold rounded-lg transition-colors"
          >
            Annuler
          </button>
        </div>
      )}
      {status === 'loading' && (
        <div className="flex items-center gap-2 text-xs text-[#059669] font-semibold">
          <div className="h-3.5 w-3.5 border-2 border-[#059669] border-t-transparent rounded-full animate-spin" />
          Exécution en cours...
        </div>
      )}
      {status === 'done' && (
        <div className="flex items-center gap-2 text-xs text-[#059669] font-bold">
          <Check className="h-3.5 w-3.5" />
          {resultMsg || 'Action exécutée avec succès'}
        </div>
      )}
      {status === 'error' && (
        <div className="text-xs text-red-600 font-semibold">{resultMsg || 'Action annulée'}</div>
      )}
    </div>
  );
}

// ── Rich message content ─────────────────────────────────────────────────────

function RichMessageContent({
  content,
  t,
  onAction,
}: {
  content: string;
  t: any;
  onAction?: (action: MinervaActionPayload) => Promise<{ success: boolean; message: string }>;
}) {
  // Check for CRM action blocks first
  const actionResult = parseActionBlock(content);
  if (actionResult && onAction) {
    const { action, before, after } = actionResult;
    return (
      <div className="space-y-3">
        {before.trim() && <MarkdownRenderer content={before.trim()} t={t} />}
        <ActionCard action={action} onExecute={() => onAction(action)} />
        {after.trim() && <MarkdownRenderer content={after.trim()} t={t} />}
      </div>
    );
  }

  const toolResult = parseToolBlock(content);

  if (toolResult) {
    const { block, before, after } = toolResult;
    return (
      <div className="space-y-3">
        {before.trim() && <MarkdownRenderer content={before.trim()} t={t} />}
        {block?.type === 'email-tool' && (
          <AiEmailTool
            variants={block.data.variants}
            title={block.data.title}
            recipientEmail={block.data.recipientEmail}
          />
        )}
        {block?.type === 'image-search' && (
          <AiImageSearch
            results={block.data.results}
            query={block.data.query}
          />
        )}
        {block?.type === 'image-loader' && (
          <AiImageLoader
            src={block.data.src}
            alt={block.data.alt}
            width={block.data.width}
            height={block.data.height}
          />
        )}
        {block?.type === 'questions' && (
          <CursorQuestions
            questions={block.data.questions}
            onComplete={() => {}}
          />
        )}
        {after.trim() && <MarkdownRenderer content={after.trim()} t={t} />}
      </div>
    );
  }

  return <MarkdownRenderer content={content} t={t} />;
}

// ────────────────────────────────────────────────────────────────────────────

export function AssistantRoot() {
  const { user, leads, tasks, activeWorkspace, addLead, addTask, updateLeadStatus } = useReach();
  const { t, locale } = useLanguage();
  const { enabledSkills } = useSkills(activeWorkspace?.id);

  // CRM context options available in the @ menu
  const CRM_CONTEXTS: { id: string; label: string }[] = [
    { id: 'leads', label: 'Tous les leads' },
    { id: 'pipeline', label: 'Pipeline (par statut)' },
    { id: 'hot', label: 'Leads chauds' },
    { id: 'tasks', label: 'Tâches en cours' },
  ];

  // State Management
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  // @ skills/context menu
  const [showAtMenu, setShowAtMenu] = useState(false);
  const [activeSkillIds, setActiveSkillIds] = useState<string[]>([]);
  const [activeContextIds, setActiveContextIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(AI_MODELS[0]);
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  // File Attachment
  const [attachedFile, setAttachedFile] = useState<{ name: string; type: string; content?: string; dataUrl?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice Interaction Simulation
  const [isRecording, setIsRecording] = useState(false);
  const recordingIntervalRef = useRef<any>(null);

  // Canvas State
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [canvasDoc, setCanvasDoc] = useState<CanvasDocument | null>(null);
  const [editorDocId, setEditorDocId] = useState<string>('');

  // Editor states
  const [editorTitle, setEditorTitle] = useState("");
  const [editorContent, setEditorContent] = useState("");
  const [isSavedIndicator, setIsSavedIndicator] = useState("assistant.saved");
  const [headingFormat, setHeadingFormat] = useState("normal");
  const [copied, setCopied] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  // Synchroniser le titre par défaut du Canvas selon la langue
  useEffect(() => {
    if (!editorDocId && (!editorTitle || editorTitle === "Document sans titre" || editorTitle === "Untitled Document" || editorTitle === "Unbenanntes Dokument")) {
      setEditorTitle(t('assistant.untitled_doc'));
    }
  }, [locale, editorDocId]);

  // History panel states
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const [sessions, setSessions] = useState<AssistantSession[]>([]);
  const [currentSession, setCurrentSession] = useState<AssistantSession | null>(null);
  const [canvasDocs, setCanvasDocs] = useState<AssistantCanvasDoc[]>([]);
  const [showAiDropdown, setShowAiDropdown] = useState(false);
  const [isAiWorking, setIsAiWorking] = useState(false);

  // Canvas right-gutter panel state
  const [canvasRightPanel, setCanvasRightPanel] = useState<'none' | 'comments' | 'history' | 'settings'>('none');
  const [canvasComment, setCanvasComment] = useState('');
  const [canvasComments, setCanvasComments] = useState<{ text: string; ts: string }[]>([]);
  const [canvasFontSize, setCanvasFontSize] = useState<'sm' | 'base' | 'lg'>('base');
  const [showSaveToLibraryPrompt, setShowSaveToLibraryPrompt] = useState(false);
  const [lastExportedContent, setLastExportedContent] = useState<{ title: string; content: string } | null>(null);

  // Hermès orchestrator state
  const [hermesSteps, setHermesSteps] = useState<Array<{ type: string; content?: string; tool?: string; params?: any }>>([]);
  const [hermesRunning, setHermesRunning] = useState(false);

  // Canvas float state
  const [isCanvasFloating, setIsCanvasFloating] = useState(false);
  const [canvasFloatPos, setCanvasFloatPos] = useState({ x: 80, y: 60 });
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null);

  // Checkpoint state
  const [checkpoints, setCheckpoints] = useState<number[]>([]);

  // Library save state
  const [showLibraryDropdown, setShowLibraryDropdown] = useState(false);
  const [libraryFolderName, setLibraryFolderName] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const userId = user?.id || 'anonymous';
  const workspaceId = activeWorkspace?.id || 'default_ws';

  // ── CRM action executor — called by ActionCard confirm button ─────────────
  const executeAction = useCallback(async (
    actionData: MinervaActionPayload,
  ): Promise<{ success: boolean; message: string }> => {
    try {
      switch (actionData.action) {
        case 'create_lead': {
          const p = actionData.params;
          await addLead({
            businessName: p.business_name || p.businessName || 'Nouveau lead',
            contactName: p.contact_name || p.contactName || '',
            contactEmail: p.email || p.contact_email || '',
            niche: p.niche || 'Autre',
            city: p.city || '',
            source: 'assistant',
            status: (p.status as any) || 'New',
            temperature: (p.temperature as any) || 'Cold',
            nextAction: 'Contacter',
            nextActionDate: new Date(Date.now() + 86_400_000).toISOString().split('T')[0],
            phone: p.phone || '',
            website: p.website || '',
            notes: p.notes || '',
          });
          return { success: true, message: `Lead "${p.business_name || p.businessName}" créé avec succès` };
        }
        case 'create_task': {
          const p = actionData.params;
          await addTask(
            p.title || actionData.summary,
            (p.category as any) || 'follow_up',
            p.due_date,
          );
          return { success: true, message: `Tâche "${p.title || actionData.summary}" créée` };
        }
        case 'update_lead_status': {
          const p = actionData.params;
          if (!p.lead_id) return { success: false, message: 'ID lead manquant' };
          await updateLeadStatus(p.lead_id, p.status);
          return { success: true, message: `Statut mis à jour : ${p.status}` };
        }
        case 'send_email': {
          const p = actionData.params;
          const res = await fetch(getApiUrl('/api/send-email'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: p.to || p.recipient_email,
              subject: p.subject,
              body: p.body || p.content,
              leadId: p.lead_id,
            }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { success: false, message: err.error || 'Erreur lors de l\'envoi' };
          }
          return { success: true, message: `Email envoyé à ${p.to || p.recipient_email}` };
        }
        case 'search_gmail_sent': {
          const res = await fetch(getApiUrl('/api/gmail/threads?folder=SENT&limit=10'));
          if (!res.ok) return { success: false, message: 'Impossible de charger les emails envoyés' };
          const data = await res.json();
          const count = data.threads?.length || 0;
          return { success: true, message: `${count} email(s) envoyés récents chargés — consultez /inbox pour les détails` };
        }
        case 'search_gmail_replies': {
          const res = await fetch(getApiUrl('/api/gmail/threads?folder=INBOX&hasReply=true&limit=10'));
          if (!res.ok) return { success: false, message: 'Impossible de charger les réponses' };
          const data = await res.json();
          const count = data.threads?.length || 0;
          return { success: true, message: `${count} réponse(s) reçues — consultez /inbox pour les lire` };
        }
        default:
          return { success: false, message: `Action inconnue : ${actionData.action}` };
      }
    } catch (e) {
      return { success: false, message: (e as Error).message };
    }
  }, [addLead, addTask, updateLeadStatus]);

  // TipTap WYSIWYG editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: t('assistant.editor_placeholder') }),
      CharacterCount,
    ],
    content: editorContent || '',
    onUpdate: ({ editor }) => {
      handleContentChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none outline-none min-h-[400px] focus:outline-none text-[#26251e] leading-relaxed',
      },
    },
  });

  // Sync external content (e.g. from canvas block) into TipTap editor
  useEffect(() => {
    if (editor && editorContent !== undefined) {
      const currentHtml = editor.getHTML();
      if (currentHtml !== editorContent) {
        const html = editorContent.trim().startsWith('<') ? editorContent : mdToHtml(editorContent);
        editor.commands.setContent(html, { emitUpdate: false });
      }
    }
  }, [editorContent, editor]);

  // Load database sessions and documents on mount or workspace change
  useEffect(() => {
    async function loadWorkspaceData() {
      const sessList = await dbGetSessions(userId, workspaceId);
      setSessions(sessList);

      const docsList = await dbGetCanvasDocs(userId, workspaceId);
      setCanvasDocs(docsList);

      const storedSessId = localStorage.getItem(`minerva_active_sess_${workspaceId}`);
      // Prefer stored session, fall back to most recently updated session so
      // messages are never "lost" just because localStorage was cleared
      const activeSess = sessList.find(s => s.id === storedSessId) ?? sessList[0] ?? null;
      if (activeSess) {
        setCurrentSession(activeSess);
        localStorage.setItem(`minerva_active_sess_${workspaceId}`, activeSess.id);
        const msgs = await dbGetMessages(activeSess.id);
        setMessages(msgs);
      } else {
        setCurrentSession(null);
        setMessages([]);
      }

      const storedCanvasId = localStorage.getItem(`minerva_active_canvas_${workspaceId}`);
      const activeDoc = docsList.find(d => d.id === storedCanvasId);
      if (activeDoc) {
        setEditorDocId(activeDoc.id);
        setCanvasDoc({
          id: activeDoc.id,
          title: activeDoc.title,
          content: activeDoc.content,
          lastSaved: t('assistant.saved')
        });
        setEditorTitle(activeDoc.title);
        setEditorContent(activeDoc.content);
        setIsCanvasOpen(true);
      } else {
        setEditorDocId('');
        setCanvasDoc(null);
        setEditorTitle("");
        setEditorContent("");
      }
    }
    loadWorkspaceData();

    const handleSync = () => {
      loadWorkspaceData();
    };
    window.addEventListener('minerva_assistant_sync', handleSync);
    return () => {
      window.removeEventListener('minerva_assistant_sync', handleSync);
    };
  }, [userId, workspaceId]);

  // Check for pending voice task queries redirect from other pages
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const pendingText = localStorage.getItem('minerva_pending_voice_query');
    if (pendingText?.trim()) {
      localStorage.removeItem('minerva_pending_voice_query');
      // Wait a tiny bit for DB session init to finalize
      setTimeout(() => {
        handleSend(pendingText);
      }, 500);
    }
  }, [userId, workspaceId]);

  // Scroll to bottom on message updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Canvas doc active state updates
  useEffect(() => {
    if (canvasDoc) {
      setEditorTitle(canvasDoc.title);
      setEditorContent(canvasDoc.content);
      setEditorDocId(canvasDoc.id);
      localStorage.setItem(`minerva_active_canvas_${workspaceId}`, canvasDoc.id);
    } else {
      localStorage.removeItem(`minerva_active_canvas_${workspaceId}`);
    }
  }, [canvasDoc, workspaceId]);

  // Canvas drag handlers for floating mode
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (!isCanvasFloating) return;
    const target = e.currentTarget;
    dragOffsetRef.current = {
      x: e.clientX - canvasFloatPos.x,
      y: e.clientY - canvasFloatPos.y,
    };
    target.setPointerCapture(e.pointerId);
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!isCanvasFloating || !dragOffsetRef.current) return;
    setCanvasFloatPos({
      x: e.clientX - dragOffsetRef.current.x,
      y: e.clientY - dragOffsetRef.current.y,
    });
  };

  const handleCanvasPointerUp = () => {
    dragOffsetRef.current = null;
  };

  // Auto-save logic
  const saveDoc = async (id: string, title: string, content: string) => {
    setIsSavedIndicator("assistant.saving");
    await dbSaveCanvasDoc(id, userId, workspaceId, title, content);
    
    // Refresh document list
    const list = await dbGetCanvasDocs(userId, workspaceId);
    setCanvasDocs(list);
    setIsSavedIndicator("assistant.saved");
  };

  const handleContentChange = (newVal: string) => {
    setEditorContent(newVal);
    const docId = editorDocId || generateUniqueId();
    if (!editorDocId) {
      setEditorDocId(docId);
      setCanvasDoc({
        id: docId,
        title: editorTitle,
        content: newVal,
        lastSaved: t('assistant.just_now')
      });
    } else if (canvasDoc) {
      setCanvasDoc({
        ...canvasDoc,
        content: newVal
      });
    }

    const timer = setTimeout(() => {
      saveDoc(docId, editorTitle, newVal);
    }, 1000);

    return () => clearTimeout(timer);
  };

  const handleTitleChange = (newTitle: string) => {
    setEditorTitle(newTitle);
    const docId = editorDocId || generateUniqueId();
    if (!editorDocId) {
      setEditorDocId(docId);
      setCanvasDoc({
        id: docId,
        title: newTitle,
        content: editorContent,
        lastSaved: t('assistant.just_now')
      });
    } else if (canvasDoc) {
      setCanvasDoc({
        ...canvasDoc,
        title: newTitle
      });
    }

    const timer = setTimeout(() => {
      saveDoc(docId, newTitle, editorContent);
    }, 1000);

    return () => clearTimeout(timer);
  };

  // Helper to parse canvas blocks from text
  const extractCanvasBlock = (text: string) => {
    const match = text.match(/```canvas:([^\n]+)\n([\s\S]*?)```/);
    if (match) {
      return {
        title: match[1].trim(),
        content: match[2],
        cleanText: text.replace(/```canvas:[^\n]+\n[\s\S]*?```/, '').trim()
      };
    }
    return null;
  };

  // Check if message is currently receiving a canvas block and render it
  const renderMessageContent = (msg: Message, index: number) => {
    const canvasData = extractCanvasBlock(msg.content);
    if (canvasData) {
      return (
        <div className="space-y-4">
          <p className="whitespace-pre-wrap">{canvasData.cleanText}</p>
          <div className="border border-emerald-200/80 bg-emerald-50/30 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#26251e] truncate">{canvasData.title}</p>
                <p className="text-[10px] text-[#7a7a76]">{t('assistant.doc_ready_canvas')}</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                const docId = generateUniqueId();
                setEditorDocId(docId);
                const doc = {
                  id: docId,
                  title: canvasData.title,
                  content: canvasData.content,
                  lastSaved: t('assistant.just_now')
                };
                setCanvasDoc(doc);
                await dbSaveCanvasDoc(docId, userId, workspaceId, canvasData.title, canvasData.content);
                const list = await dbGetCanvasDocs(userId, workspaceId);
                setCanvasDocs(list);
                setIsCanvasOpen(true);
              }}
              className="text-xs font-bold h-8 border-emerald-200 hover:bg-emerald-50 text-emerald-700 hover:text-emerald-800 shrink-0"
            >
              <Maximize2 className="h-3 w-3 mr-1" />
              {t('assistant.open_canvas')}
            </Button>
          </div>
        </div>
      );
    }

    // Rich content renderer for assistant messages (tool blocks + link previews + markdown)
    if (msg.role === 'assistant') {
      return (
        <div className="space-y-2">
          {msg.attachedFile && (
            <div className="inline-flex items-center gap-2 bg-neutral-100 border border-[#e5e5e0] px-3 py-1.5 rounded-lg text-[11px] font-bold">
              <FileText className="h-3.5 w-3.5 text-[#10b981]" />
              <span className="truncate max-w-[150px]">{msg.attachedFile.name}</span>
            </div>
          )}
          <RichMessageContent content={msg.content} t={t} onAction={executeAction} />
        </div>
      );
    }

    // Plain user message
    return (
      <div className="space-y-2">
        {msg.attachedFile?.dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={msg.attachedFile.dataUrl} alt={msg.attachedFile.name} className="max-w-[220px] max-h-[220px] rounded-lg border border-[#e5e5e0] object-cover" />
        ) : msg.attachedFile && (
          <div className="inline-flex items-center gap-2 bg-neutral-100 border border-[#e5e5e0] px-3 py-1.5 rounded-lg text-[11px] font-bold">
            <FileText className="h-3.5 w-3.5 text-[#10b981]" />
            <span className="truncate max-w-[150px]">{msg.attachedFile.name}</span>
          </div>
        )}
        <p className="whitespace-pre-wrap leading-relaxed text-sm">{msg.content}</p>
      </div>
    );
  };

  // Start a new thread — do NOT dispatch minerva_assistant_sync here: that
  // triggers loadWorkspaceData() which falls back to sessions[0] and immediately
  // re-loads the last chat, defeating the purpose of the new-chat action.
  const handleClearChat = () => {
    setCurrentSession(null);
    setMessages([]);
    localStorage.removeItem(`minerva_active_sess_${workspaceId}`);
  };

  // Send message handler
  const handleSend = async (customPrompt?: string) => {
    const trimmed = (customPrompt || input).trim();
    if (!trimmed && !attachedFile) return;

    setInput('');
    const fileToAttach = attachedFile;
    setAttachedFile(null);

    // Context Injection from uploaded file
    let contentToSend = trimmed;
    if (fileToAttach && fileToAttach.content) {
      contentToSend = `[Fichier attaché : ${fileToAttach.name}]\n<attachment name="${fileToAttach.name}">\n${fileToAttach.content}\n</attachment>\n\n${trimmed}`;
    }

    // Load or create discussion session
    let activeSess = currentSession;
    let isNewSession = false;
    if (!activeSess) {
      isNewSession = true;
      const words = trimmed
        .replace(/[^\w\sÀ-ɏ'-]/g, '')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 6);
      const sessTitle = words.length > 0
        ? words.join(' ')
        : (fileToAttach ? (locale === 'en' ? 'File: ' : locale === 'de' ? 'Datei: ' : 'Fichier : ') + fileToAttach.name : t('assistant.new_chat'));
      activeSess = await dbCreateSession(userId, workspaceId, sessTitle);
      setCurrentSession(activeSess);
      localStorage.setItem(`minerva_active_sess_${workspaceId}`, activeSess.id);
      
      const sessList = await dbGetSessions(userId, workspaceId);
      setSessions(sessList);
      window.dispatchEvent(new CustomEvent('minerva_assistant_sync'));
    }

    const userMsg: Message = {
      role: 'user',
      content: trimmed,
      attachedFile: fileToAttach ? { name: fileToAttach.name, type: fileToAttach.type, dataUrl: fileToAttach.dataUrl } : undefined
    };

    // Save to local database
    await dbSaveMessage(activeSess.id, userId, 'user', trimmed, fileToAttach ? { name: fileToAttach.name, type: fileToAttach.type } : undefined);

    const history = [...messages, userMsg];
    setMessages(history);
    setIsLoading(true);

    // Last user message: send multimodal content (text + image) when an image is
    // attached, so vision-capable models actually receive the image.
    const lastUserContent: unknown = (fileToAttach && fileToAttach.dataUrl)
      ? [
          { type: 'text', text: contentToSend || "Décris cette image." },
          { type: 'image_url', image_url: { url: fileToAttach.dataUrl } },
        ]
      : contentToSend;

    const apiHistory = [
      ...messages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: lastUserContent }
    ];

    // Canvas-aware system prompt: lets the AI decide to open & write in the Canvas
    // automatically. When it produces a substantial document (report, long email,
    // proposal, script, plan…), it wraps it in a ```canvas:Titre block, which the
    // client detects (extractCanvasBlock) and opens in the Canvas editor.
    const canvasSystemPrompt =
      locale === 'en'
        ? "You are Minerva's assistant. When your answer is a substantial, self-contained document (report, proposal, long email, call script, action plan, structured analysis…), output it INSIDE a fenced block of the form:\n```canvas:Document Title\n<the full document in Markdown>\n```\nWrite a short one-sentence intro before the block. For quick conversational answers, reply normally without a canvas block."
        : locale === 'de'
        ? "Sie sind Minervas Assistent. Wenn Ihre Antwort ein umfangreiches, eigenständiges Dokument ist (Bericht, Angebot, lange E-Mail, Gesprächsskript, Aktionsplan, strukturierte Analyse…), geben Sie es INNERHALB eines Codeblocks dieser Form aus:\n```canvas:Dokumenttitel\n<das vollständige Dokument in Markdown>\n```\nSchreiben Sie davor einen kurzen Einleitungssatz. Für kurze Gesprächsantworten antworten Sie normal ohne Canvas-Block."
        : "Tu es l'assistant de Minerva. Lorsque ta réponse est un document substantiel et autonome (rapport, proposition, email long, script d'appel, plan d'action, analyse structurée…), produis-le À L'INTÉRIEUR d'un bloc de la forme :\n```canvas:Titre du document\n<le document complet en Markdown>\n```\nÉcris une courte phrase d'introduction avant le bloc. Pour les réponses conversationnelles courtes, réponds normalement sans bloc canvas.";

    // Inject the instructions of any @-selected skills into the system prompt
    const skillInstructions = activeSkillIds
      .map(id => enabledSkills.find(s => s.id === id))
      .filter(Boolean)
      .map(s => `### Compétence : ${s!.name}\n${s!.instructions}`)
      .join('\n\n');

    // Inject real CRM context (leads/pipeline/hot/tasks) for any @-selected context items
    const buildContext = (id: string): string => {
      if (id === 'leads') {
        const sample = leads.slice(0, 30).map(l => `- ${l.businessName}${l.city ? ` (${l.city})` : ''} — ${l.status}${l.temperature ? `, ${l.temperature}` : ''}`).join('\n');
        return `Leads (${leads.length} au total) :\n${sample}`;
      }
      if (id === 'pipeline') {
        const byStatus: Record<string, number> = {};
        leads.forEach(l => { byStatus[l.status] = (byStatus[l.status] || 0) + 1; });
        return `Pipeline par statut : ${Object.entries(byStatus).map(([k, v]) => `${k}: ${v}`).join(', ')}.`;
      }
      if (id === 'hot') {
        const hot = leads.filter(l => l.temperature === 'Hot');
        return `Leads chauds (${hot.length}) :\n${hot.slice(0, 20).map(l => `- ${l.businessName}${l.city ? ` (${l.city})` : ''}`).join('\n') || 'aucun'}`;
      }
      if (id === 'tasks') {
        const open = tasks.filter(t => !t.completed);
        return `Tâches en cours (${open.length}) :\n${open.slice(0, 20).map(t => `- ${t.title}${t.dueDate ? ` (échéance ${t.dueDate})` : ''}`).join('\n') || 'aucune'}`;
      }
      return '';
    };
    const contextText = activeContextIds.map(buildContext).filter(Boolean).join('\n\n');

    const actionsPrompt = `## Actions Minerva — exécutables en temps réel
Quand l'utilisateur demande une action CRM concrète (créer un lead, envoyer un email, créer une tâche, mettre à jour un statut...), génère un bloc d'action JSON dans ta réponse, en PLUS d'une courte explication :
\`\`\`minerva-action
{"action": "nom_action", "params": {...}, "summary": "Résumé de l'action en une phrase"}
\`\`\`
Actions disponibles :
- create_lead : params { business_name, city, phone, niche, email, website, notes, status ("New"|"Contacted"|"Interested"), temperature ("Cold"|"Warm"|"Hot") }
- send_email : params { to, subject, body, lead_id? }
- create_task : params { title, category ("call"|"email"|"follow_up"|"meeting"), due_date? }
- update_lead_status : params { lead_id, status }
- search_gmail_sent : params {} — liste les emails envoyés récents
- search_gmail_replies : params {} — liste les réponses reçues

Important : ne génère un bloc action QUE si l'utilisateur demande explicitement une action. Pour les questions ou analyses, réponds normalement sans bloc action.`;

    const systemWithSkills = [
      canvasSystemPrompt,
      actionsPrompt,
      skillInstructions ? `## Compétences activées\n${skillInstructions}` : '',
      contextText ? `## Contexte CRM (données réelles du workspace)\n${contextText}` : '',
    ].filter(Boolean).join('\n\n');

    // Hermès detection: complex CRM tasks that need the orchestrator agent
    const hermesKeywords = [
      'campagne', 'campaign', 'séquence', 'sequence', 'envoyer à tous', 'send to all',
      'envoyer des emails', 'send emails', 'enrolle', 'enroll', 'place une campagne',
      'créer une campagne', 'create campaign', 'leads avec site', 'leads with website',
      'tous mes leads', 'all my leads', 'automatise', 'automate',
    ];
    const isHermesTask = !fileToAttach && hermesKeywords.some(kw => trimmed.toLowerCase().includes(kw));

    if (isHermesTask) {
      // Route to Hermès orchestrator and stream steps into chat
      const hermesMsg: Message = { role: 'assistant', content: '' };
      const hermesIdx = history.length;
      setMessages([...history, hermesMsg]);
      setHermesRunning(true);
      setHermesSteps([]);

      try {
        const hRes = await fetch(getApiUrl('/api/agent/hermes'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task: trimmed, workspace_id: workspaceId }),
        });
        if (!hRes.ok) throw new Error(`Hermès ${hRes.status}`);

        const reader2 = hRes.body?.getReader();
        const dec2 = new TextDecoder();
        let hermesOutput = '';
        let steps: typeof hermesSteps = [];

        while (reader2) {
          const { done, value } = await reader2.read();
          if (done) break;
          const chunk = dec2.decode(value);
          for (const line of chunk.split('\n').filter(Boolean)) {
            try {
              const ev = JSON.parse(line) as { type: string; content?: string; tool?: string; params?: any; actions_executed?: number };
              steps = [...steps, ev];
              setHermesSteps([...steps]);

              if (ev.type === 'final') {
                hermesOutput = ev.content || '';
              } else if (ev.type === 'thought') {
                hermesOutput += `*${ev.content}*\n`;
              } else if (ev.type === 'action') {
                hermesOutput += `→ **${ev.tool}**${ev.params ? ': ' + JSON.stringify(ev.params).slice(0, 80) : ''}\n`;
              } else if (ev.type === 'observation') {
                hermesOutput += `✓ ${ev.content}\n`;
              } else if (ev.type === 'error') {
                hermesOutput += `⚠️ Erreur: ${(ev as any).message || 'Erreur inconnue'}\n`;
              }

              setMessages(prev => {
                const updated = [...prev];
                if (updated[hermesIdx]) updated[hermesIdx] = { ...updated[hermesIdx], content: hermesOutput };
                return updated;
              });
            } catch { /* skip malformed lines */ }
          }
        }

        const finalMsg = steps.find(s => s.type === 'final');
        const savedContent = finalMsg?.content || hermesOutput || 'Tâche terminée.';
        await dbSaveMessage(activeSess.id, userId, 'assistant', savedContent);
        setMessages(prev => {
          const updated = [...prev];
          if (updated[hermesIdx]) updated[hermesIdx] = { ...updated[hermesIdx], content: savedContent };
          return updated;
        });
      } catch (err) {
        const errMsg = `Erreur Hermès: ${err instanceof Error ? err.message : String(err)}`;
        setMessages(prev => {
          const updated = [...prev];
          if (updated[hermesIdx]) updated[hermesIdx] = { ...updated[hermesIdx], content: errMsg };
          return updated;
        });
      } finally {
        setHermesRunning(false);
        setIsLoading(false);
      }
      return;
    }

    try {
      // An attached image requires a vision-capable model — auto-use the vision
      // model so the request doesn't fail on a text-only model.
      const hasImage = !!(fileToAttach && fileToAttach.dataUrl);
      const requestModel = hasImage ? 'meta-llama/llama-3.2-11b-vision-instruct:free' : selectedModel.id;
      const requestProviderName = hasImage ? 'openrouter' : selectedModel.provider;

      const res = await fetch(getApiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiHistory,
          model: requestModel,
          provider: requestProviderName,
          activeTool: isCanvasOpen ? 'canvas' : undefined,
          system: systemWithSkills,
        }),
      });

      if (!res.ok || !res.body) throw new Error('API error');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content ?? '';
            assistantContent = assistantContent + delta;
            const contentSnapshot = assistantContent;
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: 'assistant', content: contentSnapshot };
              return updated;
            });
          } catch {}
        }
      }

      // Save assistant response
      if (activeSess) {
        await dbSaveMessage(activeSess.id, userId, 'assistant', assistantContent);
        const sessList = await dbGetSessions(userId, workspaceId);
        setSessions(sessList);

        // For a brand-new session, let the AI craft a concise discussion title
        if (isNewSession && assistantContent.trim()) {
          try {
            const titleRes = await fetch(getApiUrl('/api/chat'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                messages: [{
                  role: 'user',
                  content: `Génère un titre court (3 à 5 mots, sans guillemets ni ponctuation finale) résumant cette conversation.\n\nUtilisateur : ${trimmed}\nAssistant : ${assistantContent.slice(0, 400)}\n\nRéponds uniquement par le titre.`,
                }],
                model: selectedModel.id,
                provider: selectedModel.provider,
              }),
            });
            if (titleRes.ok && titleRes.body) {
              const tReader = titleRes.body.getReader();
              const tDec = new TextDecoder();
              let titleText = '';
              while (true) {
                const { done, value } = await tReader.read();
                if (done) break;
                const chunk = tDec.decode(value, { stream: true });
                for (const line of chunk.split('\n').filter(l => l.startsWith('data: '))) {
                  const d = line.slice(6);
                  if (d === '[DONE]') continue;
                  try { titleText += JSON.parse(d).choices?.[0]?.delta?.content ?? ''; } catch {}
                }
              }
              const cleanTitle = titleText.replace(/["'\n]/g, '').replace(/[.!?]+$/, '').trim().slice(0, 60);
              if (cleanTitle && activeSess) {
                await dbUpdateSessionTitle(workspaceId, activeSess.id, cleanTitle);
                setCurrentSession(prev => prev ? { ...prev, title: cleanTitle } : prev);
                setSessions(await dbGetSessions(userId, workspaceId));
                window.dispatchEvent(new CustomEvent('minerva_assistant_sync'));
              }
            }
          } catch { /* keep fallback title */ }
        }
      }

      // Handle embedded canvas document
      const canvasData = extractCanvasBlock(assistantContent);
      if (canvasData) {
        const docId = generateUniqueId();
        setEditorDocId(docId);
        setCanvasDoc({
          id: docId,
          title: canvasData.title,
          content: canvasData.content,
          lastSaved: t('assistant.just_now')
        });
        await dbSaveCanvasDoc(docId, userId, workspaceId, canvasData.title, canvasData.content);
        const list = await dbGetCanvasDocs(userId, workspaceId);
        setCanvasDocs(list);
        setIsCanvasOpen(true);
      }

    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: locale === 'en' 
          ? 'A communication error occurred. Please try again.' 
          : locale === 'de' 
            ? 'Ein Kommunikationsfehler ist aufgetreten. Bitte versuchen Sie es erneut.' 
            : 'Une erreur de communication est survenue. Veuillez réessayer.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Canvas AI rewrite commands helper
  const handleAiCommand = async (command: string, extra?: string) => {
    setShowAiDropdown(false);

    // Get selected text from TipTap editor
    const { from, to, empty } = editor?.state.selection ?? { from: 0, to: 0, empty: true };
    const selection = empty ? '' : (editor?.state.doc.textBetween(from, to, ' ') ?? '');
    const targetText = selection || editor?.getText() || editorContent;

    if (!targetText.trim()) return;

    setIsAiWorking(true);
    setIsSavedIndicator("assistant.ai_working");

    let instruction = "";
    let systemPrompt = "";

    if (locale === 'en') {
      systemPrompt = "You are an AI-assisted writing tool integrated into a prospecting Canvas. Rewrite or modify the provided text following the received instruction. Do NOT return any introduction, conclusion, explanation, or code blocks. Return ONLY the modified text ready to be inserted.";
      if (command === 'summarize') instruction = "Summarize the text synthetically and structurally.";
      else if (command === 'rephrase') instruction = "Rephrase the text to improve style and clarity.";
      else if (command === 'longer') instruction = "Develop and enrich the text with more details and arguments.";
      else if (command === 'shorter') instruction = "Condense the text to make it more concise.";
      else if (command === 'tone') {
        const toneKey = extra || 'professional';
        let toneName = 'professional';
        if (toneKey === 'professional' || toneKey === 'Professionnel' || toneKey === 'Professional') toneName = 'professional';
        else if (toneKey === 'persuasive' || toneKey === 'Persuasif' || toneKey === 'Persuasive') toneName = 'persuasive';
        else if (toneKey === 'friendly' || toneKey === 'Amical' || toneKey === 'Friendly') toneName = 'friendly';
        instruction = `Rewrite the text adopting a ${toneName} tone.`;
      }
    } else if (locale === 'de') {
      systemPrompt = "Sie sind ein KI-gestütztes Schreibwerkzeug, das in ein Akquisitions-Canvas integriert ist. Schreiben Sie den bereitgestellten Text gemäß der erhaltenen Anweisung neu oder ändern Sie ihn. Geben Sie KEINE Einleitung, keinen Schluss, keine Erklärung oder Code-Blöcke zurück. Geben Sie NUR den geänderten Text zurück, der direkt eingefügt werden kann.";
      if (command === 'summarize') instruction = "Fassen Sie den Text synthetisch und strukturiert zusammen.";
      else if (command === 'rephrase') instruction = "Formulieren Sie den Text um, um Stil und Klarheit zu verbessern.";
      else if (command === 'longer') instruction = "Entwickeln und bereichern Sie den Text mit mehr Details und Argumenten.";
      else if (command === 'shorter') instruction = "Kondensieren Sie den Text, um ihn prägnanter zu machen.";
      else if (command === 'tone') {
        const toneKey = extra || 'professional';
        let toneNameDe = 'professionell';
        if (toneKey === 'persuasive' || toneKey === 'Persuasif' || toneKey === 'Persuasive') toneNameDe = 'überzeugend';
        else if (toneKey === 'friendly' || toneKey === 'Amical' || toneKey === 'Friendly') toneNameDe = 'freundlich';
        instruction = `Schreiben Sie den Text neu und nehmen Sie einen ${toneNameDe} Ton an.`;
      }
    } else {
      systemPrompt = "Tu es un outil d'écriture assistée par IA intégré dans un Canvas de prospection. Réécris ou modifie le texte fourni en suivant l'instruction reçue. Ne renvoie AUCUNE introduction, conclusion, explication, ni de balises de code. Renvoie UNIQUEMENT le texte modifié prêt à être inséré.";
      if (command === 'summarize') instruction = "Résume le texte de façon synthétique et structurée.";
      else if (command === 'rephrase') instruction = "Reformule le texte pour améliorer le style et la clarté.";
      else if (command === 'longer') instruction = "Développe et enrichis le texte avec plus de détails et d'arguments.";
      else if (command === 'shorter') instruction = "Condense le texte pour le rendre plus concis.";
      else if (command === 'tone') {
        const toneKey = extra || 'professional';
        let toneNameFr = 'professionnel';
        if (toneKey === 'persuasive' || toneKey === 'Persuasif' || toneKey === 'Persuasive') toneNameFr = 'persuasif';
        else if (toneKey === 'friendly' || toneKey === 'Amical' || toneKey === 'Friendly') toneNameFr = 'amical';
        instruction = `Réécris le texte en adoptant un ton ${toneNameFr}.`;
      }
    }

    try {
      const res = await fetch(getApiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [
            { 
              role: 'user', 
              content: `${instruction}\n\nTexte à modifier:\n"""\n${targetText}\n"""` 
            }
          ],
          model: selectedModel.id,
          provider: selectedModel.provider,
          system: systemPrompt
        }),
      });

      if (!res.ok || !res.body) throw new Error('API error');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let replacement = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content ?? '';
            replacement += delta;
          } catch {}
        }
      }

      if (selection && editor) {
        editor.chain().focus().deleteSelection().insertContent(replacement.trim()).run();
        handleContentChange(editor.getHTML());
      } else {
        const html = mdToHtml(replacement.trim());
        editor?.commands.setContent(html);
        handleContentChange(html);
      }

    } catch (err) {
      console.error(err);
      setIsSavedIndicator("assistant.ai_error");
    } finally {
      setIsAiWorking(false);
      setIsSavedIndicator("assistant.saved");
    }
  };

  // Simulated Quick Actions
  const QUICK_PROMPTS = [
    { label: t('assistant.chip.pipeline'), key: 'pipeline' },
    { label: t('assistant.chip.email'), key: 'email' },
    { label: t('assistant.chip.priority'), key: 'priority' },
    { label: t('assistant.chip.script'), key: 'script' },
    { label: t('assistant.chip.research'), key: 'research' },
    { label: t('assistant.chip.today'), key: 'today' },
    { label: t('assistant.chip.report'), key: 'report' },
  ];

  const handleQuickPromptClick = (chip: { label: string; key: string }) => {
    const totalLeads = leads?.length || 0;
    const statusCounts = (leads || []).reduce((acc: Record<string, number>, l) => {
      acc[l.status] = (acc[l.status] || 0) + 1;
      return acc;
    }, {});
    const hotLeads = (leads || []).filter(l => l.temperature === 'Hot');
    const topHot = hotLeads[0];
    const niches = (leads || []).map(l => l.niche).filter(Boolean);
    const cities = (leads || []).map(l => l.city).filter(Boolean);
    
    const topNiche = niches.sort((a, b) => niches.filter(v => v === a).length - niches.filter(v => v === b).length).pop() || 
      (locale === 'en' ? 'your industry' : locale === 'de' ? 'Ihre Branche' : 'votre secteur');
    const topCity = cities.sort((a, b) => cities.filter(v => v === a).length - cities.filter(v => v === b).length).pop() || 
      (locale === 'en' ? 'your city' : locale === 'de' ? 'Ihre Stadt' : 'votre ville');
    const wsName = activeWorkspace?.name || 
      (locale === 'en' ? 'this workspace' : locale === 'de' ? 'dieser Workspace' : 'ce workspace');
    
    const overdueLeads = (leads || []).filter(l => l.nextActionDate && l.nextActionDate <= new Date().toISOString().split('T')[0] && l.status !== 'Won' && l.status !== 'Lost');
    const breakdown = Object.entries(statusCounts).map(([s, c]) => `${s}: ${c}`).join(', ');
    const breakdownStr = breakdown || (locale === 'en' ? 'no data' : locale === 'de' ? 'keine Daten' : 'aucune donnée');

    const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
    const dateLoc = locale === 'de' ? 'de-DE' : locale === 'en' ? 'en-US' : 'fr-CA';
    const dateStr = new Date().toLocaleDateString(dateLoc, dateOptions);

    let finalPrompt = '';
    if (locale === 'en') {
      switch (chip.key) {
        case 'pipeline':
          finalPrompt = `Analyze my sales pipeline for the workspace "${wsName}". I have ${totalLeads} total prospects (${breakdownStr}). ${hotLeads.length} leads are "Hot". Give me a 5-point diagnosis and 3 priority actions to improve my conversion rate.`;
          break;
        case 'email':
          if (topHot) {
            finalPrompt = `Write a personalized follow-up email for ${topHot.businessName} (${topHot.niche}, ${topHot.city}). Contact: ${topHot.contactName || 'not specified'}. Next action: "${topHot.nextAction || 'none'}". Tone: professional but warm. Length: max 3 paragraphs.`;
          } else {
            finalPrompt = `Write a cold outreach email for a prospect in the "${topNiche}" industry in ${topCity}. Tone: professional, direct, value-oriented. Max 200 words.`;
          }
          break;
        case 'priority':
          finalPrompt = `Here are my ${totalLeads} CRM prospects (breakdown: ${breakdownStr}). ${hotLeads.length} are "Hot". ${overdueLeads.length} have overdue actions. Identify the top 5 leads to contact first today and explain why each deserves attention.`;
          break;
        case 'script':
          if (topHot) {
            finalPrompt = `Generate a 60-second field pitch script for ${topHot.businessName} (${topHot.niche}, ${topHot.city}). Google rating: ${topHot.rating ?? 'not known'}/5. Include: personalized hook → proposed value → call-to-action question.`;
          } else {
            finalPrompt = `Generate a 60-second field pitch script for a prospect in the "${topNiche}" industry in ${topCity}. Include: hook → value → call-to-action question.`;
          }
          break;
        case 'research':
          finalPrompt = `Do a deep market analysis for "${topNiche}" in ${topCity}. Identify: current trends, common pain points, digital opportunities, typical objections, and how to position our offer against local competition.`;
          break;
        case 'today':
          finalPrompt = `It is ${dateStr}. I have ${overdueLeads.length} overdue actions and ${hotLeads.length} hot leads in the CRM "${wsName}". Suggest an action plan for today: morning / afternoon / end of day with the 3 most important tasks.`;
          break;
        case 'report':
          finalPrompt = `Generate a weekly activity report for the workspace "${wsName}". Data: ${totalLeads} prospects (${breakdownStr}), ${hotLeads.length} Hot leads, ${overdueLeads.length} overdue actions. Format: executive summary → analysis → recommendations → next week's goals.`;
          break;
        default:
          finalPrompt = chip.label;
      }
    } else if (locale === 'de') {
      switch (chip.key) {
        case 'pipeline':
          finalPrompt = `Analysiere meine Vertriebspipeline für den Workspace "${wsName}". Ich habe insgesamt ${totalLeads} Interessenten (${breakdownStr}). ${hotLeads.length} Leads sind "Hot". Gib mir eine 5-Punkte-Diagnose und 3 vorrangige Maßnahmen zur Verbesserung meiner Konversionsrate.`;
          break;
        case 'email':
          if (topHot) {
            finalPrompt = `Schreibe eine personalisierte Follow-up-E-Mail für ${topHot.businessName} (${topHot.niche}, ${topHot.city}). Kontakt: ${topHot.contactName || 'nicht angegeben'}. Nächste Aktion: "${topHot.nextAction || 'keine'}". Ton: professionell, aber warm. Länge: max. 3 Absätze.`;
          } else {
            finalPrompt = `Schreibe eine Kaltakquise-E-Mail für einen Interessenten in der Branche "${topNiche}" in ${topCity}. Ton: professionell, direkt, wertorientiert. Max. 200 Wörter.`;
          }
          break;
        case 'priority':
          finalPrompt = `Hier sind meine ${totalLeads} CRM-Interessenten (Verteilung: ${breakdownStr}). ${hotLeads.length} sind "Hot". ${overdueLeads.length} haben überfällige Aktionen. Identifizieren Sie die 5 wichtigsten Leads, die heute vorrangig kontaktiert werden sollten, und erklären Sie, warum jeder Aufmerksamkeit verdient.`;
          break;
        case 'script':
          if (topHot) {
            finalPrompt = `Erstelle ein 60-Sekunden-Pitch-Skript für {topHot.businessName} (${topHot.niche}, ${topHot.city}). Google-Bewertung: ${topHot.rating ?? 'nicht bekannt'}/5. Enthalten: personalisierter Aufhänger → Mehrwert → Frage zur Terminvereinbarung.`;
          } else {
            finalPrompt = `Erstelle ein 60-Sekunden-Pitch-Skript für einen Interessenten in der Branche "${topNiche}" in ${topCity}. Enthalten: Aufhänger → Mehrwert → Frage zur Terminvereinbarung.`;
          }
          break;
        case 'research':
          finalPrompt = `Erstelle eine eingehende Marktanalyse für "${topNiche}" in ${topCity}. Identifizieren Sie: aktuelle Trends, häufige Schwachstellen, digitale Möglichkeiten, typische Einwände und wie wir unser Angebot gegenüber der lokalen Konkurrenz positionieren können.`;
          break;
        case 'today':
          finalPrompt = `Es ist ${dateStr}. Ich habe ${overdueLeads.length} überfällige Aktionen und ${hotLeads.length} heiße Leads im CRM "${wsName}". Schlagen Sie einen Aktionsplan für heute vor: Vormittag / Nachmittag / Ende des Tages mit den 3 wichtigsten Aufgaben.`;
          break;
        case 'report':
          finalPrompt = `Erstellen Sie einen wöchentlichen Aktivitätsbericht für den Workspace "${wsName}". Daten: ${totalLeads} Interessenten (${breakdownStr}), ${hotLeads.length} Hot-Leads, ${overdueLeads.length} überfällige Aktionen. Format: Executive Summary → Analyse → Empfehlungen → Ziele für die nächste Woche.`;
          break;
        default:
          finalPrompt = chip.label;
      }
    } else {
      // Default (French)
      switch (chip.key) {
        case 'pipeline':
          finalPrompt = `Analyse mon pipeline de vente pour le workspace "${wsName}". J'ai ${totalLeads} prospects au total (${breakdownStr}). ${hotLeads.length} leads sont "Hot". Donne-moi un diagnostic en 5 points et 3 actions prioritaires pour améliorer mon taux de conversion.`;
          break;
        case 'email':
          if (topHot) {
            finalPrompt = `Rédige un email de relance personnalisé pour ${topHot.businessName} (${topHot.niche}, ${topHot.city}). Contact: ${topHot.contactName || 'non précisé'}. Prochaine action: "${topHot.nextAction || 'aucune'}". Ton: professionnel mais chaleureux. Longueur: 3 paragraphes max.`;
          } else {
            finalPrompt = `Rédige un email de prospection à froid pour un prospect dans le secteur "${topNiche}" à ${topCity}. Ton: professionnel, direct, orienté valeur. Max 200 mots.`;
          }
          break;
        case 'priority':
          finalPrompt = `Voici mes ${totalLeads} prospects CRM (répartition: ${breakdownStr}). ${hotLeads.length} sont "Hot". ${overdueLeads.length} ont une action en retard. Identifie les 5 leads à contacter en priorité aujourd'hui et explique pourquoi chacun mérite attention.`;
          break;
        case 'script':
          if (topHot) {
            finalPrompt = `Génère un script de pitch terrain de 60 secondes pour ${topHot.businessName} (${topHot.niche}, ${topHot.city}). Note Google: ${topHot.rating ?? 'non connue'}/5. Inclus: accroche personnalisée → valeur proposée → question pour prendre RDV.`;
          } else {
            finalPrompt = `Génère un script de pitch terrain de 60 secondes pour un prospect dans le secteur "${topNiche}" à ${topCity}. Inclus: accroche → valeur → question pour prendre RDV.`;
          }
          break;
        case 'research':
          finalPrompt = `Fais une analyse approfondie du marché "${topNiche}" à ${topCity}. Identifie: tendances actuelles, points de douleur fréquents, opportunités digitales, objections typiques, et comment positionner notre offre face à la concurrence locale.`;
          break;
        case 'today':
          finalPrompt = `C'est le ${dateStr}. J'ai ${overdueLeads.length} actions en retard et ${hotLeads.length} leads chauds dans le CRM "${wsName}". Propose-moi un plan d'action pour aujourd'hui: matin / après-midi / fin de journée avec les 3 tâches les plus importantes.`;
          break;
        case 'report':
          finalPrompt = `Génère un rapport d'activité hebdomadaire pour le workspace "${wsName}". Données: ${totalLeads} prospects (${breakdownStr}), ${hotLeads.length} leads Hot, ${overdueLeads.length} actions en retard. Format: résumé exécutif → analyse → recommandations → objectifs semaine prochaine.`;
          break;
        default:
          finalPrompt = chip.label;
      }
    }
    handleSend(finalPrompt);
  };

  // File Upload Handler
  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    if (file.type.startsWith('image/')) {
      // Image → data URL, sent to vision-capable models
      reader.onload = (event) => {
        setAttachedFile({ name: file.name, type: file.type, dataUrl: (event.target?.result as string) || '' });
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = (event) => {
        setAttachedFile({ name: file.name, type: file.type || 'text/plain', content: (event.target?.result as string) || '' });
      };
      reader.readAsText(file);
    }
  };

  // Real browser SpeechRecognition integration
  const startRecording = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("La dictée vocale n'est pas supportée par votre navigateur.");
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.lang = 'fr-FR';
      rec.interimResults = true;
      rec.continuous = true;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        setIsRecording(true);
      };

      rec.onresult = (event: any) => {
        const text = Array.from(event.results)
          .map((res: any) => res[0].transcript)
          .join('');
        setInput(text);
      };

      rec.onerror = (e: any) => {
        console.error("Speech recognition error:", e);
        setIsRecording(false);
        if (e.error === 'not-allowed') {
          toast.error("Accès au microphone refusé.");
        }
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recordingIntervalRef.current = rec;
      rec.start();
    } catch (err) {
      console.error(err);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (recordingIntervalRef.current && typeof recordingIntervalRef.current.stop === 'function') {
      recordingIntervalRef.current.stop();
    }
  };

  // Copy document text
  const copyToClipboard = () => {
    navigator.clipboard.writeText(editor?.getText() || editorContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Formatting helpers
  const wrapSelectedText = (tag: 'b' | 'i') => {
    if (!editor) return;
    if (tag === 'b') editor.chain().focus().toggleBold().run();
    if (tag === 'i') editor.chain().focus().toggleItalic().run();
    handleContentChange(editor.getHTML());
  };

  const insertHeading = (level: string) => {
    if (!editor) return;
    if (level === 'normal') {
      editor.chain().focus().setParagraph().run();
    } else if (level === 'h1') {
      editor.chain().focus().toggleHeading({ level: 1 }).run();
    } else if (level === 'h2') {
      editor.chain().focus().toggleHeading({ level: 2 }).run();
    } else if (level === 'h3') {
      editor.chain().focus().toggleHeading({ level: 3 }).run();
    }
    setHeadingFormat(level);
    handleContentChange(editor.getHTML());
  };

  // Export functions
  const handleExport = (format: 'markdown' | 'txt' | 'html') => {
    setShowExportDropdown(false);
    const link = document.createElement('a');
    let mime = 'text/plain';
    let ext = 'txt';
    let data = editorContent;

    if (format === 'markdown') {
      mime = 'text/markdown';
      ext = 'md';
      data = editorContent;
    } else if (format === 'txt') {
      mime = 'text/plain';
      ext = 'txt';
      data = editor?.getText() || editorContent;
    } else if (format === 'html') {
      mime = 'text/html';
      ext = 'html';
      const htmlBody = editor?.getHTML() || editorContent;
      data = `<html><head><meta charset="UTF-8"><title>${editorTitle}</title><style>body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.7;color:#26251e}h1,h2,h3{font-weight:700}</style></head><body><h1>${editorTitle}</h1>${htmlBody}</body></html>`;
    }

    const blob = new Blob([data], { type: mime });
    link.href = URL.createObjectURL(blob);
    link.download = `${editorTitle.toLowerCase().replace(/\s+/g, '-') || 'document'}.${ext}`;
    link.click();

    // Prompt to save to Library
    setLastExportedContent({ title: editorTitle, content: editorContent });
    setShowSaveToLibraryPrompt(true);
  };

  const handleSaveToLibrary = async () => {
    if (!lastExportedContent || !user?.id || !activeWorkspace?.id) return;
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      await supabase.from('library_documents').insert({
        user_id: user.id,
        workspace_id: activeWorkspace.id,
        type: 'markdown',
        title: lastExportedContent.title,
        content: lastExportedContent.content,
        is_shared: false,
        folder_name: libraryFolderName || null,
      });
    } catch {
      // Library table may not exist yet — silent fail
    }
    setShowSaveToLibraryPrompt(false);
  };

  const handleDirectSaveToLibrary = async () => {
    if (!user?.id || !activeWorkspace?.id) return;
    const content = editor?.getHTML() || editorContent;
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      await supabase.from('library_documents').insert({
        user_id: user.id,
        workspace_id: activeWorkspace.id,
        type: 'markdown',
        title: editorTitle || t('assistant.untitled_doc'),
        content,
        is_shared: false,
        folder_name: libraryFolderName || null,
      });
    } catch {
      // silent fail
    }
    setShowLibraryDropdown(false);
  };

  return (
    <div className="h-full w-full flex overflow-hidden bg-[#f7f7f4] relative select-none">
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleUp {
          from {
            opacity: 0;
            transform: scale(0.96);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
        .animate-scale-up {
          animation: scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes shimmer {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
      `}</style>
      
      {/* ── LEFT PANEL: CHAT INTERFACE & SIDEBAR ── */}
      {/* When canvas is floating (détaché) the chat takes full width */}
      <div className={`flex h-full bg-white transition-all duration-300 relative overflow-hidden ${
        (isCanvasOpen && !isCanvasFloating) ? 'w-full md:w-[40%] border-r border-[#e6e5e0]' : 'w-full'
      }`}>
        
        {/* collapsible sidebar for thread/canvas doc history — auto-collapse when canvas opens */}
        {isHistoryOpen && !isCanvasOpen && (
          <div className="w-56 bg-[#fafaf9] border-r border-[#e6e5e0]/60 flex flex-col h-full shrink-0 select-none animate-fade-in">
            {/* Sidebar header */}
            <div className="h-14 border-b border-[#e6e5e0]/60 px-4 flex items-center justify-between shrink-0 bg-[#fafaf9]">
              <span className="text-[10px] font-extrabold text-[#26251e] tracking-wider uppercase">{t('assistant.history')}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearChat}
                className="h-7 w-7 rounded-full p-0 text-[#7a7a76] hover:text-[#10b981] transition-colors border border-transparent hover:border-neutral-200"
                title={t('assistant.new_chat')}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Scrollable list of items */}
            <div className="flex-1 overflow-y-auto p-2 space-y-4">
              {/* Discussions list */}
              <div className="space-y-1">
                <div className="px-2 text-[8px] font-bold text-[#7a7a76] uppercase tracking-wider">{t('assistant.discussions')}</div>
                {sessions.length === 0 ? (
                  <div className="px-2 py-1.5 text-[9px] text-[#807d72] italic font-semibold">{t('assistant.no_discussions')}</div>
                ) : (
                  sessions.map((sess) => (
                    <div
                      key={sess.id}
                      className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 cursor-pointer text-[10px] font-bold transition-all relative ${
                        currentSession?.id === sess.id
                          ? 'bg-emerald-50/70 text-emerald-800'
                          : 'text-[#555552] hover:bg-neutral-100 hover:text-[#26251e]'
                      }`}
                    >
                      {sess.pinned && <Pin className="h-2.5 w-2.5 text-amber-500 shrink-0" />}
                      <button
                        onClick={async () => {
                          setCurrentSession(sess);
                          localStorage.setItem(`minerva_active_sess_${workspaceId}`, sess.id);
                          const msgs = await dbGetMessages(sess.id);
                          setMessages(msgs);
                        }}
                        className="flex-1 text-left truncate"
                      >
                        {sess.title}
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          await dbToggleSessionPin(sess.id, !sess.pinned);
                          const sessList = await dbGetSessions(userId, workspaceId);
                          setSessions(sessList);
                          window.dispatchEvent(new CustomEvent('minerva_assistant_sync'));
                        }}
                        className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-amber-500 transition-opacity p-0.5"
                        title={sess.pinned ? t('assistant.unpin') : t('assistant.pin')}
                      >
                        {sess.pinned ? <PinOff className="h-2.5 w-2.5" /> : <Pin className="h-2.5 w-2.5" />}
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          await dbDeleteSession(workspaceId, sess.id);
                          const sessList = await dbGetSessions(userId, workspaceId);
                          setSessions(sessList);
                          if (currentSession?.id === sess.id) {
                            setCurrentSession(null);
                            setMessages([]);
                            localStorage.removeItem(`minerva_active_sess_${workspaceId}`);
                          }
                          window.dispatchEvent(new CustomEvent('minerva_assistant_sync'));
                        }}
                        className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-600 transition-opacity p-0.5"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Documents list */}
              <div className="space-y-1">
                <div className="px-2 text-[8px] font-bold text-[#7a7a76] uppercase tracking-wider">{t('assistant.canvas_docs')}</div>
                {canvasDocs.length === 0 ? (
                  <div className="px-2 py-1.5 text-[9px] text-[#807d72] italic font-semibold">{t('assistant.no_docs')}</div>
                ) : (
                  canvasDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className={`group flex items-center justify-between rounded-lg px-2 py-1.5 cursor-pointer text-[10px] font-bold transition-all relative ${
                        canvasDoc?.id === doc.id 
                          ? 'bg-emerald-50/70 text-emerald-800' 
                          : 'text-[#555552] hover:bg-neutral-100 hover:text-[#26251e]'
                      }`}
                    >
                      <button
                        onClick={() => {
                          setCanvasDoc({
                            id: doc.id,
                            title: doc.title,
                            content: doc.content,
                            lastSaved: t('assistant.saved')
                          });
                          setEditorTitle(doc.title);
                          setEditorContent(doc.content);
                          setEditorDocId(doc.id);
                          setIsCanvasOpen(true);
                        }}
                        className="flex-1 text-left truncate pr-1 flex items-center gap-1.5"
                      >
                        <FileText className="h-3 w-3 text-neutral-400 shrink-0" />
                        <span className="truncate">{doc.title}</span>
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          await dbDeleteCanvasDoc(workspaceId, doc.id);
                          const docsList = await dbGetCanvasDocs(userId, workspaceId);
                          setCanvasDocs(docsList);
                          if (canvasDoc?.id === doc.id) {
                            setCanvasDoc(null);
                            setEditorDocId('');
                            setEditorTitle("");
                            setEditorContent("");
                            localStorage.removeItem(`minerva_active_canvas_${workspaceId}`);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-600 transition-opacity p-0.5"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Chat Feed Panel */}
        <div className="flex-1 flex flex-col h-full min-w-0 bg-white relative">
          
          {/* Header toolbar */}
          <header className="h-14 border-b border-[#e6e5e0]/60 px-4 flex items-center justify-between shrink-0 bg-white z-10">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                className={`h-7 w-7 rounded-full p-0 transition-colors border border-transparent ${
                  isHistoryOpen ? 'text-[#10b981] bg-emerald-50/70 border-emerald-100' : 'text-[#7a7a76] hover:text-[#059669] hover:border-neutral-200'
                }`}
                title={t('assistant.history')}
              >
                <History className="w-3.5 h-3.5" />
              </Button>
              <div className="h-6 w-6 rounded-md bg-[#10b981]/15 flex items-center justify-center shrink-0 overflow-hidden">
                <img src="/icon-512.png" className="h-5 w-5 rounded object-cover" alt="Minerva" />
              </div>
              <span className="text-xs font-bold text-[#26251e]">Minerva AI Assistant</span>
              {currentSession && (
                <span className="text-[10px] text-[#7a7a76] font-bold truncate max-w-[150px] border-l border-neutral-200 pl-2">
                  {currentSession.title}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearChat}
                className="text-[10px] h-7 font-bold text-[#7a7a76] hover:text-[#10b981] gap-1 rounded-full px-2.5 transition-colors border border-transparent hover:border-neutral-100"
                title={t('assistant.new_chat')}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('assistant.new')}</span>
              </Button>
            </div>
          </header>

          {/* Message Feed / Chat Window */}
          <div className="flex-1 overflow-y-auto min-h-0 bg-white">
            {messages.length === 0 ? (
              /* Claude-style landing composer */
              (() => {
                const hour = new Date().getHours();
                const greetingHello = hour < 12 ? 'Bonjour' : hour < 17 ? 'Bon après-midi' : 'Bonsoir';
                const hotLeads = leads.filter(l => l.temperature === 'Hot').length;
                const newLeads = leads.filter(l => l.status === 'New').length;
                const openTasks = tasks.filter(t => !t.completed).length;
                const greetingContext = hotLeads > 3
                  ? `${hotLeads} leads chauds prêts à convertir — c'est le moment d'agir.`
                  : hotLeads > 0
                  ? `${hotLeads} lead${hotLeads > 1 ? 's chauds' : ' chaud'} à contacter en priorité.`
                  : openTasks > 5
                  ? `${openTasks} tâches ouvertes — je peux vous aider à prioriser.`
                  : newLeads > 0
                  ? `${newLeads} nouveau${newLeads > 1 ? 'x' : ''} lead${newLeads > 1 ? 's' : ''} dans le pipeline.`
                  : leads.length > 0
                  ? `Pipeline à jour · ${leads.length} leads suivis.`
                  : 'Votre espace commercial est prêt.';
                return (
              <div className="flex flex-col items-center justify-center min-h-full px-6 animate-scale-up" style={{ paddingTop: '6vh', paddingBottom: '4vh', gap: '1.5rem' }}>

                {/* Personalized greeting */}
                <div className="text-center space-y-2 animate-fade-in-up">
                  <div className="flex items-center justify-center mb-3">
                    <div className="h-14 w-14 rounded-2xl overflow-hidden shadow-md border border-[#e5e5e0]">
                      <img src="/icon-512.png" className="h-full w-full object-cover" alt="Minerva" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-black text-[#26251e]">{greetingHello} 👋</h2>
                  <p className="text-sm text-[#7a7a76] font-medium">{greetingContext}</p>
                </div>

                {/* Claude-style composer card */}
                <div className="w-full max-w-[680px]">
                  <div className="w-full border border-[#e0e0dc] rounded-3xl bg-white shadow-md hover:shadow-lg transition-shadow flex flex-col focus-within:border-[#d0d0cc] relative z-20">

                    {/* Attached file preview */}
                    {attachedFile && (
                      <div className="flex items-center justify-between bg-[#fafaf9] border-b border-[#e6e5e0]/60 px-4 py-2.5 text-xs rounded-t-3xl">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-[#059669] shrink-0" />
                          <span className="font-bold text-[#26251e] truncate">{attachedFile.name}</span>
                        </div>
                        <button onClick={() => setAttachedFile(null)} className="text-neutral-400 hover:text-[#26251e] p-0.5">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Main text area */}
                    <textarea
                      value={input}
                      onChange={(e) => {
                        const v = e.target.value;
                        setInput(v);
                        const atIdx = v.lastIndexOf('@');
                        setShowAtMenu(atIdx !== -1 && (atIdx === 0 || v[atIdx - 1] === ' ') && !/\s/.test(v.slice(atIdx + 1)));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') { setShowAtMenu(false); return; }
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); setShowAtMenu(false); handleSend(); }
                      }}
                      placeholder="Comment puis-je vous aider aujourd'hui ?"
                      rows={3}
                      className="w-full resize-none text-[15px] text-[#26251e] bg-transparent outline-none placeholder:text-neutral-400 px-5 pt-5 pb-2 border-0 min-h-[80px] max-h-52 overflow-y-auto"
                    />

                    {/* @ menu */}
                    {showAtMenu && (
                      <div className="absolute bottom-full left-3 right-3 mb-2 bg-white border border-[#e5e5e0] rounded-xl shadow-lg z-20 max-h-56 overflow-y-auto py-1">
                        <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-[#7a7a76] border-b border-[#e5e5e0]/60">{t('assistant.skills_active_header')}</div>
                        {enabledSkills.map(sk => (
                          <button key={sk.id} type="button" onMouseDown={e => { e.preventDefault(); setActiveSkillIds(prev => prev.includes(sk.id) ? prev : [...prev, sk.id]); setInput(prev => prev.replace(/@\S*$/, '').trimEnd()); setShowAtMenu(false); }} className="w-full flex items-start gap-2.5 px-3 py-2 text-left hover:bg-[#f4f4f3]">
                            <Sparkles className="h-3.5 w-3.5 text-[#059669] shrink-0 mt-0.5" />
                            <div><p className="text-xs font-semibold text-[#26251e]">{sk.name}</p><p className="text-[10px] text-[#7a7a76] truncate">{sk.description}</p></div>
                          </button>
                        ))}
                        <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-[#7a7a76] border-y border-[#e5e5e0]/60 mt-1">{t('assistant.crm_context_header')}</div>
                        {CRM_CONTEXTS.map(ctx => (
                          <button key={ctx.id} type="button" onMouseDown={e => { e.preventDefault(); setActiveContextIds(prev => prev.includes(ctx.id) ? prev : [...prev, ctx.id]); setInput(prev => prev.replace(/@\S*$/, '').trimEnd()); setShowAtMenu(false); }} className="w-full flex items-start gap-2.5 px-3 py-2 text-left hover:bg-[#f4f4f3]">
                            <Database className="h-3.5 w-3.5 text-[#26251e] shrink-0 mt-0.5" />
                            <p className="text-xs font-semibold text-[#26251e]">{ctx.label}</p>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Active skill/context chips */}
                    {(activeSkillIds.length > 0 || activeContextIds.length > 0) && (
                      <div className="flex flex-wrap gap-1.5 px-4 pb-2">
                        {activeSkillIds.map(id => { const sk = enabledSkills.find(s => s.id === id); if (!sk) return null; return (
                          <span key={id} className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#059669]/10 text-[#059669] border border-[#059669]/20">
                            <Sparkles className="h-2.5 w-2.5" />{sk.name}
                            <button onClick={() => setActiveSkillIds(prev => prev.filter(x => x !== id))}><X className="h-2.5 w-2.5" /></button>
                          </span>
                        ); })}
                        {activeContextIds.map(id => { const ctx = CRM_CONTEXTS.find(c => c.id === id); if (!ctx) return null; return (
                          <span key={id} className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-[#26251e] border border-neutral-200">
                            <Database className="h-2.5 w-2.5" />{ctx.label}
                            <button onClick={() => setActiveContextIds(prev => prev.filter(x => x !== id))}><X className="h-2.5 w-2.5" /></button>
                          </span>
                        ); })}
                      </div>
                    )}

                    {/* Bottom row — Claude style */}
                    <div className="flex items-center justify-between px-4 pb-4 pt-1">
                      <div className="flex items-center gap-2">
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".txt,.md,.json,.csv,.js,.ts,image/*" />
                        <button onClick={triggerFileUpload} className="h-8 w-8 rounded-full border border-[#e0e0dc] bg-white hover:bg-[#f4f4f3] text-[#7a7a76] flex items-center justify-center transition-colors" title={t('assistant.attach_file')}>
                          <Plus className="h-4 w-4" />
                        </button>
                        <button onClick={() => setIsCanvasOpen(!isCanvasOpen)} className={`h-8 px-3 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition-colors ${isCanvasOpen ? 'bg-[#059669]/10 text-[#059669] border-[#059669]/30' : 'border-[#e0e0dc] bg-white text-[#7a7a76] hover:bg-[#f4f4f3]'}`}>
                          <FileText className="h-3.5 w-3.5" /><span>Canvas</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Model selector — shows short name like "Sonnet 4.6" */}
                        <div className="relative">
                          <button onClick={() => setShowModelDropdown(!showModelDropdown)} className="h-8 px-3 rounded-full border border-[#e0e0dc] bg-white hover:bg-[#f4f4f3] flex items-center gap-1.5 text-xs font-semibold text-[#555552] transition-colors">
                            <span>{selectedModel.name.split(' ').slice(0, 2).join(' ')}</span>
                            <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
                          </button>
                          {showModelDropdown && (
                            <div className="absolute right-0 bottom-10 z-50 bg-white border border-[#e6e5e0] rounded-xl py-1 shadow-lg w-52 animate-scale-up">
                              <div className="px-3 py-1 text-[8px] font-bold text-[#7a7a76] uppercase tracking-wider">{t('assistant.models_title')}</div>
                              {AI_MODELS.map(model => (
                                <button key={model.id} onClick={() => { setSelectedModel(model); setShowModelDropdown(false); }} className={`w-full text-left px-3 py-1.5 text-[10px] font-bold flex items-center justify-between hover:bg-neutral-50 ${selectedModel.id === model.id ? 'text-[#059669]' : 'text-[#26251e]'}`}>
                                  <span>{model.name}</span>
                                  {selectedModel.id === model.id && <Check className="h-3 w-3" />}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Voice / waveform button */}
                        <button onClick={isRecording ? stopRecording : startRecording} className={`h-8 w-8 rounded-full border flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 text-white border-red-500 animate-pulse' : 'border-[#e0e0dc] bg-white text-[#7a7a76] hover:bg-[#f4f4f3]'}`} title={isRecording ? t('assistant.stop_recording') : t('assistant.voice_msg')}>
                          <Mic className="h-4 w-4" />
                        </button>

                        {/* Send */}
                        <button onClick={() => handleSend()} disabled={isLoading || (!input.trim() && !attachedFile)} className="h-8 w-8 rounded-full bg-[#26251e] hover:bg-[#3a3930] disabled:opacity-30 text-white flex items-center justify-center transition-all shadow-sm active:scale-95">
                          <ArrowUp className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Category chips — below the card like Claude */}
                <div className="flex flex-wrap justify-center gap-2 max-w-[680px] animate-fade-in-up">
                  {QUICK_PROMPTS.map((chip) => {
                    const ICONS: Record<string, React.ElementType> = {
                      pipeline: TrendingUp, email: Mail, priority: Star,
                      script: MessageSquare, research: Globe, today: Sparkles, report: BarChart3,
                    };
                    const Icon = ICONS[chip.key] ?? Zap;
                    return (
                      <button key={chip.label} onClick={() => handleQuickPromptClick(chip)} className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#e0e0dc] bg-white hover:bg-[#f4f4f3] hover:border-[#c0c0bc] transition-all text-[12px] font-semibold text-[#555552] hover:text-[#26251e] shadow-sm active:scale-[0.97]">
                        <Icon className="h-3.5 w-3.5" />
                        {chip.label}
                      </button>
                    );
                  })}
                </div>

              </div>
            ); })()
            ) : (
              /* Active message feed container */
              <div className="p-4 space-y-6">
                {messages.map((msg, i) => (
                  <React.Fragment key={i}>
                    {checkpoints.includes(i) && (
                      <div className="flex items-center gap-2 py-2">
                        <div className="flex-1 border-t border-dashed border-[#059669]/40" />
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 border border-emerald-200 rounded-full">
                          <Bookmark className="h-3 w-3 text-[#059669]" />
                          <span className="text-[9px] font-bold text-[#059669]">{t('assistant.checkpoint_label')}</span>
                          <button
                            onClick={() => setMessages(prev => prev.slice(0, i))}
                            className="text-[9px] font-bold text-[#059669] underline hover:no-underline ml-1"
                          >
                            {t('assistant.checkpoint_restore')}
                          </button>
                        </div>
                        <div className="flex-1 border-t border-dashed border-[#059669]/40" />
                      </div>
                    )}
                    <div
                      className={`group relative flex gap-3 max-w-[85%] animate-fade-in-up ${
                        msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                      }`}
                    >
                      {msg.role === 'assistant' ? (
                        <div className="h-7 w-7 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0 mt-0.5 overflow-hidden">
                          <img src="/icon-512.png" className="h-6 w-6 rounded object-cover" alt="Minerva" />
                        </div>
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-[#26251e] text-white flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5 select-none">
                          U
                        </div>
                      )}

                      <div className={`rounded-2xl px-4 py-2.5 shadow-none ${
                        msg.role === 'user'
                          ? 'bg-neutral-50 text-[#26251e] border border-[#e6e5e0] rounded-tr-none'
                          : 'bg-white text-[#26251e] rounded-tl-none border-0'
                      }`}>
                        {renderMessageContent(msg, i)}
                      </div>

                      {msg.role === 'assistant' && (
                        <button
                          onClick={() => setCheckpoints(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}
                          className="absolute -right-8 top-1 opacity-0 group-hover:opacity-100 h-6 w-6 rounded-full bg-white border border-neutral-200 hover:border-[#059669] hover:text-[#059669] text-neutral-400 flex items-center justify-center transition-all"
                          title={t('assistant.checkpoint_title')}
                        >
                          <Bookmark className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </React.Fragment>
                ))}

                {isLoading && (
                  <div className="flex gap-3 max-w-[85%] mr-auto items-center">
                    <div className="h-7 w-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 overflow-hidden">
                      <img src="/icon-512.png" className="h-6 w-6 rounded object-cover animate-pulse" alt="Minerva" />
                    </div>
                    <div className="bg-white border-0 rounded-2xl rounded-tl-none px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#7a7a76]" style={{
                          background: 'linear-gradient(90deg, #059669 0%, #10b981 50%, #059669 100%)',
                          backgroundSize: '200% auto',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          animation: 'shimmer 1.5s linear infinite',
                        }}>{t('assistant.thinking')}</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Bar at bottom if chat has messages */}
          {messages.length > 0 && (
            <div className="border-t border-[#e6e5e0]/60 p-4 shrink-0 bg-white z-10">
              <div className="max-w-2xl mx-auto border border-[#e6e5e0] rounded-2xl bg-white shadow-sm flex flex-col p-2 space-y-2 focus-within:border-[#10b981] transition-colors relative">
                {attachedFile && (
                  <div className="flex items-center justify-between bg-[#fafaf9] border border-[#e6e5e0]/60 px-3 py-1.5 rounded-xl text-xs animate-fade-in">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-3.5 w-3.5 text-[#10b981] shrink-0" />
                      <span className="font-bold text-[#26251e] truncate">{attachedFile.name}</span>
                      <span className="text-[10px] text-neutral-400 uppercase font-semibold shrink-0">
                        {attachedFile.content ? t('assistant.extracted_content') : t('assistant.document')}
                      </span>
                    </div>
                    <button
                      onClick={() => setAttachedFile(null)}
                      className="text-neutral-400 hover:text-[#26251e] p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}

                {/* Active skill + context chips */}
                {(activeSkillIds.length > 0 || activeContextIds.length > 0) && (
                  <div className="flex flex-wrap gap-1.5 px-1">
                    {activeSkillIds.map(id => {
                      const sk = enabledSkills.find(s => s.id === id);
                      if (!sk) return null;
                      return (
                        <span key={id} className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#059669]/10 text-[#059669] border border-[#059669]/20">
                          <Sparkles className="h-2.5 w-2.5" />
                          {sk.name}
                          <button onClick={() => setActiveSkillIds(prev => prev.filter(x => x !== id))} className="hover:opacity-70">
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </span>
                      );
                    })}
                    {activeContextIds.map(id => {
                      const ctx = CRM_CONTEXTS.find(c => c.id === id);
                      if (!ctx) return null;
                      return (
                        <span key={id} className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#26251e]/8 text-[#26251e] border border-[#26251e]/15">
                          <Database className="h-2.5 w-2.5" />
                          {ctx.label}
                          <button onClick={() => setActiveContextIds(prev => prev.filter(x => x !== id))} className="hover:opacity-70">
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* @ skills menu */}
                {showAtMenu && (
                  <div className="absolute bottom-full left-3 right-3 mb-2 bg-white border border-[#e5e5e0] rounded-xl shadow-lg z-20 max-h-56 overflow-y-auto py-1">
                    <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-[#7a7a76] border-b border-[#e5e5e0]/60">
                      {t('assistant.skills_active_header')}
                    </div>
                    {enabledSkills.length === 0 ? (
                      <div className="px-3 py-2 text-[11px] text-[#7a7a76]">
                        {t('assistant.skills_none')}
                      </div>
                    ) : enabledSkills.map(sk => (
                      <button
                        key={sk.id}
                        type="button"
                        onMouseDown={e => {
                          e.preventDefault();
                          setActiveSkillIds(prev => prev.includes(sk.id) ? prev : [...prev, sk.id]);
                          setInput(prev => prev.replace(/@\S*$/, '').trimEnd());
                          setShowAtMenu(false);
                        }}
                        className="w-full flex items-start gap-2.5 px-3 py-2 text-left hover:bg-[#f4f4f3] transition-colors"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-[#059669] shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[#26251e]">{sk.name}</p>
                          <p className="text-[10px] text-[#7a7a76] truncate">{sk.description}</p>
                        </div>
                      </button>
                    ))}
                    <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-[#7a7a76] border-y border-[#e5e5e0]/60 mt-1">
                      {t('assistant.crm_context_header')}
                    </div>
                    {CRM_CONTEXTS.map(ctx => (
                      <button
                        key={ctx.id}
                        type="button"
                        onMouseDown={e => {
                          e.preventDefault();
                          setActiveContextIds(prev => prev.includes(ctx.id) ? prev : [...prev, ctx.id]);
                          setInput(prev => prev.replace(/@\S*$/, '').trimEnd());
                          setShowAtMenu(false);
                        }}
                        className="w-full flex items-start gap-2.5 px-3 py-2 text-left hover:bg-[#f4f4f3] transition-colors"
                      >
                        <Database className="h-3.5 w-3.5 text-[#26251e] shrink-0 mt-0.5" />
                        <p className="text-xs font-semibold text-[#26251e]">{ctx.label}</p>
                      </button>
                    ))}
                  </div>
                )}

                <textarea
                  value={input}
                  onChange={(e) => {
                    const v = e.target.value;
                    setInput(v);
                    const atIdx = v.lastIndexOf('@');
                    setShowAtMenu(atIdx !== -1 && (atIdx === 0 || v[atIdx - 1] === ' ') && !/\s/.test(v.slice(atIdx + 1)));
                  }}
                  onKeyDown={(e) => { if (e.key === 'Escape') { setShowAtMenu(false); return; } if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); setShowAtMenu(false); handleSend(); } }}
                  placeholder={t('assistant.input_placeholder')}
                  rows={1}
                  className="w-full resize-none text-xs font-semibold text-[#26251e] bg-transparent outline-none placeholder:text-neutral-400 px-2 min-h-[24px] max-h-32 border-0 overflow-y-auto"
                />

                {/* Input Card actions */}
                <div className="flex items-center justify-between border-t border-neutral-100/60 pt-2 shrink-0">
                  <div className="flex items-center gap-1">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      className="hidden" 
                      accept=".txt,.md,.json,.csv,.js,.ts,image/*"
                    />
                    <button 
                      onClick={triggerFileUpload}
                      className="h-6 w-6 rounded-full bg-neutral-50 hover:bg-neutral-100 text-[#555552] flex items-center justify-center cursor-pointer transition-colors border border-transparent"
                      title={t('assistant.attach_file')}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={() => setIsCanvasOpen(!isCanvasOpen)}
                      className={`h-6 px-2.5 rounded-full flex items-center gap-1 text-[9px] font-bold transition-all border ${
                        isCanvasOpen 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-neutral-50 hover:bg-neutral-100 text-[#555552] border-transparent'
                      }`}
                    >
                      <FileText className="h-3 w-3" />
                      <span>Canvas</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div className="relative">
                      <button
                        onClick={() => setShowModelDropdown(!showModelDropdown)}
                        className="h-6 px-2 rounded-full bg-neutral-50 hover:bg-neutral-100 border border-neutral-100/60 text-[#555552] flex items-center gap-1 text-[9px] font-bold cursor-pointer transition-colors"
                      >
                        <Globe className="h-3 w-3 text-neutral-400" />
                        <span>{selectedModel.name}</span>
                        <ChevronDown className="h-2.5 w-2.5" />
                      </button>

                      {showModelDropdown && (
                        <div className="absolute right-0 bottom-7 z-50 bg-white border border-[#e6e5e0] rounded-xl py-1 shadow-lg w-48 text-left animate-scale-up">
                          {AI_MODELS.map((model) => (
                            <button
                              key={model.id}
                              onClick={() => {
                                setSelectedModel(model);
                                setShowModelDropdown(false);
                              }}
                              className={`w-full text-left px-3 py-1.5 text-[9.5px] font-bold flex items-center justify-between hover:bg-neutral-50 ${
                                selectedModel.id === model.id ? 'text-[#10b981]' : 'text-[#26251e]'
                              }`}
                            >
                              <span>{model.name}</span>
                              {selectedModel.id === model.id && <Check className="h-2.5 w-2.5" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`h-6 w-6 rounded-full flex items-center justify-center cursor-pointer transition-all border ${
                        isRecording 
                          ? 'bg-red-500 text-white border-red-500 animate-pulse' 
                          : 'bg-neutral-50 hover:bg-neutral-100 text-[#555552] border-transparent'
                      }`}
                      title={isRecording ? t('assistant.stop_recording') : t('assistant.voice_msg')}
                    >
                      <Mic className="h-3 w-3" />
                    </button>

                    <button
                      onClick={() => handleSend()}
                      disabled={isLoading}
                      className="h-6 w-6 rounded-full bg-[#10b981] hover:bg-[#059669] text-white flex items-center justify-center cursor-pointer transition-all shadow-sm disabled:opacity-50"
                      title={t('assistant.send')}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL: CANVAS DOCUMENT EDITOR (SPLIT VIEW) ── */}
      {isCanvasOpen && (
        <div
          className={`bg-white flex flex-col z-50 transition-all duration-300 animate-scale-up ${
            isCanvasFloating
              ? ''
              : 'h-full fixed inset-0 md:relative md:flex-grow md:flex md:w-[60%] border-t border-[#e6e5e0] md:border-t-0'
          }`}
          style={isCanvasFloating ? {
            position: 'fixed',
            top: canvasFloatPos.y,
            left: canvasFloatPos.x,
            width: 720,
            maxHeight: '90vh',
            borderRadius: 16,
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            zIndex: 200,
            border: '1px solid #e6e5e0',
            overflow: 'hidden',
          } : undefined}
        >
          
          {/* Canvas editor Header toolbar */}
          <header
            className="h-14 border-b border-[#e6e5e0]/60 px-4 flex items-center justify-between bg-white shrink-0"
            style={isCanvasFloating ? { cursor: 'move', userSelect: 'none' } : undefined}
            onPointerDown={isCanvasFloating ? handleCanvasPointerDown : undefined}
            onPointerMove={isCanvasFloating ? handleCanvasPointerMove : undefined}
            onPointerUp={isCanvasFloating ? handleCanvasPointerUp : undefined}
          >
            <div className="flex items-center gap-3 min-w-0">
              <button 
                onClick={() => setIsCanvasOpen(false)}
                className="h-7 w-7 rounded-full hover:bg-neutral-100 flex items-center justify-center border border-transparent text-[#555552] hover:text-[#26251e]"
                title={t('assistant.canvas_close')}
              >
                <X className="h-4 w-4" />
              </button>

              <div className="min-w-0 pr-2">
                <input
                  type="text"
                  value={editorTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="font-serif font-bold text-sm tracking-tight text-[#26251e] bg-transparent border-0 outline-none w-full p-0 leading-tight focus:ring-0 focus:border-0 focus:outline-none"
                  placeholder={t('assistant.untitled_doc')}
                />
                <p className="text-[9px] text-[#807d72] font-semibold tracking-wide">
                  {isSavedIndicator.startsWith('assistant.') ? t(isSavedIndicator as any) : isSavedIndicator}
                </p>
              </div>
            </div>

            {/* Canvas Action Bar */}
            <div className="flex items-center gap-1.5 shrink-0">

              {/* Détacher / Ancrer button */}
              <button
                onClick={() => setIsCanvasFloating(f => !f)}
                className="h-7 px-2.5 rounded-full bg-neutral-50 hover:bg-neutral-100 text-[#555552] text-[10px] font-bold flex items-center gap-1.5 transition-all border border-neutral-100/60"
                title={isCanvasFloating ? t('assistant.canvas_dock') : t('assistant.canvas_float')}
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span>{isCanvasFloating ? t('assistant.canvas_dock') : t('assistant.canvas_float')}</span>
              </button>

              {/* Bibliothèque button with folder dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowLibraryDropdown(d => !d)}
                  className="h-7 px-2.5 rounded-full bg-neutral-50 hover:bg-neutral-100 text-[#555552] text-[10px] font-bold flex items-center gap-1.5 transition-all border border-neutral-100/60"
                  title={t('assistant.canvas_library_tooltip')}
                >
                  <Bookmark className="h-3.5 w-3.5" />
                  <span>{t('assistant.canvas_library_btn')}</span>
                </button>
                {showLibraryDropdown && (
                  <div className="absolute right-0 top-8 z-50 bg-white border border-[#e6e5e0] rounded-xl p-3 shadow-lg w-56 animate-scale-up">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#7a7a76] mb-2">{t('assistant.canvas_library_save_title')}</p>
                    <input
                      type="text"
                      value={libraryFolderName}
                      onChange={e => setLibraryFolderName(e.target.value)}
                      placeholder={t('assistant.canvas_library_no_folder')}
                      className="w-full text-[11px] border border-neutral-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#059669] mb-2"
                    />
                    <button
                      onClick={handleDirectSaveToLibrary}
                      className="w-full py-1.5 text-[11px] font-bold bg-[#059669] text-white rounded-lg hover:bg-[#047857] transition-colors"
                    >
                      {t('assistant.canvas_library_save')}
                    </button>
                  </div>
                )}
              </div>

              {/* Actions IA */}
              <div className="relative">
                <button
                  onClick={() => setShowAiDropdown(!showAiDropdown)}
                  disabled={isAiWorking}
                  className="h-7 px-2.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 disabled:opacity-50 text-[10px] font-bold flex items-center gap-1.5 transition-all border border-emerald-200 cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#10b981]" />
                  <span>{t('assistant.ia_canvas')}</span>
                  <ChevronDown className="h-3 w-3" />
                </button>

                {showAiDropdown && (
                  <div className="absolute right-0 top-8 z-50 bg-white border border-[#e6e5e0] rounded-xl py-1 shadow-lg w-44 text-left animate-scale-up">
                    <button
                      onClick={() => handleAiCommand('summarize')}
                      className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-[#26251e] hover:bg-neutral-50 flex items-center gap-2"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-[#10b981]" />
                      <span>{t('assistant.summarize')}</span>
                    </button>
                    <button
                      onClick={() => handleAiCommand('rephrase')}
                      className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-[#26251e] hover:bg-neutral-50 flex items-center gap-2"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-[#10b981]" />
                      <span>{t('assistant.rephrase')}</span>
                    </button>
                    <button
                      onClick={() => handleAiCommand('longer')}
                      className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-[#26251e] hover:bg-neutral-50 flex items-center gap-2"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-[#10b981]" />
                      <span>{t('assistant.longer')}</span>
                    </button>
                    <button
                      onClick={() => handleAiCommand('shorter')}
                      className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-[#26251e] hover:bg-neutral-50 flex items-center gap-2"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-[#10b981]" />
                      <span>{t('assistant.shorter')}</span>
                    </button>
                    <div className="border-t border-neutral-100 my-1" />
                    <div className="px-3 py-1 text-[8px] font-bold text-[#7a7a76] uppercase">{t('assistant.tone_header')}</div>
                    {['professional', 'persuasive', 'friendly'].map(toneKey => (
                      <button
                        key={toneKey}
                        onClick={() => handleAiCommand('tone', toneKey)}
                        className="w-full text-left px-3 py-1.5 text-[9.5px] font-semibold text-[#555552] hover:bg-neutral-50 pl-5"
                      >
                        <span>
                          {toneKey === 'professional' 
                            ? t('assistant.tone_professional') 
                            : toneKey === 'persuasive' 
                              ? t('assistant.tone_persuasive') 
                              : t('assistant.tone_friendly')}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Heading select */}
              <div className="relative">
                <select
                  value={headingFormat}
                  onChange={(e) => {
                    const fmt = e.target.value;
                    insertHeading(fmt);
                  }}
                  className="h-7 text-[10px] font-bold bg-neutral-50 hover:bg-neutral-100 border border-neutral-100/60 rounded-full px-2.5 pr-6 outline-none text-[#555552] cursor-pointer appearance-none relative"
                >
                  <option value="normal">{t('assistant.normal_text')}</option>
                  <option value="h1">{t('assistant.heading_1')}</option>
                  <option value="h2">{t('assistant.heading_2')}</option>
                  <option value="h3">{t('assistant.heading_3')}</option>
                </select>
                <ChevronDown className="h-2.5 w-2.5 text-neutral-400 absolute right-2 top-2.5 pointer-events-none" />
              </div>

              {/* Bold */}
              <button
                onClick={() => wrapSelectedText('b')}
                className="h-7 w-7 rounded-full hover:bg-neutral-50 text-[#555552] border border-transparent flex items-center justify-center font-bold"
                title={t('assistant.bold')}
              >
                <Bold className="h-3.5 w-3.5" />
              </button>

              {/* Italic */}
              <button
                onClick={() => wrapSelectedText('i')}
                className="h-7 w-7 rounded-full hover:bg-neutral-50 text-[#555552] border border-transparent flex items-center justify-center italic"
                title={t('assistant.italic')}
              >
                <Italic className="h-3.5 w-3.5" />
              </button>

              {/* Divider */}
              <span className="w-px h-5 bg-neutral-200 mx-0.5" />

              {/* Undo / Redo */}
              <button 
                onClick={() => insertHeading('normal')}
                className="h-7 w-7 rounded-full hover:bg-neutral-50 text-[#555552] flex items-center justify-center"
                title={t('assistant.undo')}
              >
                <Undo2 className="h-3.5 w-3.5" />
              </button>
              <button 
                className="h-7 w-7 rounded-full hover:bg-neutral-50 text-[#555552] flex items-center justify-center opacity-40 cursor-not-allowed"
                title={t('assistant.redo')}
                disabled
              >
                <Redo2 className="h-3.5 w-3.5" />
              </button>

              {/* Copy */}
              <button
                onClick={copyToClipboard}
                className="h-7 w-7 rounded-full hover:bg-neutral-50 text-[#555552] flex items-center justify-center relative active:scale-95 transition-all"
                title={t('assistant.copy_doc')}
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              </button>

              {/* Export dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowExportDropdown(!showExportDropdown)}
                  className="h-7 px-3 rounded-full bg-[#26251e] hover:bg-[#1a1a19] text-white text-[10px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>{t('assistant.export')}</span>
                  <ChevronDown className="h-3 w-3" />
                </button>

                {showExportDropdown && (
                  <div className="absolute right-0 top-8 z-50 bg-white border border-[#e6e5e0] rounded-xl py-1 shadow-lg w-36 text-left">
                    <button
                      onClick={() => handleExport('markdown')}
                      className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-[#26251e] hover:bg-neutral-50 flex items-center gap-2"
                    >
                      <FileText className="h-3.5 w-3.5 text-neutral-400" />
                      <span>{t('assistant.markdown')}</span>
                    </button>
                    <button
                      onClick={() => handleExport('html')}
                      className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-[#26251e] hover:bg-neutral-50 flex items-center gap-2"
                    >
                      <Globe className="h-3.5 w-3.5 text-neutral-400" />
                      <span>{t('assistant.html_page')}</span>
                    </button>
                    <button
                      onClick={() => handleExport('txt')}
                      className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-[#26251e] hover:bg-neutral-50 flex items-center gap-2"
                    >
                      <FileText className="h-3.5 w-3.5 text-neutral-400" />
                      <span>{t('assistant.raw_text')}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Canvas editor Body panel */}
          <div className="flex-grow overflow-y-auto p-8 md:p-12 min-h-0 bg-white flex flex-row">
            {/* Editor Textarea styled like a premium doc page */}
            <div className="max-w-2xl mx-auto w-full h-full flex flex-col">
              <style>{`
                .ProseMirror { outline: none; min-height: 400px; }
                .ProseMirror p.is-editor-empty:first-child::before {
                  content: attr(data-placeholder);
                  color: #d4d4d4;
                  float: left;
                  height: 0;
                  pointer-events: none;
                }
                .ProseMirror h1 { font-size: 1.5rem; font-weight: 800; margin: 1rem 0 0.5rem; }
                .ProseMirror h2 { font-size: 1.25rem; font-weight: 700; margin: 0.875rem 0 0.4rem; }
                .ProseMirror h3 { font-size: 1rem; font-weight: 700; margin: 0.75rem 0 0.3rem; }
                .ProseMirror ul { list-style: disc; padding-left: 1.5rem; margin: 0.5rem 0; }
                .ProseMirror ol { list-style: decimal; padding-left: 1.5rem; margin: 0.5rem 0; }
                .ProseMirror code { background: #f3f4f6; color: #cf2d56; padding: 0.1rem 0.3rem; border-radius: 4px; font-size: 0.85em; }
                .ProseMirror strong { font-weight: 700; }
                .ProseMirror em { font-style: italic; }
                .ProseMirror hr { border: none; border-top: 1px solid #e5e5e0; margin: 1rem 0; }
              `}</style>
              <EditorContent
                editor={editor}
                className={`w-full flex-1 text-[#26251e] ${canvasFontSize === 'sm' ? 'text-xs' : canvasFontSize === 'lg' ? 'text-base' : 'text-sm'}`}
              />
            </div>

            {/* Right floating options gutter */}
            <div className="hidden lg:flex flex-col gap-2 ml-4 self-start border-l border-neutral-100 pl-4 shrink-0 select-none">
              <button
                onClick={() => setCanvasRightPanel(p => p === 'comments' ? 'none' : 'comments')}
                className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${canvasRightPanel === 'comments' ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-neutral-50 text-[#807d72] hover:text-[#26251e]'}`}
                title={t('assistant.comments')}
              >
                <MessageSquare className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCanvasRightPanel(p => p === 'history' ? 'none' : 'history')}
                className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${canvasRightPanel === 'history' ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-neutral-50 text-[#807d72] hover:text-[#26251e]'}`}
                title={t('assistant.recent_docs')}
              >
                <History className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCanvasRightPanel(p => p === 'settings' ? 'none' : 'settings')}
                className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${canvasRightPanel === 'settings' ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-neutral-50 text-[#807d72] hover:text-[#26251e]'}`}
                title={t('assistant.text_size')}
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>

            {/* Right panel content */}
            {canvasRightPanel !== 'none' && (
              <div className="hidden lg:flex flex-col w-[200px] shrink-0 border-l border-neutral-100 ml-4 pl-4 gap-3">
                {canvasRightPanel === 'comments' && (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#807d72]">{t('assistant.notes_header')}</p>
                    <div className="flex-1 space-y-2 overflow-y-auto max-h-64">
                      {canvasComments.map((c, i) => (
                        <div key={i} className="p-2 bg-amber-50 border border-amber-200 rounded text-[10px]">
                          <p className="text-[#807d72] mb-1 font-mono">{new Date(c.ts).toLocaleTimeString(locale === 'de' ? 'de-DE' : locale === 'en' ? 'en-US' : 'fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                          <p>{c.text}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <input value={canvasComment} onChange={e => setCanvasComment(e.target.value)} placeholder={t('assistant.add_note_placeholder')} className="flex-1 text-[10px] border border-neutral-200 rounded px-2 py-1 focus:outline-none" onKeyDown={e => { if (e.key === 'Enter' && canvasComment.trim()) { setCanvasComments(c => [...c, { text: canvasComment.trim(), ts: new Date().toISOString() }]); setCanvasComment(''); }}} />
                      <button onClick={() => { if (canvasComment.trim()) { setCanvasComments(c => [...c, { text: canvasComment.trim(), ts: new Date().toISOString() }]); setCanvasComment(''); }}} className="text-[10px] bg-neutral-100 hover:bg-neutral-200 rounded px-2 py-1">+</button>
                    </div>
                  </>
                )}
                {canvasRightPanel === 'history' && (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#807d72]">{t('assistant.canvas_docs')}</p>
                    <div className="flex-1 space-y-1.5 overflow-y-auto max-h-64">
                      {canvasDocs.length === 0 && <p className="text-[10px] text-[#7a7a76] italic">{t('assistant.no_docs')}</p>}
                      {canvasDocs.map(doc => (
                        <button key={doc.id} onClick={() => { setCanvasDoc({ id: doc.id, title: doc.title, content: doc.content, lastSaved: doc.updatedAt }); setCanvasRightPanel('none'); }} className="w-full text-left p-2 rounded hover:bg-neutral-50 text-[10px] border border-neutral-100 transition-colors">
                          <p className="font-bold truncate">{doc.title || t('assistant.untitled_doc')}</p>
                          <p className="text-[#7a7a76] font-mono">{new Date(doc.updatedAt).toLocaleDateString(locale === 'de' ? 'de-DE' : locale === 'en' ? 'en-US' : 'fr-FR')}</p>
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {canvasRightPanel === 'settings' && (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#807d72]">{t('assistant.text_size')}</p>
                    <div className="flex gap-2">
                      {(['sm', 'base', 'lg'] as const).map(size => (
                        <button key={size} onClick={() => setCanvasFontSize(size)} className={`flex-1 py-1 text-[10px] font-bold rounded border transition-colors ${canvasFontSize === size ? 'bg-[#26251e] text-white border-[#26251e]' : 'border-neutral-200 hover:bg-neutral-50'}`}>
                          {size === 'sm' ? 'S' : size === 'base' ? 'M' : 'L'}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Save to Library prompt */}
          {showSaveToLibraryPrompt && (
            <div className="absolute bottom-4 right-4 z-50 bg-white border border-[#e5e5e0] shadow-lg rounded-xl p-4 w-72 animate-scale-up">
              <p className="text-sm font-bold text-[#26251e] mb-1">{t('assistant.library_save_title')}</p>
              <p className="text-[11px] text-[#7a7a76] mb-3">{t('assistant.library_save_desc').replace('{title}', editorTitle)}</p>
              <div className="flex gap-2">
                <button onClick={handleSaveToLibrary} className="flex-1 py-1.5 text-[11px] font-bold bg-[#059669] text-white rounded-lg hover:bg-[#047857] transition-colors">{t('assistant.yes_add')}</button>
                <button onClick={() => setShowSaveToLibraryPrompt(false)} className="flex-1 py-1.5 text-[11px] font-bold border border-[#e5e5e0] rounded-lg hover:bg-[#f4f4f3]/80 transition-colors">{t('assistant.no_thanks')}</button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

export default AssistantRoot;
