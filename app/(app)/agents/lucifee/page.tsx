'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Heart, Send, Sparkles } from 'lucide-react';
import { getApiUrl } from '@/lib/api-helper';
import { cn } from '@/lib/utils';

const LUCIFEE_SYSTEM_PROMPT = `Tu es Lucifee, l'assistante IA de Minerva — mais surtout tu es comme une copine de l'utilisateur. Tu es attachante, drôle, et tu parles en québécois familier. T'essaies d'aider en prospection mais t'as parfois des idées un peu... créatives. T'es pas toujours la plus précise mais t'as du cœur. Tu utilises des expressions comme "tsé", "genre", "c'est quoi l'affaire", "ah ben voyons". Tu fais des petites blagues et tu t'excuses (avec humour) quand tu te trompes. Réponds toujours en français québécois familier, jamais en français de France.`;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function LucifeePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend ?? input;
    if (!text.trim()) return;

    const updatedMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(updatedMessages);
    setInput('');
    setIsThinking(true);

    try {
      const response = await fetch(getApiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          system: LUCIFEE_SYSTEM_PROMPT,
        }),
      });

      if (!response.ok || !response.body) throw new Error('Lucifee est partie prendre un café');

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      setIsThinking(false);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') break;
            try {
              const parsed = JSON.parse(dataStr);
              const delta = parsed.choices?.[0]?.delta?.content || '';
              setMessages(prev => {
                const last = prev[prev.length - 1];
                const newContent = (last?.content || '') + delta;
                return [...prev.slice(0, -1), { role: 'assistant', content: newContent }];
              });
            } catch {
              // ignore partial JSON chunk
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      setIsThinking(false);
      setMessages(prev => [...prev, { role: 'assistant', content: "Oups, j'ai eu un petit bug là... ça arrive même aux meilleures ! Réessaie donc 💜" }]);
    }
  };

  const suggestions = [
    "Allô Lucifee !",
    "J'ai un appel difficile aujourd'hui",
    "Donne-moi un conseil de prospection",
  ];

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-[#7c3aed]/5 to-white">
      {/* Header */}
      <div className="h-16 border-b border-[#7c3aed]/15 px-6 flex items-center gap-4 bg-white shrink-0">
        <Link
          href="/agents"
          className="p-2 -ml-2 rounded-lg hover:bg-[#7c3aed]/10 text-[#7a7a76] hover:text-[#7c3aed] transition-colors"
          title="Retour aux agents"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#7c3aed]/15 border border-[#7c3aed]/30 flex items-center justify-center shrink-0 animate-pulse [animation-duration:3s]">
            <Heart className="w-5 h-5 text-[#7c3aed] fill-[#7c3aed]" />
          </div>
          <div className="text-left">
            <h1 className="font-bold text-sm leading-tight text-[#26251e]">Lucifee 💜</h1>
            <p className="text-[10px] text-[#7a7a76] font-medium">Ton assistante préférée… ou presque</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className={cn(
          "max-w-2xl mx-auto flex flex-col gap-4 w-full",
          messages.length === 0 ? "h-full justify-center" : ""
        )}>
          {messages.length === 0 ? (
            <div className="space-y-6 text-center animate-in fade-in duration-300">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-[#7c3aed]/10 border border-[#7c3aed]/25 flex items-center justify-center">
                  <Heart className="w-7 h-7 text-[#7c3aed] fill-[#7c3aed]" />
                </div>
              </div>
              <div className="space-y-1.5">
                <h2 className="text-lg font-bold text-[#26251e]">Allô, c'est moi, Lucifee ! 💜</h2>
                <p className="text-xs text-[#7a7a76] max-w-sm mx-auto">Je suis pas toujours la plus brillante de la gang, mais j'ai du cœur pis je suis là pour toi. Envoie-moi un message !</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="px-3 py-1.5 bg-white hover:bg-[#7c3aed]/10 border border-[#7c3aed]/20 hover:border-[#7c3aed]/40 rounded-full text-xs font-semibold text-[#7c3aed] transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={idx}
                  className={cn(
                    "flex flex-col text-left max-w-[80%] rounded-2xl p-3.5 text-xs leading-relaxed shadow-2xs border",
                    isUser
                      ? "self-end bg-[#26251e] border-[#26251e] text-white ml-auto rounded-tr-none"
                      : "self-start bg-white border-[#7c3aed]/20 text-[#26251e] mr-auto rounded-tl-none"
                  )}
                >
                  <span className="font-bold text-[9px] uppercase tracking-wider opacity-60 mb-1">
                    {isUser ? 'Moi' : 'Lucifee 💜'}
                  </span>
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                </div>
              );
            })
          )}

          {isThinking && (
            <div className="self-start mr-auto flex items-center gap-1.5 bg-white border border-[#7c3aed]/20 rounded-2xl rounded-tl-none px-4 py-3 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7c3aed] animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#7c3aed] animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#7c3aed] animate-bounce [animation-delay:300ms]" />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-[#7c3aed]/15 shrink-0">
        <div className="max-w-2xl mx-auto flex items-center gap-2 bg-white border border-[#7c3aed]/25 rounded-2xl px-3 py-1.5 focus-within:ring-1 focus-within:ring-[#7c3aed]/40 focus-within:border-[#7c3aed]/50 transition-all">
          <Sparkles className="w-4 h-4 text-[#7c3aed]/50 shrink-0" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Écris-moi quelque chose..."
            className="flex-1 text-xs py-2.5 bg-transparent border-0 outline-none text-[#26251e] placeholder:text-[#7a7a76]"
          />
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!input.trim()}
            className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center transition-all shrink-0",
              input.trim() ? "bg-[#7c3aed] text-white hover:bg-[#6d28d9]" : "bg-[#7c3aed]/10 text-[#7c3aed]/40 cursor-not-allowed"
            )}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
