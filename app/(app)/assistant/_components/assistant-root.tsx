'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useReach } from '@/lib/reach-context';
import { getApiUrl } from '@/lib/api-helper';
import { createClient } from '@/lib/supabase/client';
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

interface Message {
  role: 'user' | 'assistant';
  content: string;
  attachedFile?: { name: string; type: string };
  isSimulated?: boolean;
}

interface CanvasDocument {
  title: string;
  content: string;
  lastSaved: string;
}

const AI_MODELS = [
  { id: 'meta-llama/llama-3-8b-instruct:free', name: 'Minerva AI (Llama 3.1)', provider: 'openrouter' },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'anthropic' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' }
];

export function AssistantRoot() {
  const { user } = useReach();
  const STORAGE_KEY = 'minerva_assistant_messages';
  const CANVAS_STORAGE_KEY = 'minerva_assistant_canvas';

  // State Management
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(AI_MODELS[0]);
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  // File Attachment Simulation
  const [attachedFile, setAttachedFile] = useState<{ name: string; type: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice Interaction Simulation
  const [isRecording, setIsRecording] = useState(false);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Canvas State
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [canvasDoc, setCanvasDoc] = useState<CanvasDocument | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(CANVAS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  // Editor states
  const [editorTitle, setEditorTitle] = useState(canvasDoc?.title || "Document sans titre");
  const [editorContent, setEditorContent] = useState(canvasDoc?.content || "");
  const [isSavedIndicator, setIsSavedIndicator] = useState("Modifications enregistrées");
  const [headingFormat, setHeadingFormat] = useState("normal");
  const [copied, setCopied] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync states to local storage
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (typeof window !== 'undefined') {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch {}
    }
  }, [messages]);

  useEffect(() => {
    if (canvasDoc && typeof window !== 'undefined') {
      try { localStorage.setItem(CANVAS_STORAGE_KEY, JSON.stringify(canvasDoc)); } catch {}
    }
  }, [canvasDoc]);

  // Handle title & content sync to state
  useEffect(() => {
    if (canvasDoc) {
      setEditorTitle(canvasDoc.title);
      setEditorContent(canvasDoc.content);
    }
  }, [canvasDoc]);

  // Auto-save simulation
  const handleContentChange = (newVal: string) => {
    setEditorContent(newVal);
    setIsSavedIndicator("Enregistrement...");
    
    // Simulate auto-save delay
    const timer = setTimeout(() => {
      if (canvasDoc) {
        setCanvasDoc({
          ...canvasDoc,
          content: newVal
        });
      } else {
        setCanvasDoc({
          title: editorTitle,
          content: newVal,
          lastSaved: "À l'instant"
        });
      }
      setIsSavedIndicator("Modifications enregistrées");
    }, 1000);

    return () => clearTimeout(timer);
  };

  const handleTitleChange = (newTitle: string) => {
    setEditorTitle(newTitle);
    setIsSavedIndicator("Enregistrement...");
    
    const timer = setTimeout(() => {
      if (canvasDoc) {
        setCanvasDoc({
          ...canvasDoc,
          title: newTitle
        });
      } else {
        setCanvasDoc({
          title: newTitle,
          content: editorContent,
          lastSaved: "À l'instant"
        });
      }
      setIsSavedIndicator("Modifications enregistrées");
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
              onClick={() => {
                setCanvasDoc({
                  title: canvasData.title,
                  content: canvasData.content,
                  lastSaved: "À l'instant"
                });
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

    // Normal message rendering with attachment support
    return (
      <div className="space-y-2">
        {msg.attachedFile && (
          <div className="inline-flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 border border-border px-3 py-1.5 rounded-lg text-[11px] font-bold">
            <FileText className="h-3.5 w-3.5 text-red-500" />
            <span>{msg.attachedFile.name}</span>
          </div>
        )}
        <p className="whitespace-pre-wrap leading-relaxed text-sm">{msg.content}</p>
      </div>
    );
  };

  // Clear Chat history
  const handleClearChat = () => {
    setMessages([]);
    setCanvasDoc(null);
    setIsCanvasOpen(false);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(CANVAS_STORAGE_KEY);
      } catch {}
    }
  };

  // Send message handler
  const handleSend = async (customPrompt?: string) => {
    const trimmed = (customPrompt || input).trim();
    if (!trimmed && !attachedFile) return;

    setInput('');
    const fileToAttach = attachedFile;
    setAttachedFile(null);

    const userMsg: Message = { 
      role: 'user', 
      content: trimmed,
      attachedFile: fileToAttach || undefined
    };
    
    const history = [...messages, userMsg];
    setMessages(history);
    setIsLoading(true);

    try {
      const res = await fetch(getApiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: history,
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

      // Check if we generated a document block and load it automatically to canvas
      const canvasData = extractCanvasBlock(assistantContent);
      if (canvasData) {
        setCanvasDoc({
          title: canvasData.title,
          content: canvasData.content,
          lastSaved: "À l'instant"
        });
        setIsCanvasOpen(true);
      }

    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Une erreur de communication est survenue. Veuillez réessayer.' }]);
    } finally {
      setIsLoading(false);
    }
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

  // File Upload Handlers
  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile({
        name: file.name,
        type: file.type || 'document/pdf'
      });
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
      
      {/* ── LEFT PANEL: CHAT INTERFACE ── */}
      <div className={`flex flex-col h-full bg-white transition-all duration-300 relative ${
        isCanvasOpen ? 'w-full md:w-[40%] border-r border-[#e6e5e0]' : 'w-full'
      }`}>
        
        {/* Header toolbar */}
        <header className="h-14 border-b border-[#e6e5e0]/60 px-4 flex items-center justify-between shrink-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-[#10b981]/15 text-[#10b981] flex items-center justify-center shrink-0">
              <MinervaIcon size={14} />
            </div>
            <span className="text-xs font-bold text-foreground">Minerva AI Assistant</span>
          </div>

          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearChat}
                className="text-[10px] h-7 font-bold text-muted-foreground hover:text-red-600 gap-1 rounded-full px-2.5 transition-colors border border-transparent hover:border-red-100"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Effacer</span>
              </Button>
            )}
          </div>
        </header>

        {/* Message Feed / Chat Window */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-white">
          {messages.length === 0 ? (
            /* Splash Centered Screen */
            <div className="flex flex-col items-center justify-center min-h-full py-16 px-6 max-w-xl mx-auto space-y-8">
              
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="h-10 w-10 rounded-xl bg-white border border-[#e6e5e0] text-[#10b981] flex items-center justify-center shadow-sm">
                  <MinervaIcon size={24} />
                </div>
                <h1 className="text-3xl tracking-tight text-[#26251e] font-serif font-light font-georgia leading-tight">
                  Still at it! What can I help with?
                </h1>
              </div>

              {/* Central Text Area Card */}
              <div className="w-full border border-[#e6e5e0] rounded-2xl bg-white shadow-sm flex flex-col p-3 space-y-3 focus-within:border-[#10b981] transition-colors relative z-20">
                {attachedFile && (
                  <div className="flex items-center justify-between bg-neutral-50 border border-neutral-100 px-3 py-2 rounded-xl text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-red-500 shrink-0" />
                      <span className="font-bold text-[#26251e] truncate">{attachedFile.name}</span>
                      <span className="text-[10px] text-neutral-400 uppercase font-semibold shrink-0">Document</span>
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
                  placeholder="Ask anything, @ for context and skills..."
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
                      accept=".pdf,.txt,.doc,.docx"
                    />
                    <button 
                      onClick={triggerFileUpload}
                      className="h-7 w-7 rounded-full bg-neutral-50 hover:bg-neutral-100 text-[#555552] flex items-center justify-center cursor-pointer transition-colors border border-transparent active:scale-95"
                      title="Joindre un fichier"
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
                        <div className="absolute right-0 bottom-8 z-50 bg-white border border-[#e6e5e0] rounded-xl py-1 shadow-lg w-52 text-left">
                          <div className="px-3 py-1 text-[8px] font-bold text-muted-foreground uppercase tracking-wider">Modèles Disponibles</div>
                          {AI_MODELS.map((model) => (
                            <button
                              key={model.id}
                              onClick={() => {
                                setSelectedModel(model);
                                setShowModelDropdown(false);
                              }}
                              className={`w-full text-left px-3 py-1.5 text-[10px] font-bold flex items-center justify-between hover:bg-neutral-50 ${
                                selectedModel.id === model.id ? 'text-primary' : 'text-[#26251e]'
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
                      className="h-7 w-7 rounded-full bg-[#3b82f6] hover:bg-[#2563eb] text-white flex items-center justify-center cursor-pointer transition-all shadow-sm active:scale-95 disabled:opacity-50"
                      title="Envoyer"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Prompt Bubbles Grid */}
              <div className="w-full space-y-2">
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  {QUICK_PROMPTS.slice(0, 4).map((chip) => (
                    <button
                      key={chip.label}
                      onClick={() => handleSend(chip.value)}
                      className="bg-white border border-[#e6e5e0] hover:bg-[#f7f7f4] hover:border-neutral-300 text-[10.5px] font-bold text-[#555552] px-3.5 py-1.5 rounded-full cursor-pointer transition-all active:scale-95 shadow-none"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  {QUICK_PROMPTS.slice(4).map((chip) => (
                    <button
                      key={chip.label}
                      onClick={() => handleSend(chip.value)}
                      className="bg-white border border-[#e6e5e0] hover:bg-[#f7f7f4] hover:border-neutral-300 text-[10.5px] font-bold text-[#555552] px-3.5 py-1.5 rounded-full cursor-pointer transition-all active:scale-95 shadow-none"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            /* Active message feed container */
            <div className="p-4 space-y-6">
              {messages.map((msg, i) => (
                <div 
                  key={i} 
                  className={`flex gap-3 max-w-[85%] ${
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
                <div className="flex items-center justify-between bg-neutral-50 border border-neutral-100 px-3 py-1.5 rounded-xl text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-3.5 w-3.5 text-red-500 shrink-0" />
                    <span className="font-bold text-[#26251e] truncate">{attachedFile.name}</span>
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
                    accept=".pdf,.txt,.doc,.docx"
                  />
                  <button 
                    onClick={triggerFileUpload}
                    className="h-6 w-6 rounded-full bg-neutral-50 hover:bg-neutral-100 text-[#555552] flex items-center justify-center cursor-pointer transition-colors border border-transparent"
                    title="Joindre un fichier"
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
                      <div className="absolute right-0 bottom-7 z-50 bg-white border border-[#e6e5e0] rounded-xl py-1 shadow-lg w-48 text-left">
                        {AI_MODELS.map((model) => (
                          <button
                            key={model.id}
                            onClick={() => {
                              setSelectedModel(model);
                              setShowModelDropdown(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 text-[9.5px] font-bold flex items-center justify-between hover:bg-neutral-50 ${
                              selectedModel.id === model.id ? 'text-primary' : 'text-[#26251e]'
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
                    className="h-6 w-6 rounded-full bg-[#3b82f6] hover:bg-[#2563eb] text-white flex items-center justify-center cursor-pointer transition-all shadow-sm disabled:opacity-50"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT PANEL: CANVAS DOCUMENT EDITOR (SPLIT VIEW) ── */}
      {isCanvasOpen && (
        <div className={`h-full bg-white flex flex-col z-50 transition-all duration-300 ${
          /* Responsive sizing: full screen on mobile/tablet, flex-1 on desktop */
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
