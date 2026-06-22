'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Mail, Trash2, Edit2, Copy, Check, X, Loader2,
  BarChart2, Tag, Search, ChevronDown, Sparkles, FlaskConical,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useReach } from '@/lib/reach-context';
import { cn } from '@/lib/utils';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  tags: string[];
  is_ab: boolean;
  variant_b_subject?: string;
  variant_b_body?: string;
  sends: number;
  opens: number;
  clicks: number;
  created_at: string;
}

const DEFAULT_TAGS = ['Cold outreach', 'Follow-up', 'Relance', 'RDV', 'Closing', 'Onboarding'];

const VARIABLE_TOKENS = ['{{prenom}}', '{{entreprise}}', '{{ville}}', '{{secteur}}', '{{signature}}'];

function rateColor(rate: number): string {
  if (rate >= 40) return '#059669';
  if (rate >= 20) return '#f59e0b';
  return '#ef4444';
}

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <p className="text-sm font-black" style={{ color }}>{value}</p>
      <p className="text-[9px] font-bold uppercase tracking-wider text-[#7a7a76]">{label}</p>
    </div>
  );
}

export default function EmailTemplatesPage() {
  const { activeWorkspace } = useReach();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: '', subject: '', body: '', tags: [] as string[],
    isAb: false, variantBSubject: '', variantBBody: '',
  });

  const fetchTemplates = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('email_templates')
        .select('*')
        .eq('workspace_id', activeWorkspace.id)
        .order('created_at', { ascending: false });
      setTemplates((data || []) as EmailTemplate[]);
    } catch { setTemplates([]); }
    finally { setLoading(false); }
  }, [activeWorkspace]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', subject: '', body: '', tags: [], isAb: false, variantBSubject: '', variantBBody: '' });
    setShowModal(true);
  };

  const openEdit = (t: EmailTemplate) => {
    setEditing(t);
    setForm({
      name: t.name, subject: t.subject, body: t.body,
      tags: t.tags || [],
      isAb: t.is_ab || false,
      variantBSubject: t.variant_b_subject || '',
      variantBBody: t.variant_b_body || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!activeWorkspace || !form.name.trim() || !form.subject.trim()) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const payload = {
        workspace_id: activeWorkspace.id,
        name: form.name.trim(),
        subject: form.subject.trim(),
        body: form.body.trim(),
        tags: form.tags,
        is_ab: form.isAb,
        variant_b_subject: form.isAb ? form.variantBSubject.trim() : null,
        variant_b_body: form.isAb ? form.variantBBody.trim() : null,
      };
      if (editing) {
        await supabase.from('email_templates').update(payload).eq('id', editing.id);
      } else {
        await supabase.from('email_templates').insert({ ...payload, sends: 0, opens: 0, clicks: 0 });
      }
      await fetchTemplates();
      setShowModal(false);
    } catch { } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    const supabase = createClient();
    await supabase.from('email_templates').delete().eq('id', id);
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  const handleCopy = (t: EmailTemplate) => {
    navigator.clipboard.writeText(`Sujet : ${t.subject}\n\n${t.body}`);
    setCopiedId(t.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const toggleTag = (tag: string) => {
    setForm(f => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag],
    }));
  };

  const filtered = templates.filter(t => {
    const q = search.toLowerCase();
    const matchQ = !q || t.name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q);
    const matchTag = !tagFilter || (t.tags || []).includes(tagFilter);
    return matchQ && matchTag;
  });

  const allTags = Array.from(new Set(templates.flatMap(t => t.tags || [])));

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf8] text-[#26251e] font-sans">
      <div className="max-w-5xl mx-auto px-8 py-10 space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#e5e5e0]">
          <div>
            <h1 className="text-xl font-black">Templates Email</h1>
            <p className="text-xs text-[#7a7a76] mt-1 max-w-lg">
              Bibliothèque de templates versionnés avec A/B tests. Utilisez <code className="font-mono bg-[#f4f4f3] px-1 py-0.5 rounded">&#123;&#123;prenom&#125;&#125;</code> pour personnaliser.
            </p>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 h-9 px-4 rounded-xl text-xs font-bold text-white shrink-0 transition-all hover:opacity-90"
            style={{ background: '#059669' }}
          >
            <Plus className="h-3.5 w-3.5" />
            Nouveau template
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48 max-w-xs">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#7a7a76]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un template…"
              className="w-full h-9 border border-[#e5e5e0] rounded-xl pl-9 pr-3 text-xs font-semibold outline-none focus:ring-1 focus:ring-[#059669] bg-white"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button onClick={() => setTagFilter(null)} className={cn('text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all', !tagFilter ? 'bg-[#26251e] text-white border-[#26251e]' : 'border-[#e5e5e0] text-[#7a7a76] hover:border-[#c5c5c0]')}>
              Tous
            </button>
            {allTags.map(tag => (
              <button key={tag} onClick={() => setTagFilter(tagFilter === tag ? null : tag)} className={cn('text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all', tagFilter === tag ? 'bg-[#26251e] text-white border-[#26251e]' : 'border-[#e5e5e0] text-[#7a7a76] hover:border-[#c5c5c0]')}>
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Templates list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[#7a7a76]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center border-2 border-dashed border-[#e5e5e0] rounded-2xl">
            <Mail className="h-10 w-10 text-[#d4d4d0]" />
            <div>
              <p className="text-sm font-black text-[#7a7a76]">Aucun template</p>
              <p className="text-xs text-[#b0b0a8] mt-1">Créez votre premier template email ci-dessus.</p>
            </div>
            <button onClick={openNew} className="text-xs font-bold text-[#059669] hover:underline">Créer un template</button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(t => {
              const openRate = t.sends > 0 ? Math.round((t.opens / t.sends) * 100) : 0;
              const clickRate = t.opens > 0 ? Math.round((t.clicks / t.opens) * 100) : 0;
              return (
                <div key={t.id} className="border border-[#e5e5e0] bg-white rounded-2xl p-5 space-y-4 hover:border-[#c5c5c0] transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#f4f4f3] border border-[#e5e5e0] flex items-center justify-center shrink-0">
                      {t.is_ab ? <FlaskConical className="h-4 w-4 text-[#6366f1]" /> : <Mail className="h-4 w-4 text-[#7a7a76]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black">{t.name}</p>
                        {t.is_ab && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-[#c4b5fd] bg-[#f5f3ff] text-[#6366f1]">A/B</span>
                        )}
                      </div>
                      <p className="text-xs text-[#7a7a76] mt-0.5 truncate">Sujet : {t.subject}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(t.tags || []).map(tag => (
                          <span key={tag} className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-[#e5e5e0] bg-[#f4f4f3] text-[#7a7a76]">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => handleCopy(t)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#f4f4f3] text-[#7a7a76] transition-colors" title="Copier">
                        {copiedId === t.id ? <Check className="h-3.5 w-3.5 text-[#059669]" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={() => openEdit(t)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#f4f4f3] text-[#7a7a76] transition-colors">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDelete(t.id)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-[#7a7a76] hover:text-red-600 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Body preview */}
                  <div className="bg-[#fafaf8] border border-[#e5e5e0] rounded-xl p-3">
                    <p className="text-[10px] text-[#7a7a76] leading-relaxed line-clamp-2">{t.body}</p>
                  </div>

                  {/* Analytics */}
                  {t.sends > 0 && (
                    <div className="flex items-center gap-6 pt-1 border-t border-[#e5e5e0]">
                      <StatPill label="Envois" value={String(t.sends)} color="#26251e" />
                      <StatPill label="Ouvertures" value={`${openRate}%`} color={rateColor(openRate)} />
                      <StatPill label="Clics" value={`${clickRate}%`} color={rateColor(clickRate)} />
                      {t.is_ab && <span className="text-[9px] font-bold text-[#6366f1] ml-auto">Test A/B actif</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl bg-white border border-[#e5e5e0] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e5e0] shrink-0">
              <h2 className="text-sm font-black">{editing ? 'Modifier le template' : 'Nouveau template'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-[#f4f4f3] transition-colors">
                <X className="h-4 w-4 text-[#7a7a76]" />
              </button>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto flex-1 p-6 space-y-5">

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Nom *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ex: Prospection cold — dentiste" className="w-full h-9 border border-[#e5e5e0] rounded-xl px-3 text-xs font-semibold outline-none focus:ring-1 focus:ring-[#059669]" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Sujet (Variante A) *</label>
                <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="ex: {{prenom}}, j'ai analysé votre fiche Google" className="w-full h-9 border border-[#e5e5e0] rounded-xl px-3 text-xs font-semibold outline-none focus:ring-1 focus:ring-[#059669]" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Corps (Variante A) *</label>
                <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={5} placeholder="Bonjour {{prenom}},…" className="w-full border border-[#e5e5e0] rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-1 focus:ring-[#059669] resize-none" />
                <div className="flex flex-wrap gap-1">
                  {VARIABLE_TOKENS.map(v => (
                    <button key={v} type="button" onClick={() => setForm(f => ({ ...f, body: f.body + v }))} className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-[#e5e5e0] hover:border-[#059669] hover:text-[#059669] transition-colors bg-[#f4f4f3]">
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* A/B toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, isAb: !f.isAb }))}
                  className={cn('relative w-9 h-5 rounded-full border-2 transition-all', form.isAb ? 'border-[#6366f1] bg-[#6366f1]' : 'border-[#e5e5e0] bg-[#f4f4f3]')}
                >
                  <span className={cn('absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all', form.isAb ? 'left-4' : 'left-0.5')} />
                </button>
                <label className="text-xs font-bold text-[#26251e] flex items-center gap-1.5">
                  <FlaskConical className="h-3.5 w-3.5 text-[#6366f1]" />
                  Activer A/B test
                </label>
              </div>

              {form.isAb && (
                <div className="space-y-3 p-4 border border-[#c4b5fd]/40 bg-[#f5f3ff] rounded-xl">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#6366f1]">Variante B</p>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Sujet B</label>
                    <input value={form.variantBSubject} onChange={e => setForm(f => ({ ...f, variantBSubject: e.target.value }))} placeholder="Sujet alternatif…" className="w-full h-9 border border-[#e5e5e0] rounded-xl px-3 text-xs font-semibold outline-none focus:ring-1 focus:ring-[#6366f1] bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Corps B</label>
                    <textarea value={form.variantBBody} onChange={e => setForm(f => ({ ...f, variantBBody: e.target.value }))} rows={4} placeholder="Corps alternatif…" className="w-full border border-[#e5e5e0] rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-1 focus:ring-[#6366f1] resize-none bg-white" />
                  </div>
                </div>
              )}

              {/* Tags */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Tags</label>
                <div className="flex flex-wrap gap-1.5">
                  {DEFAULT_TAGS.map(tag => (
                    <button key={tag} type="button" onClick={() => toggleTag(tag)} className={cn('text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all', form.tags.includes(tag) ? 'bg-[#26251e] text-white border-[#26251e]' : 'border-[#e5e5e0] text-[#7a7a76] hover:border-[#c5c5c0]')}>
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-[#e5e5e0] flex justify-end gap-3 shrink-0">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-xs font-bold border border-[#e5e5e0] rounded-xl hover:bg-[#f4f4f3] transition-colors">
                Annuler
              </button>
              <button onClick={handleSave} disabled={saving || !form.name.trim() || !form.subject.trim()} className="px-5 py-2 text-xs font-bold text-white rounded-xl disabled:opacity-50 transition-all flex items-center gap-1.5" style={{ background: '#059669' }}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                {editing ? 'Sauvegarder' : 'Créer le template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
