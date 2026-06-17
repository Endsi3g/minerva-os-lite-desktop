'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { MinervaIcon } from '@/components/icons';
import { createClient } from '@/lib/supabase/client';
import { useReach } from '@/lib/reach-context';
import { ArrowLeft, Play, Star, MessageSquare, User, Camera, Pencil, Check, X } from 'lucide-react';

interface AgentMeta {
  id: string;
  name: string;
  description: string;
  category: string;
  chatsCount: string;
  isBuiltin: boolean;
}

interface AgentReview {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

const BUILTIN_META: Record<string, Omit<AgentMeta, 'id'>> = {
  'audit-gmb': {
    name: 'Audit GMB Montréal',
    description: "Analyse la fiche Google My Business d'un commerce montréalais et génère un rapport de recommandations avec un score GMB sur 100. Identifie les lacunes dans les horaires, photos, catégories, et répond aux avis négatifs pour améliorer la visibilité locale.",
    category: 'Audit',
    chatsCount: '< 50',
    isBuiltin: true,
  },
  'pitcheur-qc': {
    name: 'Pitcheur Québécois',
    description: "Rédige un pitch de vente authentiquement québécois, adapté au marché local. Choisis ton canal (email, SMS, appel) et ton ton (chaleureux, professionnel, direct). Parfait pour la prospection B2B au Québec.",
    category: 'Prospection',
    chatsCount: '< 30',
    isBuiltin: true,
  },
  'radar-reputation': {
    name: 'Radar Réputation',
    description: "Analyse la réputation en ligne, identifie les avis négatifs et propose des réponses professionnelles adaptées. Surveille Google, Yelp et Facebook pour donner un tableau de bord complet de la e-réputation d'un commerce.",
    category: 'Réputation',
    chatsCount: '< 20',
    isBuiltin: true,
  },
  'lucifee': {
    name: 'Lucifee 💜',
    description: "Un agent secret... Découvert par les plus curieux. Lucifee est une IA de soutien émotionnel et de réflexion créative. Elle t'accompagne dans les moments difficiles avec bienveillance et poésie.",
    category: 'Easter Egg',
    chatsCount: '?',
    isBuiltin: true,
  },
};

export function AgentDetailRoot({ agentId }: { agentId: string }) {
  const router = useRouter();
  const { user } = useReach();
  const [reviews, setReviews] = useState<AgentReview[]>([]);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [creatorName, setCreatorName] = useState('Minerva OS');
  const [creatorCompany, setCreatorCompany] = useState('Minerva OS Reach Lite');
  const [creatorUserId, setCreatorUserId] = useState<string | null>(null);

  // Banner & description editing
  const [bannerBase64, setBannerBase64] = useState<string>('');
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [customDescription, setCustomDescription] = useState<string | null>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const meta: AgentMeta = agentId in BUILTIN_META
    ? { id: agentId, ...BUILTIN_META[agentId] }
    : {
        id: agentId,
        name: agentId,
        description: 'Agent personnalisé.',
        category: 'Custom',
        chatsCount: '—',
        isBuiltin: false,
      };

  // Load reviews from DB or localStorage
  const loadReviews = async () => {
    const electronObj = typeof window !== 'undefined' && (window as any).electron;
    try {
      if (electronObj) {
        const rows = await electronObj.dbAll(
          'SELECT * FROM agent_reviews WHERE agent_id = ? ORDER BY created_at DESC',
          [agentId]
        ) as any[];
        if (rows && rows.length > 0) {
          setReviews(rows.map((r: any) => ({
            id: r.id,
            userName: r.user_name || 'Utilisateur',
            rating: r.rating,
            comment: r.comment,
            createdAt: r.created_at,
          })));
          return;
        }
      } else {
        const supabase = createClient();
        const { data } = await supabase
          .from('agent_reviews')
          .select('*')
          .eq('agent_id', agentId)
          .order('created_at', { ascending: false });
        if (data && data.length > 0) {
          setReviews(data.map((r: any) => ({
            id: r.id,
            userName: r.user_name || 'Utilisateur',
            rating: r.rating,
            comment: r.comment,
            createdAt: r.created_at,
          })));
          return;
        }
      }
    } catch {}
    // Fallback: localStorage
    const stored = localStorage.getItem(`minerva_agent_reviews_${agentId}`);
    if (stored) {
      try { setReviews(JSON.parse(stored)); } catch {}
    }
  };

  useEffect(() => {
    loadReviews();

    // Load banner and custom description from localStorage
    const storedBanner = localStorage.getItem(`minerva_agent_banner_${agentId}`);
    if (storedBanner) setBannerBase64(storedBanner);
    const storedDesc = localStorage.getItem(`minerva_agent_desc_${agentId}`);
    if (storedDesc) setCustomDescription(storedDesc);
  }, [agentId]);

  // Load creator info whenever user becomes available
  useEffect(() => {
    if (!user) return;
    setCreatorUserId(user.id);
    const loadCreatorInfo = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('settings')
          .select('full_name, company_name')
          .eq('user_id', user.id)
          .maybeSingle();
        if (data?.full_name) {
          if (!meta.isBuiltin) {
            setCreatorName(data.full_name);
            if (data.company_name) setCreatorCompany(data.company_name);
          }
        }
      } catch {}
    };
    loadCreatorInfo();
  }, [user, agentId]);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const displayDescription = customDescription ?? meta.description;

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const b64 = reader.result as string;
      setBannerBase64(b64);
      localStorage.setItem(`minerva_agent_banner_${agentId}`, b64);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveDescription = () => {
    setCustomDescription(descriptionDraft);
    localStorage.setItem(`minerva_agent_desc_${agentId}`, descriptionDraft);
    setEditingDescription(false);
  };

  const handleCancelDescription = () => {
    setDescriptionDraft(displayDescription);
    setEditingDescription(false);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmitting(true);

    const userName = user?.email?.split('@')[0] || 'Utilisateur';
    const reviewId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const createdAt = new Date().toISOString();

    const review: AgentReview = {
      id: reviewId,
      userName,
      rating: newRating,
      comment: newComment.trim(),
      createdAt,
    };

    try {
      const electronObj = typeof window !== 'undefined' && (window as any).electron;
      if (electronObj) {
        await electronObj.dbRun(
          'INSERT INTO agent_reviews (id, agent_id, user_id, user_name, rating, comment, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [reviewId, agentId, user?.id || '', userName, newRating, newComment.trim(), createdAt]
        );
      } else {
        const supabase = createClient();
        await supabase.from('agent_reviews').insert({
          id: reviewId,
          agent_id: agentId,
          user_id: user?.id,
          user_name: userName,
          rating: newRating,
          comment: newComment.trim(),
          created_at: createdAt,
        });
      }
    } catch {
      // Persist to localStorage as fallback
    }

    const updated = [review, ...reviews];
    setReviews(updated);
    localStorage.setItem(`minerva_agent_reviews_${agentId}`, JSON.stringify(updated));
    setNewComment('');
    setNewRating(5);
    setSubmitting(false);
  };

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf8]">
      <div className="max-w-3xl mx-auto p-6 space-y-8">

        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs text-[#7a7a76] hover:text-[#26251e] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour aux agents
        </button>

        {/* Banner */}
        <div className="relative w-full h-36 rounded-2xl overflow-hidden bg-gradient-to-br from-[#059669]/10 to-[#047857]/5 border border-[#e5e5e0] group">
          {bannerBase64 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bannerBase64} alt="Bannière" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center opacity-20">
              <MinervaIcon size={48} />
            </div>
          )}
          <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
          <button
            type="button"
            onClick={() => bannerInputRef.current?.click()}
            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-semibold gap-2"
          >
            <Camera className="w-4 h-4" />
            Changer la bannière
          </button>
        </div>

        {/* Header */}
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-[#059669]/10 border border-[#059669]/20 flex items-center justify-center shrink-0">
            <MinervaIcon size={32} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-[#26251e]">{meta.name}</h1>
              <span className="text-[9px] font-bold uppercase tracking-wider bg-[#059669]/10 text-[#059669] px-2 py-0.5 rounded border border-[#059669]/20">
                {meta.category}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-[#7a7a76]">
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" />
                {meta.chatsCount} utilisations
              </span>
              {avgRating && (
                <span className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  {avgRating} ({reviews.length} avis)
                </span>
              )}
            </div>

            {/* Editable description */}
            {editingDescription ? (
              <div className="mt-2 space-y-2">
                <textarea
                  value={descriptionDraft}
                  onChange={(e) => setDescriptionDraft(e.target.value)}
                  className="w-full text-sm p-2 border border-[#e5e5e0] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#059669] resize-none"
                  rows={4}
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <button type="button" onClick={handleSaveDescription} className="flex items-center gap-1 text-xs font-semibold text-white bg-[#059669] hover:bg-[#047857] px-3 py-1.5 rounded-md transition-colors">
                    <Check className="w-3 h-3" /> Enregistrer
                  </button>
                  <button type="button" onClick={handleCancelDescription} className="flex items-center gap-1 text-xs font-semibold text-[#7a7a76] hover:text-[#26251e] px-3 py-1.5 rounded-md border border-[#e5e5e0] transition-colors">
                    <X className="w-3 h-3" /> Annuler
                  </button>
                </div>
              </div>
            ) : (
              <div className="group/desc mt-2 flex items-start gap-2">
                <p className="text-sm text-[#555552] leading-relaxed flex-1">{displayDescription}</p>
                <button
                  type="button"
                  onClick={() => { setDescriptionDraft(displayDescription); setEditingDescription(true); }}
                  className="opacity-0 group-hover/desc:opacity-100 transition-opacity p-1 rounded hover:bg-[#e5e5e2] text-[#7a7a76] hover:text-[#26251e] shrink-0"
                  title="Modifier la description"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Launch button */}
        <Link href={`/agents?launch=${agentId}`}>
          <Button className="w-full h-11 text-sm font-bold gap-2 bg-[#059669] hover:bg-[#047857] text-white">
            <Play className="w-4 h-4 fill-white" />
            Lancer l&apos;agent
          </Button>
        </Link>

        {/* Creator block */}
        <div className="bg-white border border-[#e5e5e0] rounded-xl p-5 space-y-3">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Créateur</h2>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#059669]/10 border border-[#059669]/20 flex items-center justify-center text-[#059669] shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#26251e]">{creatorName}</p>
              <p className="text-xs text-[#7a7a76]">{creatorCompany}</p>
            </div>
            {creatorUserId && !meta.isBuiltin && (
              <Link
                href={`/agents/creator/${creatorUserId}`}
                className="ml-auto text-[10px] text-[#059669] hover:underline font-semibold"
              >
                Voir le profil →
              </Link>
            )}
          </div>
        </div>

        {/* Reviews */}
        <div className="space-y-5">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
            Avis ({reviews.length})
            {avgRating && (
              <span className="ml-2 normal-case font-normal text-[#7a7a76]">
                Moyenne : <span className="font-bold text-[#26251e]">{avgRating}/5</span>
              </span>
            )}
          </h2>

          {/* Add review form */}
          <form onSubmit={handleSubmitReview} className="bg-white border border-[#e5e5e0] rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-[#26251e]">Laisser un avis</p>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNewRating(n)}
                  className="p-0.5"
                >
                  <Star
                    className={`w-5 h-5 transition-colors ${n <= newRating ? 'fill-amber-400 text-amber-400' : 'text-[#e5e5e0]'}`}
                  />
                </button>
              ))}
            </div>
            <textarea
              placeholder="Partagez votre expérience avec cet agent..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="w-full text-xs p-2.5 border border-[#e6e5e0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#059669] h-20 resize-none bg-[#fafaf8]"
            />
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={submitting} className="h-8 text-xs bg-[#059669] hover:bg-[#047857] text-white font-bold">
                {submitting ? 'Publication…' : 'Publier'}
              </Button>
            </div>
          </form>

          {/* Review list */}
          {reviews.length === 0 ? (
            <p className="text-xs text-[#7a7a76] text-center py-4">Aucun avis pour l&apos;instant. Soyez le premier !</p>
          ) : (
            <div className="space-y-3">
              {reviews.map(review => (
                <div key={review.id} className="bg-white border border-[#e5e5e0] rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#e5e5e2] flex items-center justify-center text-[9px] font-bold text-[#26251e]">
                        {review.userName.substring(0, 1).toUpperCase()}
                      </div>
                      <span className="text-xs font-semibold text-[#26251e]">{review.userName}</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map(n => (
                        <Star key={n} className={`w-3 h-3 ${n <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-[#e5e5e0]'}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-[#555552] leading-relaxed">{review.comment}</p>
                  <p className="text-[10px] text-[#7a7a76]">
                    {new Date(review.createdAt).toLocaleDateString('fr-CA', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AgentDetailRoot;
