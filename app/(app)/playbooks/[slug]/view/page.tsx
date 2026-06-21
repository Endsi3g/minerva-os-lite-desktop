import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, Mail, Phone, FileText, User, Play } from 'lucide-react';
import { PLAYBOOKS, CATEGORY_COLORS, CHANNEL_ICONS } from '../../_components/playbooks-root';

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return [{ slug: '_placeholder_' }];
}

export default async function PlaybookViewPage({ params }: Props) {
  const { slug } = await params;
  const playbook = PLAYBOOKS.find((p) => p.id === slug);

  if (!playbook) {
    notFound();
  }

  return (
    <div className="h-full overflow-y-auto bg-neutral-50/40 text-neutral-800 font-sans">
      <div className="max-w-2xl mx-auto p-6 pb-24 space-y-6 text-left">
        {/* Navigation & Header */}
        <div className="space-y-4">
          <Link
            href="/playbooks"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#555552] hover:text-[#26251e] transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Retour aux playbooks
          </Link>

          <div className="flex items-start gap-4 bg-white border border-[#e5e5e0] rounded-xl p-5 shadow-2xs">
            <span className="text-3xl shrink-0 mt-0.5" role="img" aria-label="playbook emoji">
              {playbook.emoji}
            </span>
            <div className="min-w-0 space-y-1">
              <h1 className="text-base font-extrabold text-[#26251e] leading-snug tracking-tight">
                {playbook.title}
              </h1>
              <p className="text-xs text-[#7a7a76] leading-relaxed">
                {playbook.description}
              </p>
              <div className="pt-1">
                <span
                  className={`inline-block text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
                    CATEGORY_COLORS[playbook.category] ?? 'bg-neutral-100 text-neutral-600 border-neutral-200'
                  }`}
                >
                  {playbook.category}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section cards */}
        <div className="space-y-6">
          {/* ICP Persona */}
          <section className="bg-white border border-[#e5e5e0] rounded-xl p-5 space-y-4 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#7a7a76] flex items-center gap-2">
              <User className="h-3.5 w-3.5" />
              Persona ICP
            </h3>
            <p className="text-xs text-[#26251e] leading-relaxed bg-[#f7f7f4] rounded-xl p-3 border border-[#e5e5e0]">
              {playbook.icp.persona}
            </p>
            <div className="space-y-1.5">
              {playbook.icp.painPoints.map((p, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-[#555552]">
                  <span className="text-[#f54e00] shrink-0 font-bold mt-0.5">✗</span>
                  <span>{p}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-6 pt-1 text-xs border-t border-[#e5e5e0]/60">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#7a7a76]">Budget</span>
                <p className="font-semibold text-[#26251e]">{playbook.icp.budget}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-[#7a7a76]">Secteur</span>
                <p className="font-semibold text-[#26251e]">{playbook.icp.sector}</p>
              </div>
            </div>
          </section>

          {/* Scraping Preset */}
          <section className="bg-white border border-[#e5e5e0] rounded-xl p-5 space-y-4 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#7a7a76]">Preset Scraping</h3>
            <div className="rounded-xl border border-[#e5e5e0] p-3.5 space-y-3 bg-[#f7f7f4] text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[#7a7a76] block">Niches de recherche</span>
                <div className="flex flex-wrap gap-1">
                  {playbook.scraping.niches.map((n) => (
                    <span
                      key={n}
                      className="px-2 py-0.5 bg-[#059669]/10 text-[#059669] rounded-full border border-[#059669]/20 text-[10px] font-semibold"
                    >
                      {n}
                    </span>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[#7a7a76] block">Villes du Québec</span>
                <div className="flex flex-wrap gap-1">
                  {playbook.scraping.cities.map((c) => (
                    <span
                      key={c}
                      className="px-2 py-0.5 bg-neutral-100 text-neutral-700 rounded-full border border-neutral-200 text-[10px] font-semibold"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Contact Sequence */}
          <section className="bg-white border border-[#e5e5e0] rounded-xl p-5 space-y-4 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#7a7a76]">Séquence de contact</h3>
            <div className="space-y-3">
              {playbook.sequence.map((step, i) => (
                <div key={i} className="rounded-xl border border-[#e5e5e0] p-4 bg-[#f7f7f4] space-y-2">
                  <div className="flex items-center gap-2 border-b border-[#e5e5e0]/60 pb-2">
                    <span className="text-[#7a7a76]">{CHANNEL_ICONS[step.channel] ?? <Mail className="h-3.5 w-3.5" />}</span>
                    <span className="text-xs font-bold text-[#26251e] capitalize">{step.channel}</span>
                    <span className="text-[10px] text-[#7a7a76] ml-auto font-bold uppercase tracking-wider bg-white px-2 py-0.5 rounded border border-[#e5e5e0]">
                      Jour {step.day}
                    </span>
                  </div>
                  {step.subject && (
                    <p className="text-[10px] font-bold text-[#26251e]">Objet : <span className="font-semibold text-[#555552]">{step.subject}</span></p>
                  )}
                  <pre className="text-xs text-[#555552] leading-relaxed whitespace-pre-wrap font-sans bg-white p-3 rounded-lg border border-[#e5e5e0]/60">
                    {step.template}
                  </pre>
                </div>
              ))}
            </div>
          </section>

          {/* Call Script */}
          <section className="bg-white border border-[#e5e5e0] rounded-xl p-5 space-y-3 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#7a7a76] flex items-center gap-2">
              <Phone className="h-3.5 w-3.5" />
              Script d'appel
            </h3>
            <pre className="text-xs text-[#555552] leading-relaxed whitespace-pre-wrap bg-[#f7f7f4] rounded-xl p-3 border border-[#e5e5e0] font-sans">
              {playbook.callScript}
            </pre>
          </section>

          {/* Proposal template */}
          <section className="bg-white border border-[#e5e5e0] rounded-xl p-5 space-y-3 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#7a7a76] flex items-center gap-2">
              <FileText className="h-3.5 w-3.5" />
              Modèle de proposition
            </h3>
            <pre className="text-xs text-[#555552] leading-relaxed whitespace-pre-wrap bg-[#f7f7f4] rounded-xl p-3 border border-[#e5e5e0] font-sans">
              {playbook.proposalTemplate}
            </pre>
          </section>
        </div>

        {/* Footer Deployment Trigger */}
        <div className="pt-2 flex gap-3">
          <Link
            href="/playbooks"
            className="flex-1 flex items-center justify-center px-4 py-2.5 rounded-lg border border-[#e5e5e0] text-xs font-semibold text-[#555552] hover:bg-[#f4f4f3] transition-colors"
          >
            Fermer
          </Link>
          <Link
            href={`/playbooks/${playbook.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold transition-colors"
          >
            <Play className="h-3.5 w-3.5" />
            Lancer le wizard
          </Link>
        </div>
      </div>
    </div>
  );
}
