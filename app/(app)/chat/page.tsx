'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Paperclip, 
  Send, 
  Mic, 
  X, 
  FileText, 
  Check, 
  ChevronDown, 
  Bold, 
  Italic, 
  Type, 
  Copy, 
  Download,
  Globe, 
  Monitor, 
  Table, 
  BarChart3, 
  Image as ImageIcon, 
  Sparkles,
  Bot,
  Link2,
  Trash2,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Database,
  ArrowRight
} from 'lucide-react';
import { useLanguage } from '@/lib/language-context';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { createClient } from '@/lib/supabase/client';

interface Attachment {
  id: string;
  name: string;
  size: string;
  type: string;
  progress: number;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  attachments?: Attachment[];
  canvas?: {
    title: string;
    content: string;
  };
  timestamp: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  model: string;
  activeTools: string[];
}

function ProgressBar({ progress }: { progress: number }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (ref.current) {
      ref.current.style.width = `${progress}%`;
    }
  }, [progress]);
  return <div ref={ref} className="bg-[#f54e00] h-full rounded-full transition-all" />;
}

export default function ChatPage() {
  const { t, locale } = useLanguage();
  
  // Model and Tool list options
  const models = [
    { id: 'anthropic/claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', icon: Sparkles, desc: 'Recommandé - Modèle le plus intelligent' },
    { id: 'openai/gpt-4o', name: 'GPT-4o', icon: Bot, desc: 'Traitement rapide et équilibré' },
    { id: 'meta-llama/llama-3-8b-instruct:free', name: 'Llama 3 8B (Free)', icon: Database, desc: 'Modèle léger et gratuit' },
    { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B (Free)', icon: Database, desc: 'Alternative européenne gratuite' }
  ];

  const tools = [
    { id: 'web_search', label: t('chat.web_search') || 'Recherche Web', icon: Globe },
    { id: 'deep_research', label: t('chat.deep_research') || 'Recherche approfondie', icon: Sparkles },
    { id: 'canvas', label: t('chat.canvas') || 'Canvas', icon: FileText },
    { id: 'knowledge', label: t('chat.knowledge') || 'Connaissance entreprise', icon: Database }
  ];

  // Component States
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState(models[0]);
  const [activeTools, setActiveTools] = useState<string[]>(['canvas']);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [appConnectClosed, setAppConnectClosed] = useState(false);

  // Canvas Side panel states
  const [canvasDoc, setCanvasDoc] = useState<{ title: string; content: string } | null>(null);
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [canvasSavedText, setCanvasSavedText] = useState('Enregistré il y a 0s');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load user default model preference from database settings or fallback to default session
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: dbSettings } = await supabase
            .from('settings')
            .select('default_model, chat_capabilities')
            .eq('user_id', user.id)
            .maybeSingle();

          if (dbSettings) {
            const defaultModelId = dbSettings.default_model;
            const foundModel = models.find(m => m.id === defaultModelId || m.name === defaultModelId);
            if (foundModel) setSelectedModel(foundModel);

            if (dbSettings.chat_capabilities && Array.isArray(dbSettings.chat_capabilities)) {
              // Map DB keys to matching local tool IDs
              const toolIds = dbSettings.chat_capabilities.filter((c: string) => 
                ['web_search', 'deep_research', 'canvas', 'knowledge'].includes(c)
              );
              if (toolIds.length > 0) setActiveTools(toolIds);
            }
          }
        }
      } catch (e) {
        console.error("Failed to load user preferences:", e);
      }
    };
    loadPreferences();
  }, []);

  // Restore chats from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('minerva_chat_sessions');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.length > 0) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setSessions(parsed);
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setCurrentSessionId(parsed[0].id);
          // Auto-open Canvas if the last message had one
          const lastMsg = parsed[0].messages[parsed[0].messages.length - 1];
          if (lastMsg?.canvas) {
            setCanvasDoc(lastMsg.canvas);
            setIsCanvasOpen(true);
          }
          return;
        }
      } catch (e) {
        console.error("Failed to parse stored chat sessions", e);
      }
    }
    
    // Seed an empty initial session
    const initialSession: ChatSession = {
      id: 'default-session',
      title: 'New Chat',
      messages: [],
      model: models[0].id,
      activeTools: ['canvas']
    };
    setSessions([initialSession]);
    setCurrentSessionId(initialSession.id);
  }, []);

  // Sync sessions to localStorage
  const saveSessions = (updated: ChatSession[]) => {
    setSessions(updated);
    localStorage.setItem('minerva_chat_sessions', JSON.stringify(updated));
  };

  const currentSession = useMemo(() => {
    return sessions.find(s => s.id === currentSessionId) || null;
  }, [sessions, currentSessionId]);

  // Scroll to bottom helper
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages, isLoading]);

  // Auto grow textarea input height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  // Greeting helper matching Langdock time slots
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return t('chat.morning');
    if (hour >= 12 && hour < 18) return t('chat.afternoon');
    return t('chat.evening');
  };

  const toggleTool = (toolId: string) => {
    setActiveTools(prev => 
      prev.includes(toolId) ? prev.filter(t => t !== toolId) : [...prev, toolId]
    );
  };

  // Trigger File Input click
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  // Mock File upload capsule rendering
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: Attachment[] = Array.from(files).map((f, idx) => ({
      id: `${Date.now()}-${idx}`,
      name: f.name,
      size: `${(f.size / 1024 / 1024).toFixed(1)} MB`,
      type: f.type,
      progress: 0
    }));

    setAttachments(prev => [...prev, ...newAttachments]);

    // Simulate upload progress
    newAttachments.forEach(att => {
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += 25;
        setAttachments(prev => 
          prev.map(a => a.id === att.id ? { ...a, progress: currentProgress } : a)
        );
        if (currentProgress >= 100) {
          clearInterval(interval);
        }
      }, 200);
    });
  };

  const deleteAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  // Parse custom Canvas block from streaming text: ```canvas:Title ... ```
  const parseCanvasBlock = (text: string) => {
    const canvasRegex = /```canvas:([^\n]+)\n([\s\S]*?)```/g;
    const matches = Array.from(text.matchAll(canvasRegex));
    if (matches.length > 0) {
      const lastMatch = matches[matches.length - 1];
      const title = lastMatch[1].trim();
      const content = lastMatch[2];
      return { title, content };
    }
    return null;
  };

  // Handle message sending
  const handleSendMessage = async (textToSend?: string) => {
    const messageText = textToSend || input;
    if (!messageText.trim() && attachments.length === 0) return;

    if (!currentSession) return;

    const userMessage: Message = {
      role: 'user',
      content: messageText,
      attachments: attachments.length > 0 ? [...attachments] : undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...currentSession.messages, userMessage];
    const updatedSession = {
      ...currentSession,
      title: currentSession.messages.length === 0 ? (messageText.slice(0, 30) + (messageText.length > 30 ? '...' : '')) : currentSession.title,
      messages: updatedMessages
    };

    saveSessions(sessions.map(s => s.id === currentSessionId ? updatedSession : s));
    
    // Reset state inputs
    setInput('');
    setAttachments([]);
    setIsLoading(true);

    // Initial assistant streaming container
    const assistantMessage: Message = {
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const sessionWithAssistant = {
      ...updatedSession,
      messages: [...updatedMessages, assistantMessage]
    };
    saveSessions(sessions.map(s => s.id === currentSessionId ? sessionWithAssistant : s));

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          model: selectedModel.id,
          activeTool: activeTools[0] || ''
        })
      });

      if (!response.ok) throw new Error("Chat generation failed");
      if (!response.body) throw new Error("No readable stream body returned");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        // Process SSE lines
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') break;
            try {
              const parsed = JSON.parse(dataStr);
              const wordDelta = parsed.choices[0]?.delta?.content || '';
              streamedContent += wordDelta;

              // Check if streamed content generates a canvas artifact block
              const doc = parseCanvasBlock(streamedContent);
              if (doc) {
                setCanvasDoc(doc);
                setIsCanvasOpen(true);
              }

              // Update session message stream in real-time
              const finalMessageList = [...updatedMessages, {
                ...assistantMessage,
                content: streamedContent,
                canvas: doc || undefined
              }];

              saveSessions(sessions.map(s => s.id === currentSessionId ? {
                ...updatedSession,
                messages: finalMessageList
              } : s));

            } catch (e) {
              // Partial JSON packet ignore
            }
          }
        }
      }

    } catch (err) {
      console.error(err);
      // Fallback fallback error message
      saveSessions(sessions.map(s => s.id === currentSessionId ? {
        ...updatedSession,
        messages: [...updatedMessages, {
          ...assistantMessage,
          content: "Désolé, une erreur est survenue lors de la communication avec le copilote."
        }]
      } : s));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestClick = (prompt: string) => {
    setInput(prompt);
    handleSendMessage(prompt);
  };

  // Clear current history and create a fresh session
  const handleNewChat = () => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: 'New Chat',
      messages: [],
      model: selectedModel.id,
      activeTools: ['canvas']
    };
    saveSessions([newSession, ...sessions]);
    setCurrentSessionId(newSession.id);
    setCanvasDoc(null);
    setIsCanvasOpen(false);
  };

  // Canvas manual save simulation
  const handleCanvasContentChange = (newContent: string) => {
    if (!canvasDoc) return;
    const updatedDoc = { ...canvasDoc, content: newContent };
    setCanvasDoc(updatedDoc);
    
    // Update it in the last message of the session to persist
    if (currentSession) {
      const msgs = [...currentSession.messages];
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === 'assistant' && msgs[i].canvas) {
          msgs[i] = {
            ...msgs[i],
            canvas: updatedDoc
          };
          break;
        }
      }
      saveSessions(sessions.map(s => s.id === currentSessionId ? { ...currentSession, messages: msgs } : s));
    }

    setCanvasSavedText('Enregistrement...');
    setTimeout(() => {
      setCanvasSavedText('Enregistré il y a 0s');
    }, 500);
  };

  const handleCopyCanvas = () => {
    if (!canvasDoc) return;
    navigator.clipboard.writeText(canvasDoc.content);
    setCanvasSavedText('Copié !');
    setTimeout(() => {
      setCanvasSavedText('Enregistré il y a 0s');
    }, 1200);
  };

  const handleExportCanvas = () => {
    if (!canvasDoc) return;
    const element = document.createElement("a");
    const file = new Blob([canvasDoc.content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${canvasDoc.title.toLowerCase().replace(/\s+/g, '_')}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="flex h-full w-full bg-white select-none overflow-hidden relative">
      {/* Hidden file selector */}
      <input 
        type="file" 
        multiple
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept=".pdf,.doc,.docx,.txt,.csv,.png,.jpg"
        title="Sélectionner des fichiers"
        aria-label="Sélectionner des fichiers"
      />

      {/* Main Chat Layout Area (width splits dynamically when canvas is open) */}
      <div className={cn(
        "flex flex-col h-full bg-[#fcfcfb] border-r border-[#e5e5e0] transition-all duration-300",
        isCanvasOpen ? "w-1/2" : "w-full"
      )}>
        
        {/* Top Header bar with Model & Tool pill selector */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#e5e5e0] bg-white px-6">
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 text-xs font-semibold text-[#26251e] hover:bg-[#e5e5e2]/60 flex items-center gap-1.5 px-2.5 rounded-md"
                >
                  <selectedModel.icon className="w-3.5 h-3.5 text-[#f54e00]" />
                  <span>{selectedModel.name}</span>
                  <ChevronDown className="w-3 h-3 text-[#7a7a76]" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-1 border border-[#e5e5e0] bg-white rounded-lg shadow-lg z-50 text-left">
                {models.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedModel(m)}
                    className="w-full text-left px-2.5 py-2 text-xs rounded hover:bg-[#e5e5e2]/50 transition-colors flex items-start gap-2.5"
                  >
                    <m.icon className="w-4 h-4 text-[#f54e00] shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[#26251e] flex items-center justify-between">
                        <span>{m.name}</span>
                        {selectedModel.id === m.id && <Check className="w-3 h-3 text-emerald-600" />}
                      </div>
                      <p className="text-[10px] text-[#7a7a76] truncate leading-normal mt-0.5">{m.desc}</p>
                    </div>
                  </button>
                ))}
              </PopoverContent>
            </Popover>

            <div className="h-4 w-px bg-[#e5e5e0]" />

            {/* Active Tool triggers */}
            <div className="flex items-center gap-1">
              {tools.map(tool => {
                const isToolActive = activeTools.includes(tool.id);
                return (
                  <button
                    key={tool.id}
                    onClick={() => toggleTool(tool.id)}
                    className={cn(
                      "flex items-center gap-1 h-7 px-2.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all",
                      isToolActive 
                        ? "bg-[#26251e] text-white border border-[#26251e]" 
                        : "bg-white text-[#7a7a76] border border-[#e5e5e0] hover:border-[#7a7a76] hover:text-[#26251e]"
                    )}
                  >
                    <tool.icon className="w-3 h-3 shrink-0" />
                    <span>{tool.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Button 
            onClick={handleNewChat}
            variant="ghost" 
            size="sm" 
            className="h-8 text-xs font-semibold text-[#555552] hover:bg-[#e5e5e2]/60 px-2.5 border border-[#e5e5e0] rounded-md"
          >
            New Chat
          </Button>
        </div>

        {/* Messaging Container */}
        <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin p-6">
          <div className="max-w-2xl mx-auto flex flex-col gap-6">
            
            {/* Show greeting and tools suggestions if conversation is empty */}
            {(!currentSession || currentSession.messages.length === 0) ? (
              <div className="py-8 space-y-8 animate-in fade-in duration-300">
                
                {/* Apps Connections Prompt Box */}
                {!appConnectClosed && (
                  <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl flex items-center justify-between gap-4 text-left animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 shrink-0">
                        <Link2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-[#26251e]">{t('chat.connect_apps')}</h4>
                        <p className="text-[10px] text-[#7a7a76] leading-normal mt-0.5">
                          Synchronisez vos e-mails de prospection, documents et notes pour enrichir l&apos;IA.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      {/* Brand icon previews */}
                      <div className="flex -space-x-1">
                        <div className="w-5 h-5 rounded-full border border-white bg-white shadow-xs flex items-center justify-center font-bold text-[8px] text-blue-600">G</div>
                        <div className="w-5 h-5 rounded-full border border-white bg-white shadow-xs flex items-center justify-center font-bold text-[8px] text-emerald-600">N</div>
                        <div className="w-5 h-5 rounded-full border border-white bg-white shadow-xs flex items-center justify-center font-bold text-[8px] text-purple-600">S</div>
                      </div>
                      <button 
                        onClick={() => setAppConnectClosed(true)}
                        className="p-1 rounded-full hover:bg-neutral-200/50 text-[#7a7a76] hover:text-[#26251e] transition-colors"
                        title="Fermer"
                        aria-label="Fermer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Big Centered Greeting */}
                <div className="text-center space-y-3 pt-6">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-[#e5e5e0] shadow-sm flex items-center justify-center mx-auto text-[#f54e00] font-bold text-lg">
                    M
                  </div>
                  <h1 className="text-xl font-bold tracking-tight text-[#26251e]">
                    {getGreeting()}
                  </h1>
                </div>

                {/* Quick Action Suggestion Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
                  <button 
                    onClick={() => handleSuggestClick("Rédiger un email de prospection pour la boulangerie L'Épi d'Or")}
                    className="p-3 bg-white hover:bg-[#e5e5e2]/30 border border-[#e5e5e0] hover:border-[#7a7a76] rounded-xl text-left transition-all group flex items-start gap-3"
                  >
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 shrink-0 mt-0.5">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-[#26251e] flex items-center gap-1">
                        <span>Créer un document</span>
                        <ArrowRight className="w-3 h-3 text-[#7a7a76] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h3>
                      <p className="text-[10px] text-[#7a7a76] mt-0.5 leading-normal">
                        Rédigez des propositions commerciales et ouvrez-les directement dans le Canvas.
                      </p>
                    </div>
                  </button>

                  <button 
                    onClick={() => handleSuggestClick("Génère un rapport d'analyse de mes performances de prospection locales")}
                    className="p-3 bg-white hover:bg-[#e5e5e2]/30 border border-[#e5e5e0] hover:border-[#7a7a76] rounded-xl text-left transition-all group flex items-start gap-3"
                  >
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 shrink-0 mt-0.5">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-[#26251e] flex items-center gap-1">
                        <span>Visualiser les données</span>
                        <ArrowRight className="w-3 h-3 text-[#7a7a76] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h3>
                      <p className="text-[10px] text-[#7a7a76] mt-0.5 leading-normal">
                        Calculez les indicateurs de performance clés (KPI) et taux de closing.
                      </p>
                    </div>
                  </button>

                  <button 
                    onClick={() => handleSuggestClick("Générer un visuel promotionnel minimaliste pour notre agence de marketing")}
                    className="p-3 bg-white hover:bg-[#e5e5e2]/30 border border-[#e5e5e0] hover:border-[#7a7a76] rounded-xl text-left transition-all group flex items-start gap-3"
                  >
                    <div className="p-2 rounded-lg bg-orange-500/10 text-orange-600 shrink-0 mt-0.5">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-[#26251e] flex items-center gap-1">
                        <span>Générer une image</span>
                        <ArrowRight className="w-3 h-3 text-[#7a7a76] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h3>
                      <p className="text-[10px] text-[#7a7a76] mt-0.5 leading-normal">
                        Créez des mockups ou des bannières à intégrer à vos documents.
                      </p>
                    </div>
                  </button>

                  <button 
                    onClick={() => handleSuggestClick("Aide-moi à structurer mon plan d'onboarding pour de nouveaux clients")}
                    className="p-3 bg-white hover:bg-[#e5e5e2]/30 border border-[#e5e5e0] hover:border-[#7a7a76] rounded-xl text-left transition-all group flex items-start gap-3"
                  >
                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-[#26251e] flex items-center gap-1">
                        <span>Assistant Onboarding</span>
                        <ArrowRight className="w-3 h-3 text-[#7a7a76] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h3>
                      <p className="text-[10px] text-[#7a7a76] mt-0.5 leading-normal">
                        Consultez des playbooks de vente pour maximiser l&apos;activation des leads.
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              // Message Streams
              <div className="space-y-6">
                {currentSession.messages.map((msg, idx) => {
                  const isUser = msg.role === 'user';
                  
                  // Hide raw canvas code block formatting string from user visual chat rendering
                  let visibleContent = msg.content;
                  if (msg.canvas) {
                    visibleContent = msg.content.replace(/```canvas:([^\n]+)\n([\s\S]*?)```/g, '').trim();
                  }

                  return (
                    <div 
                      key={idx} 
                      className={cn(
                        "flex flex-col text-left max-w-[85%] rounded-2xl p-4 shadow-2xs border text-xs leading-relaxed transition-all",
                        isUser 
                          ? "self-end bg-[#26251e] border-[#26251e] text-white ml-auto rounded-tr-none" 
                          : "self-start bg-white border-[#e5e5e0] text-[#26251e] mr-auto rounded-tl-none"
                      )}
                    >
                      {/* Header metadata */}
                      <div className="flex items-center justify-between gap-4 border-b border-white/10 dark:border-neutral-100/10 pb-1.5 mb-1.5 opacity-80 text-[10px]">
                        <span className="font-bold flex items-center gap-1 uppercase tracking-wider">
                          {isUser ? 'Moi' : selectedModel.name}
                        </span>
                        <span>{msg.timestamp}</span>
                      </div>

                      {/* Message attachments capsules rendering inside chat bubbles */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="flex flex-col gap-1.5 mb-2.5">
                          {msg.attachments.map(att => (
                            <div key={att.id} className="flex items-center gap-2 p-2 rounded-lg bg-neutral-500/10 border border-neutral-500/15 max-w-[240px]">
                              <FileText className="w-3.5 h-3.5 text-red-500 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-[9px] truncate">{att.name}</p>
                                <p className="text-[8px] opacity-75">{att.size}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Body Markdown Content */}
                      <div className="space-y-2 prose prose-xs prose-neutral select-text">
                        {visibleContent.split('\n\n').map((para, pidx) => {
                          // Handle visual markdown rendering fallback
                          if (para.startsWith('![') && para.includes('](')) {
                            // Extract image
                            const imgUrl = para.match(/\(([^)]+)\)/)?.[1];
                            const altText = para.match(/\[([^\]]+)\]/)?.[1] || 'Visuel';
                            return (
                              <div key={pidx} className="my-2 border border-neutral-100 rounded-lg overflow-hidden shadow-xs">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={imgUrl} alt={altText} className="w-full h-auto object-cover max-h-48" />
                              </div>
                            );
                          }
                          
                          if (para.startsWith('-') || para.startsWith('*')) {
                            // List items
                            return (
                              <ul key={pidx} className="list-disc pl-4 space-y-1 my-1">
                                {para.split('\n').map((li, lidx) => (
                                  <li key={lidx}>{li.replace(/^[-*]\s+/, '')}</li>
                                ))}
                              </ul>
                            );
                          }

                          if (para.startsWith('1.') || para.startsWith('2.')) {
                            // Ordered list items
                            return (
                              <ol key={pidx} className="list-decimal pl-4 space-y-1 my-1">
                                {para.split('\n').map((li, lidx) => (
                                  <li key={lidx}>{li.replace(/^\d+\.\s+/, '')}</li>
                                ))}
                              </ol>
                            );
                          }

                          return <p key={pidx} className="whitespace-pre-wrap">{para}</p>;
                        })}
                      </div>

                      {/* Artifact Capsule overlay to re-open Canvas panel if closed */}
                      {msg.canvas && (
                        <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between">
                          <button
                            onClick={() => {
                              setCanvasDoc(msg.canvas!);
                              setIsCanvasOpen(true);
                            }}
                            className={cn(
                              "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-semibold transition-all",
                              isUser 
                                ? "bg-white/10 border-white/20 text-white hover:bg-white/15" 
                                : "bg-neutral-100 border-neutral-200 text-[#26251e] hover:bg-neutral-200/50"
                            )}
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Ouvrir dans Canvas : {msg.canvas.title}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Chat input wrapper */}
        <div className="p-4 bg-white border-t border-[#e5e5e0] shrink-0">
          <div className="max-w-2xl mx-auto space-y-2 text-left">
            
            {/* Attachment capsules preview */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 pb-2">
                {attachments.map(att => (
                  <div key={att.id} className="relative flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs max-w-[200px] group select-none">
                    <FileText className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[10px] text-[#26251e] truncate">{att.name}</p>
                      {att.progress < 100 ? (
                        <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden mt-0.5">
                          <ProgressBar progress={att.progress} />
                        </div>
                      ) : (
                        <p className="text-[8px] text-[#7a7a76] mt-0.5 leading-none">Chargé</p>
                      )}
                    </div>
                    <button 
                      onClick={() => deleteAttachment(att.id)}
                      className="p-0.5 rounded-full hover:bg-red-100 text-[#7a7a76] hover:text-red-600 transition-colors"
                      title="Supprimer l'attachement"
                      aria-label="Supprimer l'attachement"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input Box frame container */}
            <div className="relative border border-[#e5e5e0] bg-white rounded-2xl shadow-xs focus-within:ring-1 focus-within:ring-[#f54e00]/40 focus-within:border-[#f54e00]/50 transition-all flex flex-col p-1">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('chat.placeholder') || "Demandez n'importe quoi, @ pour le contexte..."}
                rows={1}
                className="w-full text-xs p-3 bg-transparent border-0 outline-hidden focus:ring-0 resize-none min-h-[40px] text-[#26251e]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />

              <div className="flex items-center justify-between border-t border-[#e5e5e0]/40 pt-1 pb-1 px-2">
                {/* Left tools icons inside input box */}
                <div className="flex items-center gap-1">
                  <button 
                    onClick={handleAttachmentClick}
                    className="p-1.5 rounded-lg hover:bg-neutral-100 text-[#7a7a76] hover:text-[#26251e] transition-colors"
                    title="Ajouter une pièce jointe"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  
                  <button 
                    className="p-1.5 rounded-lg hover:bg-neutral-100 text-[#7a7a76] hover:text-[#26251e] transition-colors"
                    title="Entrée vocale"
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                </div>

                {/* Submit button on right */}
                <Button
                  onClick={() => handleSendMessage()}
                  disabled={isLoading || (!input.trim() && attachments.length === 0)}
                  size="icon"
                  className={cn(
                    "w-7 h-7 rounded-xl transition-all duration-200",
                    (input.trim() || attachments.length > 0) 
                      ? "bg-[#f54e00] text-white hover:bg-[#d44300]" 
                      : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                  )}
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Side-by-Side Canvas Document Editor Panel */}
      {isCanvasOpen && canvasDoc && (
        <div className="w-1/2 h-full bg-white flex flex-col animate-in slide-in-from-right duration-300 relative">
          
          {/* Canvas Header */}
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#e5e5e0] px-4 select-none">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-[#f54e00]/10 text-[#f54e00]">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-[#26251e] truncate max-w-[200px]">{canvasDoc.title}</span>
              <span className="text-[9px] text-[#7a7a76] bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded ml-2">
                {canvasSavedText}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Button 
                onClick={handleCopyCanvas}
                variant="ghost" 
                size="sm" 
                className="h-7 text-[10px] font-bold uppercase tracking-wider text-[#555552] hover:bg-[#e5e5e2]/60 px-2 rounded flex items-center gap-1 border border-[#e5e5e0]"
              >
                <Copy className="w-3 h-3" />
                <span>{t('canvas.copy') || 'Copier'}</span>
              </Button>

              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-[10px] font-bold uppercase tracking-wider text-[#555552] hover:bg-[#e5e5e2]/60 px-2 rounded flex items-center gap-1 border border-[#e5e5e0]"
                  >
                    <Download className="w-3 h-3" />
                    <span>{t('canvas.export') || 'Exporter'}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-40 p-1 border border-[#e5e5e0] bg-white rounded-lg shadow-lg z-50 text-left">
                  <button
                    onClick={handleExportCanvas}
                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-[#e5e5e2]/50 transition-colors flex items-center gap-2 text-[#26251e] font-semibold"
                  >
                    <FileText className="w-3.5 h-3.5 text-red-500" />
                    <span>Markdown (.md)</span>
                  </button>
                </PopoverContent>
              </Popover>

              <div className="h-4 w-px bg-[#e5e5e0] mx-1" />

              <button 
                onClick={() => setIsCanvasOpen(false)}
                className="p-1 rounded-full hover:bg-neutral-100 text-[#7a7a76] hover:text-[#26251e] transition-colors"
                title="Fermer le Canvas"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Formatting Toolbar */}
          <div className="flex items-center gap-1 border-b border-[#e5e5e0]/60 px-4 py-1.5 bg-[#fbfbfb]">
            <button 
              className="p-1 rounded hover:bg-[#e5e5e2]/60 text-[#555552] hover:text-[#26251e] transition-colors"
              title="Heading (Titre)"
              onClick={() => {
                // Prepend # to active line simulation
                handleCanvasContentChange("# " + canvasDoc.content);
              }}
            >
              <Type className="w-3.5 h-3.5" />
            </button>

            <button 
              className="p-1 rounded hover:bg-[#e5e5e2]/60 text-[#555552] hover:text-[#26251e] transition-colors font-bold"
              title="Bold (Gras)"
              onClick={() => {
                handleCanvasContentChange(canvasDoc.content + " **texte**");
              }}
            >
              <Bold className="w-3.5 h-3.5" />
            </button>

            <button 
              className="p-1 rounded hover:bg-[#e5e5e2]/60 text-[#555552] hover:text-[#26251e] transition-colors italic"
              title="Italic (Italique)"
              onClick={() => {
                handleCanvasContentChange(canvasDoc.content + " *texte*");
              }}
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Text Area Canvas editor wrapper */}
          <div className="flex-1 p-6 overflow-y-auto">
            <textarea
              value={canvasDoc.content}
              onChange={(e) => handleCanvasContentChange(e.target.value)}
              className="w-full h-full text-xs leading-relaxed focus:outline-none resize-none bg-transparent text-[#26251e] font-mono select-text"
              placeholder="Rédigez ou éditez le contenu de votre document..."
            />
          </div>

        </div>
      )}

    </div>
  );
}
