'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Building2, Mail, Phone, MapPin, Globe, Tag,
  Star, AlertCircle, Loader2, Lock, ExternalLink
} from 'lucide-react';
import { getApiUrl } from '@/lib/api-helper';
import Link from 'next/link';

interface LeadData {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  category: string | null;
  city: string | null;
  address: string | null;
  website: string | null;
  score: number | null;
}

export default function LeadPreviewPage() {
  const params = useParams();
  const token = params.token as string;
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [lead, setLead] = useState<LeadData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(getApiUrl(`/api/leads/share-preview?token=${token}`));
        const data = await res.json();
        if (!res.ok || !data.valid) {
          setErrorMsg(data.error || 'Lien invalide ou expiré.');
          setStatus('error');
          return;
        }
        setLead(data.lead);
        setExpiresAt(data.expiresAt);
        setStatus('ready');
      } catch {
        setErrorMsg('Erreur réseau.');
        setStatus('error');
      }
    }
    load();
  }, [token]);

  const formatExpiry = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] flex flex-col items-center py-12 px-4">

      {/* Header bar */}
      <div className="w-full max-w-lg mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#26251e] rounded-lg flex items-center justify-center">
            <span className="text-white font-extrabold text-sm">M</span>
          </div>
          <span className="text-sm font-bold text-[#26251e]">Minerva OS</span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#f4f4f3] text-[#7a7a76] border border-[#e5e5e0]">
          Aperçu partagé
        </span>
      </div>

      {/* Loading */}
      {status === 'loading' && (
        <div className="flex flex-col items-center gap-3 mt-16">
          <Loader2 className="h-6 w-6 animate-spin text-[#7a7a76]" />
          <p className="text-sm text-[#7a7a76]">Chargement du prospect…</p>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="bg-white border border-[#e5e5e0] rounded-2xl p-8 max-w-lg w-full text-center">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-6 w-6 text-red-500" />
          </div>
          <h1 className="text-lg font-bold text-[#26251e] mb-2">Lien invalide</h1>
          <p className="text-sm text-[#7a7a76] mb-5">{errorMsg}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#26251e] text-white text-sm font-bold rounded-xl hover:bg-[#1a1a19] transition-colors"
          >
            Accueil
          </Link>
        </div>
      )}

      {/* Lead card */}
      {status === 'ready' && lead && (
        <div className="max-w-lg w-full space-y-4">
          {/* Main card */}
          <div className="bg-white border border-[#e5e5e0] rounded-2xl overflow-hidden shadow-sm">
            {/* Color band */}
            <div className="h-1.5 bg-[#f54e00]" />

            <div className="p-6 space-y-5">
              {/* Name + score */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-xl font-black text-[#26251e] leading-tight">{lead.name}</h1>
                  {lead.company && (
                    <p className="text-xs text-[#7a7a76] font-semibold mt-0.5 flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {lead.company}
                    </p>
                  )}
                </div>
                {lead.score != null && (
                  <div className="shrink-0 flex flex-col items-center justify-center bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    <Star className="h-3.5 w-3.5 text-amber-500 mb-0.5" />
                    <span className="text-sm font-black text-amber-700">{lead.score}</span>
                    <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider">Score</span>
                  </div>
                )}
              </div>

              {/* Badge catégorie */}
              {lead.category && (
                <div className="inline-flex items-center gap-1.5 bg-[#f4f4f3] border border-[#e5e5e0] rounded-full px-3 py-1">
                  <Tag className="h-3 w-3 text-[#7a7a76]" />
                  <span className="text-[11px] font-bold text-[#26251e]">{lead.category}</span>
                </div>
              )}

              {/* Contact details */}
              <div className="space-y-2.5">
                {lead.email && (
                  <div className="flex items-center gap-2.5 text-xs">
                    <div className="w-6 h-6 rounded-lg bg-[#f4f4f3] flex items-center justify-center shrink-0">
                      <Mail className="h-3 w-3 text-[#7a7a76]" />
                    </div>
                    <a href={`mailto:${lead.email}`} className="text-[#f54e00] font-semibold hover:underline truncate">
                      {lead.email}
                    </a>
                  </div>
                )}
                {lead.phone && (
                  <div className="flex items-center gap-2.5 text-xs">
                    <div className="w-6 h-6 rounded-lg bg-[#f4f4f3] flex items-center justify-center shrink-0">
                      <Phone className="h-3 w-3 text-[#7a7a76]" />
                    </div>
                    <a href={`tel:${lead.phone}`} className="text-[#26251e] font-semibold hover:underline">
                      {lead.phone}
                    </a>
                  </div>
                )}
                {(lead.address || lead.city) && (
                  <div className="flex items-center gap-2.5 text-xs">
                    <div className="w-6 h-6 rounded-lg bg-[#f4f4f3] flex items-center justify-center shrink-0">
                      <MapPin className="h-3 w-3 text-[#7a7a76]" />
                    </div>
                    <span className="text-[#26251e] font-semibold">
                      {[lead.address, lead.city].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
                {lead.website && (
                  <div className="flex items-center gap-2.5 text-xs">
                    <div className="w-6 h-6 rounded-lg bg-[#f4f4f3] flex items-center justify-center shrink-0">
                      <Globe className="h-3 w-3 text-[#7a7a76]" />
                    </div>
                    <a
                      href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#f54e00] font-semibold hover:underline flex items-center gap-1 truncate"
                    >
                      {lead.website}
                      <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Expiry + privacy notice */}
          <div className="bg-[#f4f4f3] border border-[#e5e5e0] rounded-xl p-4 flex items-start gap-2.5 text-xs text-[#7a7a76]">
            <Lock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#26251e]">Aperçu en lecture seule</p>
              <p className="mt-0.5">
                Ce lien est partagé à titre informatif uniquement.
                {expiresAt && ` Il expire le ${formatExpiry(expiresAt)}.`}
              </p>
            </div>
          </div>

          {/* CTA to create own account */}
          <div className="bg-white border border-[#e5e5e0] rounded-xl p-5 text-center space-y-3">
            <p className="text-xs font-bold text-[#26251e]">Gérez vos prospects avec Minerva OS</p>
            <p className="text-[11px] text-[#7a7a76]">
              Prospection IA, pipeline de vente, suivi terrain — essai gratuit.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#f54e00] hover:bg-[#d94200] text-white text-xs font-bold rounded-xl transition-colors"
            >
              Créer un compte gratuit
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
