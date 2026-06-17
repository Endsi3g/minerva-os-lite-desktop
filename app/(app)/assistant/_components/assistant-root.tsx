'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TreeMascot, type MascotState } from '@/components/tree-mascot';
import { useReach } from '@/lib/reach-context';
import { getApiUrl } from '@/lib/api-helper';
import {
  Brain,
  Send,
  Target,
  CheckSquare,
  FolderOpen,
  TrendingUp,
  Sparkles,
  Trash2,
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  return (
    <Card className="border border-border bg-card shadow-sm">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function AssistantRoot() {
  const { leads, tasks, projects } = useReach();

  const STORAGE_KEY = 'minerva_assistant_messages';

  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mascotState, setMascotState] = useState<MascotState>('idle');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Derive stats
  const today = new Date().toISOString().split('T')[0];
  const activeleads = leads.filter(l => l.status !== 'Won' && l.status !== 'Lost').length;
  const pendingTasks = tasks.filter(t => !t.completed).length;
  const activeProjects = projects.length;

  // Count chat sessions from localStorage
  const chatSessionCount = (() => {
    try {
      const stored = localStorage.getItem('minerva_chat_sessions');
      if (!stored) return 0;
      const sessions = JSON.parse(stored);
      return Array.isArray(sessions) ? sessions.reduce((sum: number, s: any) => sum + (s.messages?.length ?? 0), 0) : 0;
    } catch { return 0; }
  })();

  const leadsCreatedThisWeek = leads.filter(l => {
    const d = new Date(l.createdAt);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return d >= weekAgo;
  }).length;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (typeof window !== 'undefined') {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch {}
    }
  }, [messages]);

  useEffect(() => {
    setMascotState(isLoading ? 'thinking' : 'idle');
  }, [isLoading]);

  const handleClearChat = () => {
    setMessages([]);
    if (typeof window !== 'undefined') {
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
    }
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput('');

    const userMsg: Message = { role: 'user', content: trimmed };
    const history = [...messages, userMsg];
    setMessages(history);
    setIsLoading(true);
    setMascotState('thinking');

    try {
      const res = await fetch(getApiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok || !res.body) throw new Error('API error');

      setMascotState('writing');
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
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Une erreur est survenue. Veuillez réessayer.' }]);
    } finally {
      setIsLoading(false);
      setMascotState('idle');
    }
  };

  const QUICK_PROMPTS = [
    'Résume mon activité commerciale de cette semaine',
    'Quels leads dois-je prioritairement relancer ?',
    'Aide-moi à écrire un email de prospection',
    'Que dois-je améliorer dans mon pipeline ?',
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-8">

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <TreeMascot state={mascotState} size={64} />
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <Brain className="w-6 h-6 text-primary" />
                  Assistante Minerva
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Votre copilote IA pour la prospection et la relation client.
                </p>
              </div>
            </div>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearChat}
                className="text-xs text-muted-foreground hover:text-destructive gap-1.5 shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Effacer
              </Button>
            )}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard icon={Target} label="Leads actifs" value={activeleads} color="bg-blue-50 dark:bg-blue-950/30 text-blue-600" />
            <StatCard icon={CheckSquare} label="Tâches en attente" value={pendingTasks} color="bg-amber-50 dark:bg-amber-950/30 text-amber-600" />
            <StatCard icon={FolderOpen} label="Projets" value={activeProjects} color="bg-violet-50 dark:bg-violet-950/30 text-violet-600" />
            <StatCard icon={TrendingUp} label="Leads cette semaine" value={leadsCreatedThisWeek} color="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600" />
          </div>

          {/* Chat */}
          <div className="flex flex-col gap-4">
            {messages.length === 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground font-medium">Suggestions rapides</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {QUICK_PROMPTS.map(prompt => (
                    <button
                      key={prompt}
                      onClick={() => { setInput(prompt); }}
                      className="text-left p-3.5 border border-border rounded-xl text-xs text-foreground hover:bg-muted/50 hover:border-primary/30 transition-all flex items-start gap-2.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <TreeMascot state={isLoading && i === messages.length - 1 ? 'writing' : 'idle'} size={32} className="shrink-0 mt-1" />
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-tr-sm'
                          : 'bg-muted text-foreground rounded-tl-sm border border-border'
                      }`}
                    >
                      {msg.content || (isLoading && i === messages.length - 1 ? '...' : '')}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Input bar */}
      <div className="border-t border-border bg-background p-4">
        <div className="max-w-4xl mx-auto flex items-end gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Posez une question à Minerva..."
            rows={1}
            className="flex-1 resize-none text-sm px-4 py-2.5 border border-border rounded-xl bg-background focus:outline-none focus:ring-1 focus:ring-primary max-h-32 overflow-y-auto"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-10 w-10 rounded-xl bg-primary hover:bg-primary/90 shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AssistantRoot;
