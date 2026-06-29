'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/api-helper';
import { Check, ChevronRight, Loader2, Sparkles } from 'lucide-react';

// ---------- Static data ----------

const TARGET_OPTIONS = [
  'Restaurants', 'Commerces de détail', 'Salons/Spas', 'Entrepreneurs',
  'PME', 'Artisans', 'Professionnels de santé', 'Autre',
];

const TONE_OPTIONS = [
  { id: 'Professionnel & formel', label: 'Professionnel & formel', sample: 'Bonjour M. Tremblay, Je me permets de…' },
  { id: 'Direct & concis', label: 'Direct & concis', sample: 'Salut Jean, J\'ai une idée pour toi…' },
  { id: 'Chaleureux & humain', label: 'Chaleureux & humain', sample: 'Bonjour ! Je suis passé devant chez toi…' },
  { id: 'Expert & confiant', label: 'Expert & confiant', sample: 'J\'ai analysé votre fiche Google. Voici ce que j\'ai trouvé.' },
];

const OBJECTION_OPTIONS = [
  'Pas intéressé', 'Déjà un fournisseur', 'Pas le moment / trop occupé',
  'Trop cher', 'Je vais y réfléchir',
];

interface Answers {
  business: string;
  targetClients: string[];
  targetClientsExtra: string;
  valueProposition: string;
  tone: string;
  objections: string[];
  objectionsExtra: string;
}

interface GeneratedAssets {
  emails: string[];
  terrainScript: string;
  objectionResponses: string;
  systemPrompt: string;
}

// ---------- Helpers ----------

async function callChat(prompt: string): Promise<string> {
  try {
    const res = await fetch(getApiUrl('/api/chat'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        provider: 'anthropic',
      }),
    });
    if (!res.ok) return '';
    const data = await res.json();
    return (data.content || data.message || '').trim();
  } catch {
    return '';
  }
}

// ---------- Component ----------

