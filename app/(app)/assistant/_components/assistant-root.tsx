'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useReach } from '@/lib/reach-context';
import { useSkills } from '@/lib/use-skills';
import { getApiUrl } from '@/lib/api-helper';
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
  Maximize2
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
          if (h3) { nodes.push(<h3 key={`${i}-${i2}`} className="text-sm font-bold text-foreground mt-2 mb-0.5">{renderInline(h3[1])}</h3>); i2++; continue; }
          if (h2) { nodes.push(<h2 key={`${i}-${i2}`} className="text-sm font-extrabold text-foreground mt-3 mb-1">{renderInline(h2[1])}</h2>); i2++; continue; }
          if (h1) { nodes.push(<h1 key={`${i}-${i2}`} className="text-base font-extrabold text-foreground mt-3 mb-1">{renderInline(h1[1])}</h1>); i2++; continue; }

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

          // Horizontal rule
          if (/^---+$/.test(line.trim())) {
            nodes.push(<hr key={`${i}-${i2}`} className="border-border/40 my-2" />);
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
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={i} className="italic">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="bg-neutral-100 dark:bg-neutral-800 text-[#cf2d56] px-1 py-0.5 rounded text-[11px] font-mono">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  attachedFile?: { name: string; type: string };
  isSimulated?: boolean;
}

interface CanvasDocument {
  id: string;
  title: string;
  content: string;
  lastSaved: string;
}

