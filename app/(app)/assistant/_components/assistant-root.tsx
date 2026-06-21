'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useReach } from '@/lib/reach-context';
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

function MarkdownRenderer({ content }: { content: string }) {
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
                  <span>{copiedBlock === blockIdx ? 'Copié' : 'Copier'}</span>
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
  { id: 'google/gemini-2.5-flash:free', name: 'Gemini 2.5 Flash', provider: 'openrouter' },
  { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1 — Raisonnement', provider: 'openrouter' },
  { id: 'nousresearch/hermes-3-llama-3-8b', name: 'Hermes Agent ⚡', provider: 'openrouter' },
];

export function AssistantRoot() {
  const { user, leads, activeWorkspace } = useReach();

  // State Management
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
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
  const [editorTitle, setEditorTitle] = useState("Document sans titre");
  const [editorContent, setEditorContent] = useState("");
  const [isSavedIndicator, setIsSavedIndicator] = useState("Modifications enregistrées");
  const [headingFormat, setHeadingFormat] = useState("normal");
  const [copied, setCopied] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  // History panel states
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const [sessions, setSessions] = useState<AssistantSession[]>([]);
  const [currentSession, setCurrentSession] = useState<AssistantSession | null>(null);
  const [canvasDocs, setCanvasDocs] = useState<AssistantCanvasDoc[]>([]);
  const [showAiDropdown, setShowAiDropdown] = useState(false);
  const [isAiWorking, setIsAiWorking] = useState(false);

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
          lastSaved: "Modifications enregistrées"
        });
        setEditorTitle(activeDoc.title);
        setEditorContent(activeDoc.content);
        setIsCanvasOpen(true);
      } else {
        setEditorDocId('');
        setCanvasDoc(null);
        setEditorTitle("Document sans titre");
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
    setIsSavedIndicator("Enregistrement...");
    await dbSaveCanvasDoc(id, userId, workspaceId, title, content);
    
    // Refresh document list
    const list = await dbGetCanvasDocs(userId, workspaceId);
    setCanvasDocs(list);
    setIsSavedIndicator("Modifications enregistrées");
  };

  const handleContentChange = (newVal: string) => {
    setEditorContent(newVal);
    const docId = editorDocId || Math.random().toString(36).substring(2) + Date.now().toString(36);
    if (!editorDocId) {
      setEditorDocId(docId);
      setCanvasDoc({
        id: docId,
        title: editorTitle,
        content: newVal,
        lastSaved: "À l'instant"
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
    const docId = editorDocId || Math.random().toString(36).substring(2) + Date.now().toString(36);
    if (!editorDocId) {
      setEditorDocId(docId);
      setCanvasDoc({
        id: docId,
        title: newTitle,
        content: editorContent,
        lastSaved: "À l'instant"
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
                <p className="text-[10px] text-muted-foreground">Document prêt dans le Canvas</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                const docId = Math.random().toString(36).substring(2) + Date.now().toString(36);
                setEditorDocId(docId);
                const doc = {
                  id: docId,
                  title: canvasData.title,
                  content: canvasData.content,
                  lastSaved: "À l'instant"
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
              Ouvrir le Canvas
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
          <MarkdownRenderer content={msg.content} />
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
    if (!activeSess) {
      const words = trimmed
        .replace(/[^\w\sÀ-ɏ'-]/g, '')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 6);
      const sessTitle = words.length > 0
        ? words.join(' ')
        : (fileToAttach ? `Fichier : ${fileToAttach.name}` : 'Discussion');
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

    try {
      const res = await fetch(getApiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: apiHistory,
          model: selectedModel.id,
          activeTool: isCanvasOpen ? 'canvas' : undefined
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
            assistantContent += delta;
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
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
      }

      // Handle embedded canvas document
      const canvasData = extractCanvasBlock(assistantContent);
      if (canvasData) {
        const docId = Math.random().toString(36).substring(2) + Date.now().toString(36);
        setEditorDocId(docId);
        setCanvasDoc({
          id: docId,
          title: canvasData.title,
          content: canvasData.content,
          lastSaved: "À l'instant"
        });
        await dbSaveCanvasDoc(docId, userId, workspaceId, canvasData.title, canvasData.content);
        const list = await dbGetCanvasDocs(userId, workspaceId);
        setCanvasDocs(list);
        setIsCanvasOpen(true);
      }

    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Une erreur de communication est survenue. Veuillez réessayer.' }]);
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
    setIsSavedIndicator("L'IA travaille...");

    let instruction = "";
    if (command === 'summarize') instruction = "Résume le texte de façon synthétique et structurée.";
    if (command === 'rephrase') instruction = "Reformule le texte pour améliorer le style et la clarté.";
    if (command === 'longer') instruction = "Développe et enrichis le texte avec plus de détails et d'arguments.";
    if (command === 'shorter') instruction = "Condense le texte pour le rendre plus concis.";
    if (command === 'tone') instruction = `Réécris le texte en adoptant un ton ${extra}.`;

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
          system: "Tu es un outil d'écriture assistée par IA intégré dans un Canvas de prospection. Réécris ou modifie le texte fourni en suivant l'instruction reçue. Ne renvoie AUCUNE introduction, conclusion, explication, ni de balises de code. Renvoie UNIQUEMENT le texte modifié prêt à être inséré."
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
      setIsSavedIndicator("Erreur d'IA");
    } finally {
      setIsAiWorking(false);
      setIsSavedIndicator("Modifications enregistrées");
    }
  };

  const replaceSelectedText = (replacement: string, start: number, end: number) => {
    const newVal = editorContent.substring(0, start) + replacement + editorContent.substring(end);
    handleContentChange(newVal);
  };

  // Simulated Quick Actions
  const QUICK_PROMPTS = [
    { label: 'Company knowledge', value: 'Rédige une note stratégique basée sur notre base de connaissances.' },
    { label: 'Create document', value: 'Écris-moi le plan détaillé pour une application de santé (Health App Research Summary).' },
    { label: 'Create presentation', value: 'Prépare-moi la structure de diapositives pour la présentation client.' },
    { label: 'Create spreadsheet', value: 'Crée-moi un tableau structuré de prévisions financières de leads.' },
    { label: 'Generate image', value: 'Génère un visuel promotionnel minimaliste pour notre service.' },
    { label: 'Deep research', value: 'Fais une analyse approfondie des boulangeries et salons à Montréal.' },
    { label: 'Visualize data', value: 'Analyse les taux de conversion récents sous forme de tableau.' }
  ];

  const handleQuickPromptClick = (chip: { label: string; value: string }) => {
    let finalPrompt = chip.value;
    if (chip.label === 'Company knowledge') {
      const wsName = activeWorkspace?.name || 'mon espace de travail';
      finalPrompt = `Rédige une note stratégique basée sur notre base de connaissances pour l'espace de travail "${wsName}".`;
    } else if (chip.label === 'Visualize data') {
      const totalLeads = leads?.length || 0;
      const statusCounts = (leads || []).reduce((acc: Record<string, number>, lead) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1;
        return acc;
      }, {});
      const breakdown = Object.entries(statusCounts)
        .map(([status, count]) => `${status}: ${count}`)
        .join(', ');
      finalPrompt = `Analyse les statistiques de nos prospects récents. Nous avons actuellement ${totalLeads} prospects dans le CRM. Répartition : ${breakdown || 'aucune donnée'}.`;
    } else if (chip.label === 'Deep research') {
      const niches = (leads || []).map(l => l.niche).filter(Boolean);
      const cities = (leads || []).map(l => l.city).filter(Boolean);
      const topNiche = niches.sort((a,b) => niches.filter(v => v===a).length - niches.filter(v => v===b).length).pop() || 'boulangerie';
      const topCity = cities.sort((a,b) => cities.filter(v => v===a).length - cities.filter(v => v===b).length).pop() || 'Montréal';
      finalPrompt = `Fais une analyse approfondie et identifie les opportunités pour les prospects dans le secteur "${topNiche}" à "${topCity}".`;
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
    recordingIntervalRef.current = setInterval(() => {
      dots = dots.length >= 3 ? '' : dots + '.';
      setInput(`Enregistrement vocal en cours${dots}`);
    }, 500);
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
    setInput("Je souhaite analyser nos performances de prospection et générer un rapport.");
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
      data = `<html><head><title>${editorTitle}</title></head><body style="font-family:sans-serif;padding:40px;line-height:1.6;"><h1>${editorTitle}</h1>${editorContent.replace(/\n/g, '<br/>')}</body></html>`;
    }

    const blob = new Blob([data], { type: mime });
    link.href = URL.createObjectURL(blob);
    link.download = `${editorTitle.toLowerCase().replace(/\s+/g, '-') || 'document'}.${ext}`;
    link.click();
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
        
        {/* collapsible sidebar for thread/canvas doc history */}
        {isHistoryOpen && (
          <div className="w-56 bg-[#fafaf9] border-r border-[#e6e5e0]/60 flex flex-col h-full shrink-0 select-none animate-fade-in">
            {/* Sidebar header */}
            <div className="h-14 border-b border-[#e6e5e0]/60 px-4 flex items-center justify-between shrink-0 bg-[#fafaf9]">
              <span className="text-[10px] font-extrabold text-[#26251e] tracking-wider uppercase">Historique</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearChat}
                className="h-7 w-7 rounded-full p-0 text-muted-foreground hover:text-[#10b981] transition-colors border border-transparent hover:border-neutral-200"
                title="Nouvelle discussion"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Scrollable list of items */}
            <div className="flex-1 overflow-y-auto p-2 space-y-4">
              {/* Discussions list */}
              <div className="space-y-1">
                <div className="px-2 text-[8px] font-bold text-muted-foreground uppercase tracking-wider">Discussions</div>
                {sessions.length === 0 ? (
                  <div className="px-2 py-1.5 text-[9px] text-[#807d72] italic font-semibold">Aucune discussion</div>
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
                        title={sess.pinned ? "Désépingler" : "Épingler"}
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
                <div className="px-2 text-[8px] font-bold text-muted-foreground uppercase tracking-wider">Documents Canvas</div>
                {canvasDocs.length === 0 ? (
                  <div className="px-2 py-1.5 text-[9px] text-[#807d72] italic font-semibold">Aucun document</div>
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
                            lastSaved: "Modifications enregistrées"
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
                            setEditorTitle("Document sans titre");
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
                title="Afficher/Masquer l'historique"
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
                title="Nouvelle discussion"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nouveau</span>
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
                    Still at it! What can I help with?
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
                    placeholder="Ask anything, format recommandés : .txt, .md, .csv, .json..."
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
                        title="Joindre un fichier texte (.txt, .md, .csv, .json)"
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
                            <div className="px-3 py-1 text-[8px] font-bold text-muted-foreground uppercase tracking-wider">Modèles Disponibles</div>
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
                        title={isRecording ? "Arrêter l'enregistrement" : "Message vocal"}
                      >
                        <Mic className="h-3.5 w-3.5" />
                      </button>

                      {/* Send button */}
                      <button
                        onClick={() => handleSend()}
                        disabled={isLoading}
                        className="h-7 w-7 rounded-full bg-[#10b981] hover:bg-[#059669] text-white flex items-center justify-center cursor-pointer transition-all shadow-sm active:scale-95 disabled:opacity-50"
                        title="Envoyer"
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

                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Ask anything, @ for context and skills..."
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
                      title="Joindre un fichier texte (.txt, .md, .csv, .json)"
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
                    >
                      <Mic className="h-3 w-3" />
                    </button>

                    <button
                      onClick={() => handleSend()}
                      disabled={isLoading}
                      className="h-6 w-6 rounded-full bg-[#10b981] hover:bg-[#059669] text-white flex items-center justify-center cursor-pointer transition-all shadow-sm disabled:opacity-50"
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
                title="Fermer le Canvas"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="min-w-0 pr-2">
                <input
                  type="text"
                  value={editorTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="font-serif font-bold text-sm tracking-tight text-[#26251e] bg-transparent border-0 outline-none w-full p-0 leading-tight focus:ring-0 focus:border-0 focus:outline-none"
                  placeholder="Health App Research Summary and Design Plan"
                />
                <p className="text-[9px] text-[#807d72] font-semibold tracking-wide">
                  {isSavedIndicator}
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
                  <span>IA Canvas</span>
                  <ChevronDown className="h-3 w-3" />
                </button>

                {showAiDropdown && (
                  <div className="absolute right-0 top-8 z-50 bg-white border border-[#e6e5e0] rounded-xl py-1 shadow-lg w-44 text-left animate-scale-up">
                    <button
                      onClick={() => handleAiCommand('summarize')}
                      className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-[#26251e] hover:bg-neutral-50 flex items-center gap-2"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-[#10b981]" />
                      <span>Résumer</span>
                    </button>
                    <button
                      onClick={() => handleAiCommand('rephrase')}
                      className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-[#26251e] hover:bg-neutral-50 flex items-center gap-2"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-[#10b981]" />
                      <span>Reformuler</span>
                    </button>
                    <button
                      onClick={() => handleAiCommand('longer')}
                      className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-[#26251e] hover:bg-neutral-50 flex items-center gap-2"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-[#10b981]" />
                      <span>Allonger</span>
                    </button>
                    <button
                      onClick={() => handleAiCommand('shorter')}
                      className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-[#26251e] hover:bg-neutral-50 flex items-center gap-2"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-[#10b981]" />
                      <span>Raccourcir</span>
                    </button>
                    <div className="border-t border-neutral-100 my-1" />
                    <div className="px-3 py-1 text-[8px] font-bold text-muted-foreground uppercase">Ton de réécriture</div>
                    {['Professionnel', 'Persuasif', 'Amical'].map(tone => (
                      <button
                        key={tone}
                        onClick={() => handleAiCommand('tone', tone)}
                        className="w-full text-left px-3 py-1.5 text-[9.5px] font-semibold text-[#555552] hover:bg-neutral-50 pl-5"
                      >
                        <span>{tone}</span>
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
                  <option value="normal">Normal text</option>
                  <option value="h1">Heading 1</option>
                  <option value="h2">Heading 2</option>
                  <option value="h3">Heading 3</option>
                </select>
                <ChevronDown className="h-2.5 w-2.5 text-neutral-400 absolute right-2 top-2.5 pointer-events-none" />
              </div>

              {/* Bold */}
              <button
                onClick={() => wrapSelectedText('b')}
                className="h-7 w-7 rounded-full hover:bg-neutral-50 text-[#555552] border border-transparent flex items-center justify-center font-bold"
                title="Gras"
              >
                <Bold className="h-3.5 w-3.5" />
              </button>

              {/* Italic */}
              <button
                onClick={() => wrapSelectedText('i')}
                className="h-7 w-7 rounded-full hover:bg-neutral-50 text-[#555552] border border-transparent flex items-center justify-center italic"
                title="Italique"
              >
                <Italic className="h-3.5 w-3.5" />
              </button>

              {/* Divider */}
              <span className="w-px h-5 bg-neutral-200 mx-0.5" />

              {/* Undo / Redo */}
              <button 
                onClick={() => insertHeading('normal')}
                className="h-7 w-7 rounded-full hover:bg-neutral-50 text-[#555552] flex items-center justify-center"
                title="Annuler"
              >
                <Undo2 className="h-3.5 w-3.5" />
              </button>
              <button 
                className="h-7 w-7 rounded-full hover:bg-neutral-50 text-[#555552] flex items-center justify-center opacity-40 cursor-not-allowed"
                title="Rétablir"
                disabled
              >
                <Redo2 className="h-3.5 w-3.5" />
              </button>

              {/* Copy */}
              <button
                onClick={copyToClipboard}
                className="h-7 w-7 rounded-full hover:bg-neutral-50 text-[#555552] flex items-center justify-center relative active:scale-95 transition-all"
                title="Copier le document"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              </button>

              {/* Export dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowExportDropdown(!showExportDropdown)}
                  className="h-7 px-3 rounded-full bg-[#26251e] hover:bg-[#1a1a19] text-white text-[10px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Export</span>
                  <ChevronDown className="h-3 w-3" />
                </button>

                {showExportDropdown && (
                  <div className="absolute right-0 top-8 z-50 bg-white border border-[#e6e5e0] rounded-xl py-1 shadow-lg w-36 text-left">
                    <button
                      onClick={() => handleExport('markdown')}
                      className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-[#26251e] hover:bg-neutral-50 flex items-center gap-2"
                    >
                      <FileText className="h-3.5 w-3.5 text-neutral-400" />
                      <span>Markdown (.md)</span>
                    </button>
                    <button
                      onClick={() => handleExport('html')}
                      className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-[#26251e] hover:bg-neutral-50 flex items-center gap-2"
                    >
                      <Globe className="h-3.5 w-3.5 text-neutral-400" />
                      <span>Page HTML (.html)</span>
                    </button>
                    <button
                      onClick={() => handleExport('txt')}
                      className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-[#26251e] hover:bg-neutral-50 flex items-center gap-2"
                    >
                      <FileText className="h-3.5 w-3.5 text-neutral-400" />
                      <span>Texte Brut (.txt)</span>
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
                placeholder="Commencez à rédiger ou posez une question à l'assistant pour générer du contenu..."
                className="w-full flex-1 border-0 resize-none outline-none focus:outline-none focus:ring-0 text-sm leading-relaxed text-[#26251e] font-sans placeholder:text-neutral-300"
              />
            </div>

            {/* Right floating options gutter */}
            <div className="hidden lg:flex flex-col gap-3 ml-4 self-start border-l border-neutral-100 pl-4 shrink-0 select-none">
              <button className="h-8 w-8 rounded-lg hover:bg-neutral-50 text-[#807d72] hover:text-[#26251e] flex items-center justify-center" title="Commentaires">
                <MessageSquare className="h-4 w-4" />
              </button>
              <button className="h-8 w-8 rounded-lg hover:bg-neutral-50 text-[#807d72] hover:text-[#26251e] flex items-center justify-center" title="Historique de révisions">
                <History className="h-4 w-4" />
              </button>
              <button className="h-8 w-8 rounded-lg hover:bg-neutral-50 text-[#807d72] hover:text-[#26251e] flex items-center justify-center" title="Paramètres d'édition">
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default AssistantRoot;
