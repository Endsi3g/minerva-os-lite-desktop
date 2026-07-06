'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getApiUrl } from '@/lib/api-helper';
import { createClient } from '@/lib/supabase/client';
import { useReach } from '@/lib/reach-context';
import { Loader2, Plus, Trash2, ExternalLink, Link2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SavedWebsite {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  faviconUrl: string | null;
  category: string;
  tags: string[];
  createdAt: string;
}

const CATEGORIES = ['Restaurant', 'Services professionnels', 'Commerce de détail', 'Santé & Bien-être', 'Immobilier', 'Artisan', 'Autre'];

function mapRow(r: Record<string, unknown>): SavedWebsite {
  return {
    id: r.id as string,
    url: r.url as string,
    title: (r.title as string) ?? null,
    description: (r.description as string) ?? null,
    imageUrl: (r.image_url as string) ?? null,
    faviconUrl: (r.favicon_url as string) ?? null,
    category: (r.category as string) || 'Autre',
    tags: Array.isArray(r.tags) ? r.tags as string[] : [],
    createdAt: r.created_at as string,
  };
}

export function WebsitePortfolioSection() {
  const { activeWorkspace, user } = useReach();
  const [sites, setSites] = useState<SavedWebsite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [fetchedPreview, setFetchedPreview] = useState<{ title: string; description: string | null; image: string | null; favicon: string } | null>(null);
  const [fetchingPreview, setFetchingPreview] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [tagsInput, setTagsInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchSites = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('saved_websites')
        .select('*')
        .eq('workspace_id', activeWorkspace.id)
        .order('created_at', { ascending: false });
      setSites((data || []).map(mapRow));
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id]);

  useEffect(() => { fetchSites(); }, [fetchSites]);

  const handleFetchPreview = async () => {
    if (!urlInput.trim()) return;
    setFetchingPreview(true);
    setFetchedPreview(null);
    try {
      let normalized = urlInput.trim();
      if (!/^https?:\/\//i.test(normalized)) normalized = `https://${normalized}`;
      const res = await fetch(getApiUrl(`/api/link-preview?url=${encodeURIComponent(normalized)}`));
      if (!res.ok) throw new Error('Impossible de récupérer un aperçu pour ce lien.');
      const data = await res.json();
      setFetchedPreview(data);
      setUrlInput(normalized);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setFetchingPreview(false);
    }
  };

  const handleSave = async () => {
    if (!fetchedPreview || !activeWorkspace?.id) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
      const { error } = await supabase.from('saved_websites').insert({
        workspace_id: activeWorkspace.id,
        url: urlInput.trim(),
        title: fetchedPreview.title,
        description: fetchedPreview.description,
        image_url: fetchedPreview.image,
        favicon_url: fetchedPreview.favicon,
        category,
        tags,
        created_by: user?.id,
      });
      if (error) throw error;
      toast.success('Site ajouté à la galerie !');
      setShowAddForm(false);
      setUrlInput('');
      setFetchedPreview(null);
      setTagsInput('');
      setCategory(CATEGORIES[0]);
      await fetchSites();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const supabase = createClient();
    await supabase.from('saved_websites').delete().eq('id', id);
    setSites((prev) => prev.filter((s) => s.id !== id));
    toast.success('Retiré de la galerie.');
  };

  const filtered = useMemo(() => {
    return sites.filter((s) => {
      if (categoryFilter && s.category !== categoryFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (s.title || '').toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q) || s.tags.some((t) => t.toLowerCase().includes(q));
    });
  }, [sites, categoryFilter, search]);

  const categoriesInUse = useMemo(() => Array.from(new Set(sites.map((s) => s.category))), [sites]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-bold text-[#26251e]">Portfolio de sites web</h2>
          <p className="text-[10px] text-[#7a7a76] mt-0.5">Collez un lien, récupérez son aperçu, catégorisez — façon marketplace.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Ajouter un lien
        </button>
      </div>

      {showAddForm && (
        <div className="border border-[#e5e5e0] rounded-xl p-4 bg-white space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#7a7a76]" />
              <input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFetchPreview()}
                placeholder="exemple.com ou https://exemple.com"
                className="w-full pl-9 pr-3 py-2 text-xs border border-[#e5e5e0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#059669]"
              />
            </div>
            <button
              type="button"
              onClick={handleFetchPreview}
              disabled={!urlInput.trim() || fetchingPreview}
              className="px-3 py-2 rounded-lg border border-[#e5e5e0] text-xs font-bold text-[#26251e] hover:bg-[#f4f4f3] disabled:opacity-50 transition-colors shrink-0"
            >
              {fetchingPreview ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Aperçu'}
            </button>
          </div>

          {fetchedPreview && (
            <div className="border border-[#e5e5e0] rounded-lg overflow-hidden flex gap-3 p-3 bg-[#fafaf8]">
              {fetchedPreview.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fetchedPreview.image} alt="" className="w-20 h-20 object-cover rounded-lg shrink-0" />
              ) : (
                <div className="w-20 h-20 rounded-lg bg-[#e5e5e0] flex items-center justify-center shrink-0">
                  <Link2 className="w-6 h-6 text-[#7a7a76]" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[#26251e] truncate">{fetchedPreview.title}</p>
                {fetchedPreview.description && <p className="text-[10px] text-[#7a7a76] line-clamp-2 mt-0.5">{fetchedPreview.description}</p>}
              </div>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="text-xs border border-[#e5e5e0] rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-[#059669]"
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Tags séparés par virgule (ex: moderne, e-commerce)"
              className="flex-1 min-w-[180px] text-xs px-2.5 py-2 border border-[#e5e5e0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#059669]"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setShowAddForm(false); setFetchedPreview(null); setUrlInput(''); }} className="px-3 py-2 text-xs border border-[#e5e5e0] rounded-lg hover:bg-[#f4f4f3] transition-colors">
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!fetchedPreview || saving}
              className="px-4 py-2 bg-[#059669] text-white text-xs font-bold rounded-lg hover:bg-[#059669]/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : 'Ajouter à la galerie'}
            </button>
          </div>
        </div>
      )}

      {sites.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#7a7a76]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-7 pr-2 py-1.5 text-[11px] border border-[#e5e5e0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#059669]"
            />
          </div>
          <button
            onClick={() => setCategoryFilter(null)}
            className={cn('px-2.5 py-1 rounded-full text-[10px] font-bold border', !categoryFilter ? 'bg-[#26251e] text-white border-[#26251e]' : 'border-[#e5e5e0] text-[#7a7a76]')}
          >
            Tous
          </button>
          {categoriesInUse.map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={cn('px-2.5 py-1 rounded-full text-[10px] font-bold border whitespace-nowrap', categoryFilter === c ? 'bg-[#26251e] text-white border-[#26251e]' : 'border-[#e5e5e0] text-[#7a7a76]')}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-[#7a7a76]" /></div>
      ) : filtered.length === 0 ? (
        <div className="py-10 text-center border border-dashed border-[#e5e5e0] rounded-xl">
          <p className="text-xs text-[#7a7a76]">{sites.length === 0 ? 'Aucun site dans le portfolio pour l\'instant.' : 'Aucun résultat.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((site) => (
            <div key={site.id} className="border border-[#e5e5e0] rounded-xl overflow-hidden bg-white group">
              <div className="h-32 bg-[#f4f4f3] relative overflow-hidden">
                {site.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={site.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Link2 className="w-6 h-6 text-[#7a7a76]/40" /></div>
                )}
                <button
                  onClick={() => handleDelete(site.id)}
                  className="absolute top-2 right-2 h-7 w-7 rounded-lg bg-white/90 flex items-center justify-center text-[#7a7a76] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-3 space-y-2">
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {site.faviconUrl && <img src={site.faviconUrl} alt="" className="w-3.5 h-3.5 shrink-0" />}
                  <p className="text-xs font-bold text-[#26251e] truncate flex-1">{site.title || site.url}</p>
                </div>
                {site.description && <p className="text-[10px] text-[#7a7a76] line-clamp-2">{site.description}</p>}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#059669]/10 text-[#059669] border border-[#059669]/20">{site.category}</span>
                  <a href={site.url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-[#059669] hover:underline flex items-center gap-1">
                    Ouvrir <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