const AI_MODELS = [
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Minerva AI (Llama 3.3 70B)', provider: 'openrouter' },
  { id: 'meta-llama/llama-3.2-11b-vision-instruct:free', name: 'Vision (texte + image)', provider: 'openrouter' },
  { id: 'google/gemini-2.5-flash:free', name: 'Gemini 2.5 Flash', provider: 'openrouter' },
  { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1 — Raisonnement', provider: 'openrouter' },
  { id: 'nousresearch/hermes-3-llama-3-8b', name: 'Hermes Agent ⚡', provider: 'openrouter' },
];

const generateUniqueId = () => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export function AssistantRoot() {
  const { user, leads, activeWorkspace } = useReach();
  const { t, locale } = useLanguage();
  const { enabledSkills } = useSkills(activeWorkspace?.id);

  // State Management
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  // @ skills/context menu
  const [showAtMenu, setShowAtMenu] = useState(false);
  const [activeSkillIds, setActiveSkillIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(AI_MODELS[0]);
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  // File Attachment
  const [attachedFile, setAttachedFile] = useState<{ name: string; type: string; content?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice Interaction Simulation
  const [isRecording, setIsRecording] = useState(false);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const userId = user?.id || 'anonymous';
  const workspaceId = activeWorkspace?.id || 'default_ws';

  // Load database sessions and documents on mount or workspace change
  useEffect(() => {
    async function loadWorkspaceData() {
      const sessList = await dbGetSessions(userId, workspaceId);
      setSessions(sessList);

      const docsList = await dbGetCanvasDocs(userId, workspaceId);
      setCanvasDocs(docsList);

      const storedSessId = localStorage.getItem(`minerva_active_sess_${workspaceId}`);
      const activeSess = sessList.find(s => s.id === storedSessId);
      if (activeSess) {
        setCurrentSession(activeSess);
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
          <div className="border border-emerald-200/80 bg-emerald-50/30 dark:bg-emerald-950/10 dark:border-emerald-900/30 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate">{canvasData.title}</p>
                <p className="text-[10px] text-muted-foreground">{t('assistant.doc_ready_canvas')}</p>
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

    // Markdown renderer for assistant messages
    if (msg.role === 'assistant') {
      return (
        <div className="space-y-2">
          {msg.attachedFile && (
            <div className="inline-flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 border border-border px-3 py-1.5 rounded-lg text-[11px] font-bold">
              <FileText className="h-3.5 w-3.5 text-[#10b981]" />
              <span className="truncate max-w-[150px]">{msg.attachedFile.name}</span>
            </div>
          )}
          <MarkdownRenderer content={msg.content} t={t} />
        </div>
      );
    }

    // Plain user message
    return (
      <div className="space-y-2">
        {msg.attachedFile && (
          <div className="inline-flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 border border-border px-3 py-1.5 rounded-lg text-[11px] font-bold">
            <FileText className="h-3.5 w-3.5 text-[#10b981]" />
            <span className="truncate max-w-[150px]">{msg.attachedFile.name}</span>
          </div>
        )}
        <p className="whitespace-pre-wrap leading-relaxed text-sm">{msg.content}</p>
      </div>
    );
  };

  // Start a new thread
  const handleClearChat = () => {
    setCurrentSession(null);
    setMessages([]);
    localStorage.removeItem(`minerva_active_sess_${workspaceId}`);
    window.dispatchEvent(new CustomEvent('minerva_assistant_sync'));
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
      attachedFile: fileToAttach ? { name: fileToAttach.name, type: fileToAttach.type } : undefined
    };
    
    // Save to local database
    await dbSaveMessage(activeSess.id, userId, 'user', trimmed, fileToAttach ? { name: fileToAttach.name, type: fileToAttach.type } : undefined);

    const history = [...messages, userMsg];
    setMessages(history);
    setIsLoading(true);

    const apiHistory = [
      ...messages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: contentToSend }
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
    const systemWithSkills = skillInstructions
      ? `${canvasSystemPrompt}\n\n## Compétences activées\n${skillInstructions}`
      : canvasSystemPrompt;

    try {
      const res = await fetch(getApiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiHistory,
          model: selectedModel.id,
          provider: selectedModel.provider,
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
    const textarea = document.getElementById('canvas-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selection = editorContent.substring(start, end);
    const targetText = selection || editorContent;

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

      if (selection) {
        replaceSelectedText(replacement.trim(), start, end);
      } else {
        handleContentChange(replacement.trim());
      }

    } catch (err) {
      console.error(err);
      setIsSavedIndicator("assistant.ai_error");
    } finally {
      setIsAiWorking(false);
      setIsSavedIndicator("assistant.saved");
    }
  };

  const replaceSelectedText = (replacement: string, start: number, end: number) => {
    const newVal = editorContent.substring(0, start) + replacement + editorContent.substring(end);
    handleContentChange(newVal);
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
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const textContent = event.target?.result as string || '';
        setAttachedFile({
          name: file.name,
          type: file.type || 'text/plain',
          content: textContent
        });
      };
      reader.readAsText(file);
    }
  };

  // Voice Recording simulation
  const startRecording = () => {
    setIsRecording(true);
    let dots = '';
    const baseText = t('assistant.recording_in_progress').replace(/\.*$/, '');
    recordingIntervalRef.current = setInterval(() => {
      dots = dots.length >= 3 ? '' : dots + '.';
      setInput(`${baseText}${dots}`);
    }, 500);
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
    setInput(t('assistant.recorded_value_placeholder'));
  };

  // Copy document text
  const copyToClipboard = () => {
    navigator.clipboard.writeText(editorContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Formatting helpers
  const wrapSelectedText = (tag: 'b' | 'i') => {
    const textarea = document.getElementById('canvas-textarea') as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    
    let replacement = '';
    if (tag === 'b') replacement = `**${selected}**`;
    if (tag === 'i') replacement = `*${selected}*`;

    const newVal = text.substring(0, start) + replacement + text.substring(end);
    handleContentChange(newVal);
  };

  const insertHeading = (level: string) => {
    const textarea = document.getElementById('canvas-textarea') as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const text = textarea.value;
    
    let prefix = '';
    if (level === 'h1') prefix = '\n# ';
    if (level === 'h2') prefix = '\n## ';
    if (level === 'h3') prefix = '\n### ';

    const newVal = text.substring(0, start) + prefix + text.substring(start);
    handleContentChange(newVal);
    setHeadingFormat(level);
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
    } else if (format === 'html') {
      mime = 'text/html';
      ext = 'html';
      data = `<html><head><meta charset="UTF-8"><title>${editorTitle}</title><style>body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.7;color:#26251e}h1,h2,h3{font-weight:700}</style></head><body><h1>${editorTitle}</h1>${editorContent.replace(/\n/g, '<br/>')}</body></html>`;
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
      await supabase.from('library_assets').insert({
        user_id: user.id,
        workspace_id: activeWorkspace.id,
        type: 'document',
        title: lastExportedContent.title,
        content: lastExportedContent.content,
        created_at: new Date().toISOString(),
      });
    } catch {
      // Library table may not exist yet — silent fail
    }
    setShowSaveToLibraryPrompt(false);
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
      `}</style>
      
      {/* ── LEFT PANEL: CHAT INTERFACE & SIDEBAR ── */}
      <div className={`flex h-full bg-white transition-all duration-300 relative overflow-hidden ${
        isCanvasOpen ? 'w-full md:w-[40%] border-r border-[#e6e5e0]' : 'w-full'
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
                className="h-7 w-7 rounded-full p-0 text-muted-foreground hover:text-[#10b981] transition-colors border border-transparent hover:border-neutral-200"
                title={t('assistant.new_chat')}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Scrollable list of items */}
            <div className="flex-1 overflow-y-auto p-2 space-y-4">
              {/* Discussions list */}
              <div className="space-y-1">
                <div className="px-2 text-[8px] font-bold text-muted-foreground uppercase tracking-wider">{t('assistant.discussions')}</div>
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
                <div className="px-2 text-[8px] font-bold text-muted-foreground uppercase tracking-wider">{t('assistant.canvas_docs')}</div>
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
                  isHistoryOpen ? 'text-[#10b981] bg-emerald-50/70 border-emerald-100' : 'text-muted-foreground hover:text-primary hover:border-neutral-200'
                }`}
                title={t('assistant.history')}
              >
                <History className="w-3.5 h-3.5" />
              </Button>
              <div className="h-6 w-6 rounded-md bg-[#10b981]/15 text-[#10b981] flex items-center justify-center shrink-0">
                <MinervaIcon size={14} />
              </div>
              <span className="text-xs font-bold text-foreground">Minerva AI Assistant</span>
              {currentSession && (
                <span className="text-[10px] text-muted-foreground font-bold truncate max-w-[150px] border-l border-neutral-200 pl-2">
                  {currentSession.title}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearChat}
                className="text-[10px] h-7 font-bold text-muted-foreground hover:text-[#10b981] gap-1 rounded-full px-2.5 transition-colors border border-transparent hover:border-neutral-100"
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
              /* Splash Centered Screen */
              <div className="flex flex-col items-center justify-center min-h-full py-16 px-6 max-w-xl mx-auto space-y-8 animate-scale-up">
                
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="h-10 w-10 rounded-xl bg-white border border-[#e6e5e0] text-[#10b981] flex items-center justify-center shadow-sm">
                    <MinervaIcon size={24} />
                  </div>
                  <h1 className="text-3xl tracking-tight text-[#26251e] font-serif font-light font-georgia leading-tight">
                    {t('assistant.still_at_it')}
                  </h1>
                </div>

                {/* Central Text Area Card */}
                <div className="w-full border border-[#e6e5e0] rounded-2xl bg-white shadow-sm flex flex-col p-3 space-y-3 focus-within:border-[#10b981] transition-colors relative z-20 animate-fade-in-up">
                  {attachedFile && (
                    <div className="flex items-center justify-between bg-[#fafaf9] border border-[#e6e5e0]/60 px-3 py-2 rounded-xl text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-[#10b981] shrink-0" />
                        <span className="font-bold text-[#26251e] truncate">{attachedFile.name}</span>
                        <span className="text-[10px] text-neutral-400 uppercase font-semibold shrink-0">
                          {attachedFile.content ? 'Contenu extrait' : 'Document'}
                        </span>
                      </div>
                      <button 
                        onClick={() => setAttachedFile(null)}
                        className="text-neutral-400 hover:text-[#26251e] p-0.5"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder={t('assistant.input_placeholder_formats')}
                    rows={3}
                    className="w-full resize-none text-xs font-semibold text-[#26251e] bg-transparent outline-none placeholder:text-neutral-400 px-1 border-0"
                  />

                  {/* Bottom Row inside input area */}
                  <div className="flex items-center justify-between border-t border-neutral-100/80 pt-2 shrink-0">
                    <div className="flex items-center gap-1.5">
                      {/* Add attachment button */}
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        className="hidden" 
                        accept=".txt,.md,.json,.csv,.js,.ts"
                      />
                      <button 
                        onClick={triggerFileUpload}
                        className="h-7 w-7 rounded-full bg-neutral-50 hover:bg-neutral-100 text-[#555552] flex items-center justify-center cursor-pointer transition-colors border border-transparent active:scale-95"
                        title={t('assistant.attach_file')}
                      >
                        <Plus className="h-4 w-4" />
                      </button>

                      {/* Canvas Toggle button */}
                      <button
                        onClick={() => setIsCanvasOpen(!isCanvasOpen)}
                        className={`h-7 px-3 rounded-full flex items-center gap-1 text-[10px] font-bold transition-all border ${
                          isCanvasOpen 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-neutral-50 hover:bg-neutral-100 text-[#555552] border-transparent'
                        }`}
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>Canvas</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Model selector dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setShowModelDropdown(!showModelDropdown)}
                          className="h-7 px-3 rounded-full bg-neutral-50 hover:bg-neutral-100 border border-neutral-100/60 text-[#555552] flex items-center gap-1.5 text-[10px] font-bold cursor-pointer transition-colors"
                        >
                          <Globe className="h-3.5 w-3.5 text-neutral-400" />
                          <span>{selectedModel.name}</span>
                          <ChevronDown className="h-3 w-3" />
                        </button>

                        {showModelDropdown && (
                          <div className="absolute right-0 bottom-8 z-50 bg-white border border-[#e6e5e0] rounded-xl py-1 shadow-lg w-52 text-left animate-scale-up">
                            <div className="px-3 py-1 text-[8px] font-bold text-muted-foreground uppercase tracking-wider">{t('assistant.models_title')}</div>
                            {AI_MODELS.map((model) => (
                              <button
                                key={model.id}
                                onClick={() => {
                                  setSelectedModel(model);
                                  setShowModelDropdown(false);
                                }}
                                className={`w-full text-left px-3 py-1.5 text-[10px] font-bold flex items-center justify-between hover:bg-neutral-50 ${
                                  selectedModel.id === model.id ? 'text-[#10b981]' : 'text-[#26251e]'
                                }`}
                              >
                                <span>{model.name}</span>
                                {selectedModel.id === model.id && <Check className="h-3 w-3" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Microphone voice button */}
                      <button
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`h-7 w-7 rounded-full flex items-center justify-center cursor-pointer transition-all border ${
                          isRecording 
                            ? 'bg-red-500 text-white border-red-500 animate-pulse' 
                            : 'bg-neutral-50 hover:bg-neutral-100 text-[#555552] border-transparent'
                        }`}
                        title={isRecording ? t('assistant.stop_recording') : t('assistant.voice_msg')}
                      >
                        <Mic className="h-3.5 w-3.5" />
                      </button>

                      {/* Send button */}
                      <button
                        onClick={() => handleSend()}
                        disabled={isLoading}
                        className="h-7 w-7 rounded-full bg-[#10b981] hover:bg-[#059669] text-white flex items-center justify-center cursor-pointer transition-all shadow-sm active:scale-95 disabled:opacity-50"
                        title={t('assistant.send')}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Prompt Bubbles Grid */}
                <div className="w-full px-4 flex flex-wrap items-center justify-center gap-2 max-w-lg mx-auto animate-fade-in-up">
                  {QUICK_PROMPTS.map((chip) => (
                    <button
                      key={chip.label}
                      onClick={() => handleQuickPromptClick(chip)}
                      className="bg-white border border-[#e6e5e0] hover:bg-[#f7f7f4] hover:border-[#10b981]/30 hover:text-[#10b981] text-[10.5px] font-bold text-[#555552] px-3.5 py-1.5 rounded-full cursor-pointer transition-all duration-200 active:scale-95 shadow-none"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

              </div>
            ) : (
              /* Active message feed container */
              <div className="p-4 space-y-6">
                {messages.map((msg, i) => (
                  <div 
                    key={i} 
                    className={`flex gap-3 max-w-[85%] animate-fade-in-up ${
                      msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="h-7 w-7 rounded-lg bg-neutral-100 border border-neutral-200 text-[#10b981] flex items-center justify-center shrink-0 mt-0.5">
                        <MinervaIcon size={16} />
                      </div>
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-[#26251e] text-white flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5 select-none">
                        U
                      </div>
                    )}

                    <div className={`rounded-2xl px-4 py-2.5 shadow-none ${
                      msg.role === 'user'
                        ? 'bg-neutral-50 text-[#26251e] border border-[#e6e5e0] rounded-tr-none'
                        : 'bg-white text-foreground rounded-tl-none border-0'
                    }`}>
                      {renderMessageContent(msg, i)}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-3 max-w-[85%] mr-auto items-center">
                    <div className="h-7 w-7 rounded-lg bg-neutral-100 border border-neutral-200 text-[#10b981] flex items-center justify-center shrink-0 animate-pulse">
                      <MinervaIcon size={16} />
                    </div>
                    <div className="bg-white border-0 rounded-2xl rounded-tl-none px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" />
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce delay-100" />
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce delay-200" />
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
                        {attachedFile.content ? 'Contenu extrait' : 'Document'}
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

                {/* Active skill chips */}
                {activeSkillIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 px-1">
                    {activeSkillIds.map(id => {
                      const sk = enabledSkills.find(s => s.id === id);
                      if (!sk) return null;
                      return (
                        <span key={id} className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f54e00]/10 text-[#f54e00] border border-[#f54e00]/20">
                          <Sparkles className="h-2.5 w-2.5" />
                          {sk.name}
                          <button onClick={() => setActiveSkillIds(prev => prev.filter(x => x !== id))} className="hover:opacity-70">
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
                      Compétences activées
                    </div>
                    {enabledSkills.length === 0 ? (
                      <div className="px-3 py-2 text-[11px] text-[#7a7a76]">
                        Aucune compétence activée. Activez-en dans <span className="font-semibold">Skills</span>.
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
                        <Sparkles className="h-3.5 w-3.5 text-[#f54e00] shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[#26251e]">{sk.name}</p>
                          <p className="text-[10px] text-[#7a7a76] truncate">{sk.description}</p>
                        </div>
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
                      accept=".txt,.md,.json,.csv,.js,.ts"
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
        <div className={`h-full bg-white flex flex-col z-50 transition-all duration-300 animate-scale-up ${
          'fixed inset-0 md:relative md:flex-grow md:flex md:w-[60%] border-t border-[#e6e5e0] md:border-t-0'
        }`}>
          
          {/* Canvas editor Header toolbar */}
          <header className="h-14 border-b border-[#e6e5e0]/60 px-4 flex items-center justify-between bg-white shrink-0">
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
                    <div className="px-3 py-1 text-[8px] font-bold text-muted-foreground uppercase">{t('assistant.tone_header')}</div>
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
              <textarea
                id="canvas-textarea"
                value={editorContent}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder={t('assistant.editor_placeholder')}
                className={`w-full flex-1 border-0 resize-none outline-none focus:outline-none focus:ring-0 leading-relaxed text-[#26251e] font-sans placeholder:text-neutral-300 ${canvasFontSize === 'sm' ? 'text-xs' : canvasFontSize === 'lg' ? 'text-base' : 'text-sm'}`}
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
                      {canvasDocs.length === 0 && <p className="text-[10px] text-muted-foreground italic">{t('assistant.no_docs')}</p>}
                      {canvasDocs.map(doc => (
                        <button key={doc.id} onClick={() => { setCanvasDoc({ id: doc.id, title: doc.title, content: doc.content, lastSaved: doc.updatedAt }); setCanvasRightPanel('none'); }} className="w-full text-left p-2 rounded hover:bg-neutral-50 text-[10px] border border-neutral-100 transition-colors">
                          <p className="font-bold truncate">{doc.title || t('assistant.untitled_doc')}</p>
                          <p className="text-muted-foreground font-mono">{new Date(doc.updatedAt).toLocaleDateString(locale === 'de' ? 'de-DE' : locale === 'en' ? 'en-US' : 'fr-FR')}</p>
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
            <div className="absolute bottom-4 right-4 z-50 bg-white border border-border shadow-lg rounded-xl p-4 w-72 animate-scale-up">
              <p className="text-sm font-bold text-foreground mb-1">{t('assistant.library_save_title')}</p>
              <p className="text-[11px] text-muted-foreground mb-3">{t('assistant.library_save_desc').replace('{title}', editorTitle)}</p>
              <div className="flex gap-2">
                <button onClick={handleSaveToLibrary} className="flex-1 py-1.5 text-[11px] font-bold bg-[#059669] text-white rounded-lg hover:bg-[#047857] transition-colors">{t('assistant.yes_add')}</button>
                <button onClick={() => setShowSaveToLibraryPrompt(false)} className="flex-1 py-1.5 text-[11px] font-bold border border-border rounded-lg hover:bg-muted/50 transition-colors">{t('assistant.no_thanks')}</button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

export default AssistantRoot;