export function AISetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<Answers>({
    business: '',
    targetClients: [],
    targetClientsExtra: '',
    valueProposition: '',
    tone: '',
    objections: [],
    objectionsExtra: '',
  });

  // Step 7 generation progress
  const [genStage, setGenStage] = useState(0);
  const [assets, setAssets] = useState<GeneratedAssets | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedEmail, setExpandedEmail] = useState<number | null>(0);

  const totalSteps = 8;

  const messages: Record<number, string> = {
    1: "Bonjour ! Je suis ton assistant de configuration IA. Je vais te poser quelques questions pour personnaliser tes messages de prospection. Ça prend environ 3 minutes.",
    2: "Décris ton activité en quelques mots. Quel service ou produit offres-tu ?",
    3: "Qui sont tes clients idéaux ?",
    4: "Qu'est-ce qui te différencie de la concurrence ? Quel résultat concret apportes-tu ?",
    5: "Comment tu parles naturellement à tes prospects ?",
    6: "Quelles objections entends-tu le plus souvent ?",
    7: "Parfait ! Je génère maintenant tes templates personnalisés…",
    8: "C'est prêt ! Voici tes assets de prospection personnalisés.",
  };

  const userAnswerForStep = (s: number): string | null => {
    switch (s) {
      case 2: return answers.business || null;
      case 3: {
        const parts = [...answers.targetClients];
        if (answers.targetClientsExtra) parts.push(answers.targetClientsExtra);
        return parts.length ? parts.join(', ') : null;
      }
      case 4: return answers.valueProposition || null;
      case 5: return answers.tone || null;
      case 6: {
        const parts = [...answers.objections];
        if (answers.objectionsExtra) parts.push(answers.objectionsExtra);
        return parts.length ? parts.join(', ') : null;
      }
      default: return null;
    }
  };

  const canAdvance = (): boolean => {
    switch (step) {
      case 2: return answers.business.trim().length > 0;
      case 3: return answers.targetClients.length > 0 || answers.targetClientsExtra.trim().length > 0;
      case 4: return answers.valueProposition.trim().length > 0;
      case 5: return answers.tone.length > 0;
      case 6: return true; // objections optional
      default: return true;
    }
  };

  const toggleArray = (key: 'targetClients' | 'objections', value: string) => {
    setAnswers((prev) => {
      const arr = prev[key];
      return {
        ...prev,
        [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
      };
    });
  };

  // ---- Generation flow (step 7) ----
  const runGeneration = async () => {
    setStep(7);
    setGenStage(0);

    const targets = [...answers.targetClients, answers.targetClientsExtra].filter(Boolean).join(', ');
    const objections = [...answers.objections, answers.objectionsExtra].filter(Boolean);

    const ctx = `Business: ${answers.business}
Clients cibles: ${targets}
Proposition de valeur: ${answers.valueProposition}
Ton: ${answers.tone}`;

    // Stage 1 — analysis (visual)
    setGenStage(1);
    await new Promise((r) => setTimeout(r, 500));

    // Stage 2 — email sequence (3 emails)
    setGenStage(2);
    const emailPrompt = (kind: string) => `Tu es un expert en prospection B2B québécois.
${ctx}
Génère un email ${kind} court (150 mots max), percutant, en français québécois naturel.
Format: Objet: [ligne d'objet]\n\n[corps du message]`;

    const email1 = await callChat(emailPrompt('de premier contact'));
    const email2 = await callChat(emailPrompt('de relance (2e email d\'une séquence, le prospect n\'a pas répondu)'));
    const email3 = await callChat(emailPrompt('de break-up (dernier email, on clôt poliment la séquence)'));

    // Stage 3 — terrain script + objections
    setGenStage(3);
    const terrainScript = await callChat(`Tu es un expert en prospection terrain B2B québécois.
${ctx}
Génère un script terrain court pour une approche en personne (porte-à-porte / visite). Naturel, en français québécois. Inclure: accroche, proposition de valeur, appel à l'action.`);

    const objList = objections.length ? objections.join(', ') : 'Pas intéressé, Déjà un fournisseur, Pas le moment, Trop cher, Je vais y réfléchir';
    const objectionResponses = await callChat(`Tu es un expert en closing B2B québécois.
${ctx}
Pour chacune de ces objections, donne une réponse courte, naturelle et efficace en français québécois.
Objections: ${objList}
Format: une objection par bloc, "Objection: …\\nRéponse: …".`);

    // Stage 4 — system prompt
    setGenStage(4);
    const systemPrompt = await callChat(`Génère un prompt système (instructions IA) en français pour un copilote de prospection.
Le copilote doit rédiger des messages personnalisés cohérents avec ce profil:
${ctx}
Le prompt système doit décrire le ton, le style, la cible et la proposition de valeur, et tenir en un paragraphe dense. Réponds uniquement avec le prompt système, sans préambule.`);

    const generated: GeneratedAssets = {
      emails: [email1, email2, email3],
      terrainScript,
      objectionResponses,
      systemPrompt: systemPrompt || `Copilote de prospection. Business: ${answers.business}. Cible: ${targets}. Valeur: ${answers.valueProposition}. Ton: ${answers.tone}.`,
    };
    setAssets(generated);

    // Save to backend
    setSaving(true);
    try {
      await fetch(getApiUrl('/api/ai/setup'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: generated.systemPrompt,
          persona: {
            business: answers.business,
            targetClients: targets,
            valueProposition: answers.valueProposition,
            tone: answers.tone,
          },
          emailTemplates: generated.emails,
          objectionResponses: objections,
          terrainScript: generated.terrainScript,
        }),
      });
    } catch {
      // non-blocking
    } finally {
      setSaving(false);
    }

    setStep(8);
  };

  // ---------- Step input renderers ----------

  const renderStepInput = () => {
    switch (step) {
      case 1:
        return (
          <button
            onClick={() => setStep(2)}
            className="h-10 px-5 bg-[#059669] text-white text-sm font-bold rounded-xl flex items-center gap-2 hover:bg-[#047857] transition-colors"
          >
            Commencer <ChevronRight className="h-4 w-4" />
          </button>
        );

      case 2:
        return (
          <div className="flex flex-col gap-3">
            <textarea
              rows={3}
              value={answers.business}
              onChange={(e) => setAnswers({ ...answers, business: e.target.value })}
              placeholder="Ex: J'aide les restaurants à améliorer leur présence en ligne via Google Maps et leur site web."
              className="w-full text-sm text-[#26251e] border border-[#e5e5e0] rounded-xl px-4 py-3 resize-none focus:outline-none focus:border-[#059669]"
            />
            {nextButton()}
          </div>
        );

      case 3:
        return (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {TARGET_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => toggleArray('targetClients', opt)}
                  className={`h-8 px-3 rounded-full text-xs font-bold border transition-colors ${
                    answers.targetClients.includes(opt)
                      ? 'bg-[#059669] text-white border-[#059669]'
                      : 'bg-white text-[#26251e] border-[#e5e5e0] hover:border-[#059669]'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            <textarea
              rows={2}
              value={answers.targetClientsExtra}
              onChange={(e) => setAnswers({ ...answers, targetClientsExtra: e.target.value })}
              placeholder="Précise tes clients cibles (optionnel)…"
              className="w-full text-sm text-[#26251e] border border-[#e5e5e0] rounded-xl px-4 py-3 resize-none focus:outline-none focus:border-[#059669]"
            />
            {nextButton()}
          </div>
        );

      case 4:
        return (
          <div className="flex flex-col gap-3">
            <textarea
              rows={3}
              value={answers.valueProposition}
              onChange={(e) => setAnswers({ ...answers, valueProposition: e.target.value })}
              placeholder="Ex: On garantit +20% de clients en 60 jours ou remboursement complet."
              className="w-full text-sm text-[#26251e] border border-[#e5e5e0] rounded-xl px-4 py-3 resize-none focus:outline-none focus:border-[#059669]"
            />
            {nextButton()}
          </div>
        );

      case 5:
        return (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {TONE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setAnswers({ ...answers, tone: opt.id })}
                  className={`text-left p-3 rounded-xl border transition-colors ${
                    answers.tone === opt.id
                      ? 'bg-[#059669]/8 border-[#059669]'
                      : 'bg-white border-[#e5e5e0] hover:border-[#059669]'
                  }`}
                >
                  <p className="text-sm font-bold text-[#26251e]">{opt.label}</p>
                  <p className="text-xs text-[#7a7a76] mt-1 italic">{opt.sample}</p>
                </button>
              ))}
            </div>
            {nextButton()}
          </div>
        );

      case 6:
        return (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {OBJECTION_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => toggleArray('objections', opt)}
                  className={`h-8 px-3 rounded-full text-xs font-bold border transition-colors ${
                    answers.objections.includes(opt)
                      ? 'bg-[#059669] text-white border-[#059669]'
                      : 'bg-white text-[#26251e] border-[#e5e5e0] hover:border-[#059669]'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            <textarea
              rows={2}
              value={answers.objectionsExtra}
              onChange={(e) => setAnswers({ ...answers, objectionsExtra: e.target.value })}
              placeholder="Autres objections fréquentes (optionnel)…"
              className="w-full text-sm text-[#26251e] border border-[#e5e5e0] rounded-xl px-4 py-3 resize-none focus:outline-none focus:border-[#059669]"
            />
            <button
              onClick={runGeneration}
              className="h-10 px-5 self-end bg-[#059669] text-white text-sm font-bold rounded-xl flex items-center gap-2 hover:bg-[#047857] transition-colors"
            >
              Générer mes templates <Sparkles className="h-4 w-4" />
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  const nextButton = () => (
    <button
      onClick={() => setStep(step + 1)}
      disabled={!canAdvance()}
      className="h-10 px-5 self-end bg-[#059669] text-white text-sm font-bold rounded-xl flex items-center gap-2 hover:bg-[#047857] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      Continuer <ChevronRight className="h-4 w-4" />
    </button>
  );

  // ---------- Generation animation (step 7) ----------

  const genSteps = [
    'Analyse de ton profil…',
    'Création de la séquence email (3 emails)…',
    'Script terrain + réponses aux objections…',
    'Prompt système personnalisé…',
  ];

  // ---------- Render ----------

  return (
    <div className="flex flex-col h-full bg-[#fafaf8]">
      {/* Progress bar */}
      <div className="h-1 bg-[#e5e5e0]">
        <div className="h-full bg-[#059669] transition-all" style={{ width: `${(step / totalSteps) * 100}%` }} />
      </div>

      {/* Chat messages zone */}
      <div className="flex-1 overflow-auto p-6 space-y-4 max-w-2xl mx-auto w-full">
        {/* Bot message for the current step */}
        <div className="flex gap-3 animate-in fade-in duration-300">
          <div className="w-8 h-8 rounded-full bg-[#059669] flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-black">M</span>
          </div>
          <div className="bg-white border border-[#e5e5e0] rounded-2xl rounded-tl-sm px-4 py-3 max-w-md shadow-sm">
            <p className="text-sm text-[#26251e] leading-relaxed">{messages[step]}</p>
          </div>
        </div>

        {/* User answer echo (if any) */}
        {userAnswerForStep(step) && (
          <div className="flex justify-end animate-in fade-in duration-300">
            <div className="bg-[#059669] text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-md">
              <p className="text-sm leading-relaxed">{userAnswerForStep(step)}</p>
            </div>
          </div>
        )}

        {/* Step 7 — generation animation */}
        {step === 7 && (
          <div className="flex flex-col gap-3 pt-2">
            {genSteps.map((label, i) => {
              const stageNum = i + 1;
              const active = genStage >= stageNum;
              return (
                <div key={i} className="flex items-center gap-2.5">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${active ? 'bg-[#059669]' : 'bg-[#e5e5e0]'}`}>
                    {active ? (
                      <Check className="h-3 w-3 text-white" />
                    ) : (
                      <Loader2 className="h-3 w-3 text-[#7a7a76] animate-spin" />
                    )}
                  </div>
                  <p className={`text-sm ${active ? 'text-[#26251e] font-semibold' : 'text-[#7a7a76]'}`}>{label}</p>
                </div>
              );
            })}
            {saving && <p className="text-xs text-[#7a7a76] pl-7">Sauvegarde de tes templates…</p>}
          </div>
        )}

        {/* Step 8 — results */}
        {step === 8 && assets && (
          <div className="flex flex-col gap-4 pt-2 animate-in fade-in duration-300">
            {/* Emails */}
            <div className="bg-white border border-[#e5e5e0] rounded-2xl p-4">
              <p className="text-sm font-bold text-[#26251e] mb-3">Séquence email (3 messages)</p>
              <div className="flex flex-col gap-2">
                {assets.emails.map((email, i) => (
                  <div key={i} className="border border-[#e5e5e0] rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedEmail(expandedEmail === i ? null : i)}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-[#f4f4f3] transition-colors"
                    >
                      <span className="text-xs font-bold text-[#26251e]">
                        {['Email 1 — Premier contact', 'Email 2 — Relance', 'Email 3 — Break-up'][i]}
                      </span>
                      <ChevronRight className={`h-3.5 w-3.5 text-[#7a7a76] transition-transform ${expandedEmail === i ? 'rotate-90' : ''}`} />
                    </button>
                    {expandedEmail === i && (
                      <pre className="text-xs text-[#26251e] whitespace-pre-wrap px-3 py-3 border-t border-[#e5e5e0] bg-[#fafaf8] font-sans leading-relaxed">
                        {email || '(non généré)'}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Terrain script */}
            <div className="bg-white border border-[#e5e5e0] rounded-2xl p-4">
              <p className="text-sm font-bold text-[#26251e] mb-2">Script terrain</p>
              <pre className="text-xs text-[#26251e] whitespace-pre-wrap font-sans leading-relaxed">{assets.terrainScript || '(non généré)'}</pre>
            </div>

            {/* Objections */}
            <div className="bg-white border border-[#e5e5e0] rounded-2xl p-4">
              <p className="text-sm font-bold text-[#26251e] mb-2">Réponses aux objections</p>
              <pre className="text-xs text-[#26251e] whitespace-pre-wrap font-sans leading-relaxed">{assets.objectionResponses || '(non généré)'}</pre>
            </div>

            <div className="flex items-center gap-2 text-xs text-[#059669] font-semibold">
              <Check className="h-4 w-4" />
              Tes templates sont sauvegardés.
            </div>

            <button
              onClick={() => router.push('/outreach')}
              className="h-11 px-5 self-start bg-[#059669] text-white text-sm font-bold rounded-xl flex items-center gap-2 hover:bg-[#047857] transition-colors"
            >
              Accéder à Outreach <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Input zone (hidden during generation + results) */}
      {step < 7 && (
        <div className="p-4 border-t border-[#e5e5e0] bg-white">
          <div className="max-w-2xl mx-auto w-full">{renderStepInput()}</div>
        </div>
      )}
    </div>
  );
}
