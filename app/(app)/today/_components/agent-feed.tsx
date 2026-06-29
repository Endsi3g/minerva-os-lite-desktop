'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Zap, Mail, Database, Tag, Activity, RefreshCw, Bot } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface FeedItem { id: string; type: string; title: string; body: string | null; link: string | null; created_at: string; }

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
  scraping_done: { icon: Database, color: '#059669' },
  email_sent: { icon: Mail, color: '#2563eb' },
  info: { icon: Tag, color: '#7c3aed' },
  report: { icon: Activity, color: '#d97706' },
  digest: { icon: Bot, color: '#059669' },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'À l\'instant';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}j`;
}

export function AgentFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('notifications').select('id, type, title, body, link, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20);
    setItems(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); const interval = setInterval(load, 30_000); return () => clearInterval(interval); }, [load]);

  if (loading) return (
    <div className="rounded-xl border border-[#e5e5e0] bg-white p-4 space-y-2">
      {[1,2,3].map(i => <div key={i} className="h-10 bg-[#f4f4f3] rounded animate-pulse" />)}
    </div>
  );

  return (
    <div className="rounded-xl border border-[#e5e5e0] bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e5e0]">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-[#059669]" />
          <span className="text-xs font-bold text-[#26251e]">Agent Feed</span>
          {items.length > 0 && <span className="text-[9px] font-bold bg-[#059669]/10 text-[#059669] px-1.5 py-0.5 rounded-full">{items.length}</span>}
        </div>
        <button onClick={load} className="text-[#7a7a76] hover:text-[#26251e] transition-colors"><RefreshCw className="h-3 w-3" /></button>
      </div>
      {items.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <Bot className="h-6 w-6 text-[#e5e5e0] mx-auto mb-2" />
          <p className="text-xs text-[#7a7a76]">Aucune activité IA récente.</p>
        </div>
      ) : (
        <div className="divide-y divide-[#e5e5e0] max-h-80 overflow-y-auto">
          {items.map(item => {
            const conf = TYPE_CONFIG[item.type] || { icon: Activity, color: '#7a7a76' };
            const Icon = conf.icon;
            const inner = (
              <div className="flex items-start gap-3 px-4 py-3 hover:bg-[#fafaf8] transition-colors">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${conf.color}18` }}>
                  <Icon className="h-3 w-3" style={{ color: conf.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#26251e] leading-snug">{item.title}</p>
                  {item.body && <p className="text-[10px] text-[#7a7a76] mt-0.5 line-clamp-1">{item.body}</p>}
                </div>
                <span className="text-[9px] text-[#7a7a76] shrink-0 mt-0.5">{timeAgo(item.created_at)}</span>
              </div>
            );
            return item.link ? <Link key={item.id} href={item.link}>{inner}</Link> : <div key={item.id}>{inner}</div>;
          })}
        </div>
      )}
    </div>
  );
}
