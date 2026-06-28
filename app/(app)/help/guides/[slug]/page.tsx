import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock, BarChart3 } from 'lucide-react';
import { HELP_GUIDES, getHelpGuide } from '@/lib/help-guides';

export function generateStaticParams() {
  return HELP_GUIDES.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getHelpGuide(slug);
  return {
    title: guide ? guide.title : 'Guide',
    description: guide?.description ?? 'Guide pas à pas Minerva OS Reach Lite.',
  };
}

const LEVEL_COLORS: Record<string, string> = {
  'Débutant': 'bg-[#10b981]/10 text-[#059669] border-[#10b981]/20',
  'Intermédiaire': 'bg-amber-50 text-amber-700 border-amber-200',
  'Avancé': 'bg-violet-50 text-violet-700 border-violet-200',
};

export default async function HelpGuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getHelpGuide(slug);

  if (!guide) {
    notFound();
  }

  return (
    <div className="h-full overflow-y-auto min-h-0 scrollbar-thin">
      <div className="mx-auto max-w-2xl flex flex-col gap-6 p-6">

        <Link
          href="/help"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7a7a76] hover:text-[#26251e] transition-colors w-fit"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour au centre d'aide
        </Link>

        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${LEVEL_COLORS[guide.level]}`}>
              {guide.level}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#7a7a76]">
              <Clock className="h-3 w-3" />
              {guide.duration}
            </span>
          </div>
          <h1 className="text-xl font-bold text-[#26251e] tracking-tight">{guide.title}</h1>
          <p className="text-xs text-[#7a7a76] leading-relaxed">{guide.description}</p>
        </div>

        <div className="rounded-xl border border-[#e5e5e0] bg-white overflow-hidden divide-y divide-[#e5e5e0]/60">
          {guide.steps.map((step, index) => (
            <div key={step.title} className="flex gap-4 p-5">
              <div className="shrink-0 w-6 h-6 rounded-full bg-[#059669]/10 border border-[#059669]/20 flex items-center justify-center text-[10px] font-bold text-[#059669]">
                {index + 1}
              </div>
              <div className="space-y-1">
                <h2 className="text-xs font-bold text-[#26251e]">{step.title}</h2>
                <p className="text-[11px] text-[#555552] leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-[#e5e5e0] bg-[#f4f4f3] p-4 flex items-center gap-3">
          <BarChart3 className="h-4 w-4 text-[#10b981] shrink-0" />
          <p className="text-[11px] text-[#555552]">
            Besoin d'aide supplémentaire ? <Link href="/help" className="font-bold text-[#059669] hover:text-[#047857]">Consultez la FAQ</Link> ou contactez le support.
          </p>
        </div>

      </div>
    </div>
  );
}
