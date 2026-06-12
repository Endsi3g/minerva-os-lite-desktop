'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  Plus,
  Loader2,
  Sparkles,
  AlertCircle,
  Sliders,
  MapPin,
  Briefcase,
  ShieldCheck,
  BarChart3,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { MinervaIcon } from '@/components/icons';

// ─── Types ────────────────────────────────────────────────────────────────────
type Step = 'landing' | 'login' | 'otp' | 'selection' | 'workspace' | 'pricing' | 'analytics';
type Direction = 'forward' | 'backward';

// Steps that show the progress dots (excludes landing)
const FLOW_STEPS: Step[] = ['login', 'otp', 'selection', 'workspace', 'pricing', 'analytics'];

const PRESET_NICHES = [
  'Boulangerie', 'Coiffure', 'Restaurant', 'Garage',
  'Fleuriste', 'Plombier', 'Cabinet Médical', 'Agence Immo',
];

const PRESET_CITIES = [
  'Paris', 'Lyon', 'Marseille', 'Bordeaux', 'Lille', 'Nantes', 'Toulouse',
];

// ─── Right Panel Content per Step ─────────────────────────────────────────────
const RIGHT_PANEL_CONTENT: Record<string, { headline: string; sub: string; badge?: string }> = {
  login: {
    headline: 'Bienvenue sur Minerva',
    sub: 'L\'IA de prospection locale la plus avancée pour les agences françaises.',
    badge: 'Gratuit pour commencer',
  },
  otp: {
    headline: 'Vérification sécurisée',
    sub: 'Votre compte est protégé par une authentification en deux étapes.',
    badge: 'Email vérifié',
  },
  selection: {
    headline: 'Configurez vos agents',
    sub: 'Choisissez vos niches et villes cibles pour que l\'IA commence à travailler pour vous.',
    badge: 'Ciblage IA activé',
  },
  workspace: {
    headline: 'Votre espace de travail',
    sub: 'Centralisez vos prospects, campagnes et insights dans un tableau de bord unifié.',
    badge: 'Dashboard personnel',
  },
  pricing: {
    headline: 'Choisissez votre plan',
    sub: 'Commencez gratuitement, montez en puissance quand vous en avez besoin.',
    badge: 'Sans engagement',
  },
  analytics: {
    headline: 'Aidez-nous à progresser',
    sub: 'Partagez anonymement vos données d\'usage pour améliorer Minerva pour tous.',
    badge: 'Données anonymisées',
  },
};

// ─── Dot Progress Indicator ────────────────────────────────────────────────────
function DotProgress({ currentStep }: { currentStep: Step }) {
  const activeIdx = FLOW_STEPS.indexOf(currentStep);
  if (activeIdx === -1) return null;
  return (
    <div className="flex items-center justify-center gap-2 py-3">
      {FLOW_STEPS.map((_, idx) => (
        <span
          key={idx}
          className={cn(
            'rounded-full transition-all duration-300',
            idx === activeIdx
              ? 'w-2.5 h-2.5 bg-[#10b981]'
              : idx < activeIdx
              ? 'w-1.5 h-1.5 bg-[#10b981]/40'
              : 'w-1.5 h-1.5 bg-[#e6e5e0]',
          )}
        />
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('landing');
  const [direction, setDirection] = useState<Direction>('forward');
  const [slidePhase, setSlidePhase] = useState<'idle' | 'exit' | 'enter'>('idle');
  const [rightFade, setRightFade] = useState(true);

  // Form states
  const [email, setEmail] = useState('');
  const [isPersonalEmail, setIsPersonalEmail] = useState(false);
  const [otpCode, setOtpCode] = useState<string[]>(['', '', '', '', '', '']);
  const [fullName, setFullName] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');

  // Selection step
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [customNiche, setCustomNiche] = useState('');
  const [customCity, setCustomCity] = useState('');
  const [aiTone, setAiTone] = useState<'casual' | 'professional' | 'storytelling'>('professional');

  // Loader
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [isAnnualPlan, setIsAnnualPlan] = useState(true);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ── Check email domain ──────────────────────────────────────────────────────
  const checkEmailDomain = useCallback((val: string) => {
    const domain = val.split('@')[1];
    const personalDomains = [
      'gmail.com','yahoo.com','yahoo.fr','hotmail.com','hotmail.fr',
      'outlook.com','outlook.fr','aol.com','icloud.com','orange.fr',
      'free.fr','sfr.fr','live.fr','wanadoo.fr',
    ];
    setIsPersonalEmail(personalDomains.includes(domain?.toLowerCase()));
  }, []);

  // ── Pre-populate from session ───────────────────────────────────────────────
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        if (user.email) { setEmail(user.email); checkEmailDomain(user.email); }
        if (user.user_metadata?.full_name) setFullName(user.user_metadata.full_name);
      }
    };
    fetchUser();
  }, [checkEmailDomain]);

  // ── Step transition with slide animation ────────────────────────────────────
  const goToStep = useCallback((newStep: Step, dir: Direction = 'forward') => {
    if (step === newStep) return;
    setDirection(dir);
    setSlidePhase('exit');

    // Fade out right panel
    setRightFade(false);

    setTimeout(() => {
      setStep(newStep);
      setSlidePhase('enter');
      setTimeout(() => {
        setSlidePhase('idle');
        setRightFade(true);
      }, 250);
    }, 200);
  }, [step]);

  // ── Slide classes ───────────────────────────────────────────────────────────
  const slideClass = (() => {
    if (slidePhase === 'idle') return 'opacity-100 translate-x-0';
    if (slidePhase === 'exit') {
      return direction === 'forward'
        ? 'opacity-0 -translate-x-6'
        : 'opacity-0 translate-x-6';
    }
    // enter
    return direction === 'forward'
      ? 'opacity-0 translate-x-6'
      : 'opacity-0 -translate-x-6';
  })();

  // ── Form helpers ────────────────────────────────────────────────────────────
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    checkEmailDomain(val);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otpCode];
    newOtp[index] = value.slice(-1);
    setOtpCode(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      const newOtp = [...otpCode];
      newOtp[index - 1] = '';
      setOtpCode(newOtp);
      otpRefs.current[index - 1]?.focus();
    }
  };

  const toggleNiche = (niche: string) =>
    setSelectedNiches((p) => p.includes(niche) ? p.filter((n) => n !== niche) : [...p, niche]);

  const toggleCity = (city: string) =>
    setSelectedCities((p) => p.includes(city) ? p.filter((c) => c !== city) : [...p, city]);

  const addCustomNiche = () => {
    const t = customNiche.trim();
    if (t && !selectedNiches.includes(t)) { setSelectedNiches((p) => [...p, t]); setCustomNiche(''); }
  };

  const addCustomCity = () => {
    const t = customCity.trim();
    if (t && !selectedCities.includes(t)) { setSelectedCities((p) => [...p, t]); setCustomCity(''); }
  };

  const handleCreateWorkspace = async () => {
    setCreatingWorkspace(true);
    await new Promise((r) => setTimeout(r, 2200));
    setCreatingWorkspace(false);
    goToStep('pricing', 'forward');
  };

  const handleFinalizeOnboarding = async () => {
    const name = fullName.trim() || 'Utilisateur Minerva';
    const company = workspaceName.trim() || 'Mon Workspace';
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('settings').upsert({
        user_id: user.id,
        full_name: name,
        company_name: company,
        timezone: 'Europe/Paris',
        niches: selectedNiches.length > 0 ? selectedNiches : ['Boulangerie', 'Coiffure'],
        cities: selectedCities.length > 0 ? selectedCities : ['Paris'],
        ai_tone: aiTone === 'casual' ? 'Calme & Conseil' : aiTone === 'professional' ? 'Direct & Closer' : 'Storytelling',
        ai_density: 'Standard',
      });
    }
    const localSettings = {
      profile: { fullName: name, email: email || 'contact@uprising.studio', phone: '+33 6 12 34 56 78', language: 'fr', timezone: 'Europe/Paris' },
      prospecting: { niches: selectedNiches, cities: selectedCities, services: { website: true, seoAudit: true, acquisition: false }, language: 'both' },
      ai: { tone: aiTone, customization: 'medium', autoInsights: true, autoFollowUps: false },
      notifications: { reminderOverdue: true, dailyDigest: true, weeklyReport: false, digestTime: '20:00' },
      appearance: { density: 'comfortable', theme: 'dark' },
    };
    localStorage.setItem('minerva_reach_settings', JSON.stringify(localSettings));
    localStorage.setItem('minerva_welcome_seen', 'true');
    router.refresh();
    router.push('/today');
  };

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isOtpComplete = otpCode.every((c) => c !== '');

  // ── Right panel dynamic content ─────────────────────────────────────────────
  const panelContent = RIGHT_PANEL_CONTENT[step] ?? RIGHT_PANEL_CONTENT['login'];

  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen w-screen bg-white text-[#26251e] font-sans selection:bg-[#10b981]/10 flex flex-col justify-between overflow-x-hidden relative">

      {/* ── LANDING PAGE (Screen 0) ── */}
      {step === 'landing' ? (
        <div className="flex-grow flex flex-col justify-between min-h-screen">
          <header className="flex h-16 items-center justify-between px-8 md:px-16 border-b border-[#e6e5e0] bg-white">
            <div className="flex items-center gap-2.5 font-bold tracking-tight text-[#26251e]">
              <MinervaIcon size={22} className="text-[#10b981]" />
              <span className="text-sm">Minerva Reach</span>
            </div>
            <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-[#555552]">
              <span className="cursor-pointer hover:text-[#26251e] transition-colors">Minerva Agents</span>
              <span className="cursor-pointer hover:text-[#26251e] transition-colors">Minerva Learn</span>
              <span className="cursor-pointer hover:text-[#26251e] transition-colors">Mission</span>
              <span className="cursor-pointer hover:text-[#26251e] transition-colors">Careers</span>
            </nav>
            <button
              onClick={() => goToStep('login', 'forward')}
              className="rounded-full bg-[#26251e] hover:bg-[#1a1a19] text-white px-5 py-1.5 text-xs font-bold transition-all"
            >
              Sign in
            </button>
          </header>

          <main className="flex-1 flex flex-col items-center justify-center py-16 px-6 max-w-7xl mx-auto w-full">
            <h1
              className="text-5xl md:text-7xl tracking-tight text-center max-w-4xl text-[#26251e] mb-12 font-light leading-tight font-serif font-georgia"
            >
              Superintelligence <br className="hidden sm:inline" /> for local sales
            </h1>
            <div className="text-[10px] font-bold text-[#807d72] uppercase tracking-widest mb-6">Our products</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
              {/* Card 1 */}
              <div className="bg-[#0c0c0b] text-white rounded-2xl p-8 border border-neutral-800 flex flex-col justify-between aspect-[4/3] relative overflow-hidden group">
                <div className="space-y-3 relative z-10">
                  <h3 className="text-xl font-bold tracking-tight text-white font-serif font-georgia">Minerva Agents</h3>
                  <p className="text-xs text-neutral-400 max-w-xs leading-relaxed">AI agents designed to autonomously qualify and target local prospecting campaigns for your agency.</p>
                </div>
                 <div className="flex gap-3 pt-6 relative z-10">
                  <button onClick={() => goToStep('login', 'forward')} className="bg-white hover:bg-neutral-100 text-black rounded-full px-5 py-2 text-xs font-bold transition-colors">Explore</button>
                  <button onClick={() => goToStep('login', 'forward')} className="bg-[#10b981] hover:bg-[#059669] text-black rounded-full px-5 py-2 text-xs font-bold transition-colors">Book an intro</button>
                </div>
                <div className="absolute right-[-40px] bottom-[-40px] w-64 h-64 bg-neutral-900 rounded-tl-2xl border-l border-t border-neutral-800 p-4 opacity-75 group-hover:scale-105 transition-transform duration-500 ease-out">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500" /><div className="w-2.5 h-2.5 rounded-full bg-yellow-500" /><div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                    </div>
                    <div className="h-4 bg-neutral-800 rounded w-3/4" />
                    <div className="h-16 bg-[#10b981]/10 rounded border border-[#10b981]/20 p-2 text-[8px] text-[#10b981] font-mono">🤖 Qualifying bakeries in Paris...</div>
                  </div>
                </div>
              </div>
              {/* Card 2 */}
              <div className="bg-[#f7f7f4] text-[#26251e] rounded-2xl p-8 border border-[#e6e5e0] flex flex-col justify-between aspect-[4/3] relative overflow-hidden group">
                <div className="space-y-3 relative z-10">
                  <h3 className="text-xl font-bold tracking-tight text-[#26251e] font-serif font-georgia">Minerva Learn</h3>
                  <p className="text-xs text-[#807d72] max-w-xs leading-relaxed">AI-native knowledge base and training hub built to scale local prospecting methods.</p>
                </div>
                <div className="flex gap-3 pt-6 relative z-10">
                  <button onClick={() => goToStep('login', 'forward')} className="bg-[#26251e] hover:bg-[#1a1a19] text-white rounded-full px-5 py-2 text-xs font-bold transition-colors">Explore</button>
                  <button onClick={() => goToStep('login', 'forward')} className="bg-white hover:bg-neutral-100 text-[#26251e] border border-[#e6e5e0] rounded-full px-5 py-2 text-xs font-bold transition-colors">Book an intro</button>
                </div>
              </div>
            </div>
          </main>

          <footer className="h-16 flex items-center justify-between px-8 border-t border-[#e6e5e0] text-[10px] text-[#807d72] font-semibold">
            <div className="flex items-center gap-1.5"><MinervaIcon size={14} className="text-[#10b981]" /><span>Minerva OS</span></div>
            <div>curated by Mobbin</div>
          </footer>
        </div>

      ) : (
        /* ── SPLIT ONBOARDING LAYOUT ── */
        <div className="flex-grow flex flex-col lg:flex-row h-screen min-h-screen overflow-hidden">

          {/* ── LEFT COLUMN ── */}
          <div className="w-full lg:w-1/2 flex flex-col justify-between py-10 px-6 sm:px-12 bg-white relative z-10 overflow-y-auto">

            {/* Top bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-[#26251e] cursor-pointer" onClick={() => goToStep('landing', 'backward')}>
                <MinervaIcon size={18} className="text-[#10b981]" />
                <span className="text-xs">Minerva Reach</span>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-semibold text-[#807d72] bg-[#f7f7f4] border border-[#e6e5e0] rounded-full px-4 py-1.5">
                <span className="hover:text-[#26251e] transition-colors cursor-pointer">Overview</span>
                <span className="hover:text-[#26251e] transition-colors cursor-pointer">Pricing</span>
                <span className="hover:text-[#26251e] transition-colors cursor-pointer">FAQ</span>
              </div>
            </div>

            {/* Progress dots */}
            <DotProgress currentStep={step} />

            {/* Main animated content */}
            <div
              className={cn(
                'my-auto max-w-md w-full mx-auto space-y-6 py-8 transition-all duration-200 transform',
                slideClass,
              )}
            >
              {/* ─── LOGIN ───────────────────────────────────────────────── */}
              {step === 'login' && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-3xl tracking-tight text-[#26251e] font-serif font-light font-georgia">Welcome to Minerva</h2>
                    <p className="text-2xl tracking-tight text-[#807d72] font-serif font-light font-georgia">Your AI agent for work</p>
                    <p className="text-xs font-semibold text-[#807d72] pt-1">Sign in or sign up for free with your work email</p>
                  </div>

                  <button
                    onClick={() => goToStep('otp', 'forward')}
                    className="w-full flex items-center justify-center gap-2 bg-white border border-[#e6e5e0] hover:bg-neutral-50 text-xs font-bold rounded-full py-2.5 text-[#26251e] transition-all shadow-xs"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.9h6.6a5.64 5.64 0 0 1-2.44 3.7v3.08h3.93c2.3-2.12 3.65-5.24 3.65-8.6z" />
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.93-3.08a7.45 7.45 0 0 1-11.92-3.97H.12v3.18A12 12 0 0 0 12 24z" />
                      <path fill="#FBBC05" d="M4.08 14.04a7.16 7.16 0 0 1 0-4.08V6.78H.12a12 12 0 0 0 0 10.44l3.96-3.18z" />
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42A11.94 11.94 0 0 0 12 0 12 12 0 0 0 .12 6.78l3.96 3.18a7.48 7.48 0 0 1 7.92-5.21z" />
                    </svg>
                    <span>Continue with Google</span>
                  </button>

                  <div className="relative flex py-1.5 items-center">
                    <div className="flex-grow border-t border-[#e6e5e0]" />
                    <span className="flex-shrink mx-4 text-[10px] font-bold text-[#807d72] uppercase tracking-wider">or</span>
                    <div className="flex-grow border-t border-[#e6e5e0]" />
                  </div>

                  <div className="space-y-4">
                    <input
                      type="email"
                      placeholder="name@work-email.com"
                      value={email}
                      onChange={handleEmailChange}
                      className="w-full text-xs font-semibold px-4 py-3 bg-white border border-[#e6e5e0] focus:border-[#10b981] rounded-full outline-none transition-colors shadow-xs"
                    />
                    {isPersonalEmail && email.includes('@') && (
                      <div className="flex gap-2.5 p-3 rounded-2xl bg-neutral-100 text-xs text-[#555552] border border-[#e6e5e0]/60 animate-in fade-in slide-in-from-top-2 duration-300">
                        <AlertCircle className="w-4 h-4 text-[#807d72] shrink-0 mt-0.5" />
                        <span className="leading-relaxed">Using your work email will make it easier for you to collaborate with your team.</span>
                      </div>
                    )}
                    <button
                      onClick={() => goToStep('otp', 'forward')}
                      disabled={!isEmailValid}
                      className={cn(
                        'w-full rounded-full py-3 text-xs font-bold transition-all shadow-xs',
                        isEmailValid
                          ? 'bg-[#26251e] hover:bg-[#1a1a19] text-white cursor-pointer'
                          : 'bg-neutral-100 text-[#807d72] cursor-not-allowed border border-[#e6e5e0]',
                      )}
                    >
                      {isPersonalEmail ? 'Continue anyway' : 'Continue'}
                    </button>
                  </div>
                </div>
              )}

              {/* ─── OTP ─────────────────────────────────────────────────── */}
              {step === 'otp' && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-3xl tracking-tight text-[#26251e] font-serif font-light font-georgia">We sent you a code</h2>
                    <p className="text-xs text-[#807d72] font-semibold leading-relaxed">
                      Please check your inbox at{' '}
                      <span className="text-[#26251e] underline">{email || 'your email'}</span>. Enter the verification code below.
                    </p>
                  </div>

                  <div className="grid grid-cols-6 gap-2 pt-2">
                    {otpCode.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => { otpRefs.current[idx] = el; }}
                        type="text"
                        maxLength={1}
                        value={digit}
                        placeholder="0"
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className="aspect-square text-center text-sm font-bold bg-white border border-[#e6e5e0] focus:border-[#10b981] rounded-xl outline-none transition-colors shadow-xs text-[#26251e] placeholder:text-neutral-300"
                      />
                    ))}
                  </div>

                  <div className="text-left">
                    <span className="text-[10px] font-bold text-[#807d72] hover:text-[#26251e] uppercase tracking-wider cursor-pointer underline transition-colors">Resend code</span>
                  </div>

                  <div className="flex items-center gap-4 pt-4 border-t border-[#e6e5e0]/60">
                    <button
                      onClick={() => goToStep('login', 'backward')}
                      className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#e6e5e0] bg-white hover:bg-neutral-50 px-6 py-2.5 text-xs font-bold text-[#26251e] shadow-xs transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => goToStep('selection', 'forward')}
                      disabled={!isOtpComplete}
                      className={cn(
                        'flex-1 rounded-full py-2.5 text-xs font-bold transition-all shadow-xs text-center',
                        isOtpComplete
                          ? 'bg-[#26251e] hover:bg-[#1a1a19] text-white cursor-pointer'
                          : 'bg-neutral-100 text-[#807d72] cursor-not-allowed border border-[#e6e5e0]',
                      )}
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {/* ─── SELECTION ────────────────────────────────────────────── */}
              {step === 'selection' && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-3xl tracking-tight text-[#26251e] font-serif font-light font-georgia">Configure targeting</h2>
                    <p className="text-xs text-[#807d72] font-semibold leading-relaxed">
                      Choose the industries and cities you want your AI agents to start analyzing.
                    </p>
                  </div>

                  {/* Niches */}
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#807d72] flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5 text-[#10b981]" /><span>Secteurs d&apos;activité</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_NICHES.map((niche) => {
                        const active = selectedNiches.includes(niche);
                        return (
                          <button key={niche} type="button" onClick={() => toggleNiche(niche)}
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold transition-all cursor-pointer border',
                              active ? 'bg-[#10b981]/10 text-[#059669] border-[#10b981]/30' : 'bg-white text-[#555552] border-[#e6e5e0] hover:bg-neutral-50',
                            )}
                          >
                            <span>{niche}</span>
                            {active ? <Check className="w-3 h-3 text-[#059669]" /> : <Plus className="w-3 h-3 text-[#807d72]" />}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex gap-2">
                      <input type="text" placeholder="Ajouter une autre niche..." value={customNiche}
                        onChange={(e) => setCustomNiche(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCustomNiche()}
                        className="flex-1 text-[11px] font-semibold px-3 py-2 bg-white border border-[#e6e5e0] rounded-full outline-none focus:border-[#10b981]"
                      />
                      <button title="Ajouter niche" aria-label="Ajouter niche" onClick={addCustomNiche} className="rounded-full bg-white border border-[#e6e5e0] hover:bg-neutral-50 px-3 flex items-center justify-center">
                        <Plus className="w-4 h-4 text-[#26251e]" />
                      </button>
                    </div>
                  </div>

                  {/* Cities */}
                  <div className="space-y-2.5 pt-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#807d72] flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#10b981]" /><span>Villes Cibles</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_CITIES.map((city) => {
                        const active = selectedCities.includes(city);
                        return (
                          <button key={city} type="button" onClick={() => toggleCity(city)}
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold transition-all cursor-pointer border',
                              active ? 'bg-[#10b981]/10 text-[#059669] border-[#10b981]/30' : 'bg-white text-[#555552] border-[#e6e5e0] hover:bg-neutral-50',
                            )}
                          >
                            <span>{city}</span>
                            {active ? <Check className="w-3 h-3 text-[#059669]" /> : <Plus className="w-3 h-3 text-[#807d72]" />}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex gap-2">
                      <input type="text" placeholder="Ajouter une autre ville..." value={customCity}
                        onChange={(e) => setCustomCity(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCustomCity()}
                        className="flex-1 text-[11px] font-semibold px-3 py-2 bg-white border border-[#e6e5e0] rounded-full outline-none focus:border-[#10b981]"
                      />
                      <button title="Ajouter ville" aria-label="Ajouter ville" onClick={addCustomCity} className="rounded-full bg-white border border-[#e6e5e0] hover:bg-neutral-50 px-3 flex items-center justify-center">
                        <Plus className="w-4 h-4 text-[#26251e]" />
                      </button>
                    </div>
                  </div>

                  {/* AI Tone */}
                  <div className="space-y-2.5 pt-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#807d72] flex items-center gap-1">
                      <Sliders className="w-3.5 h-3.5 text-[#10b981]" /><span>Ton de l&apos;IA</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { id: 'casual' as const, name: 'Calme & Conseil' },
                        { id: 'professional' as const, name: 'Direct & Closer' },
                        { id: 'storytelling' as const, name: 'Storytelling' },
                      ]).map((t) => (
                        <button key={t.id} type="button" onClick={() => setAiTone(t.id)}
                          className={cn(
                            'flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all cursor-pointer text-xs font-bold',
                            aiTone === t.id ? 'bg-[#10b981]/5 border-[#10b981] text-[#059669]' : 'bg-white border-[#e6e5e0] text-[#555552] hover:bg-neutral-50',
                          )}
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pt-4 border-t border-[#e6e5e0]/60">
                    <button onClick={() => goToStep('otp', 'backward')} className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#e6e5e0] bg-white hover:bg-neutral-50 px-6 py-2.5 text-xs font-bold text-[#26251e] shadow-xs transition-colors">
                      Back
                    </button>
                    <button onClick={() => goToStep('workspace', 'forward')} className="flex-1 rounded-full py-2.5 text-xs font-bold bg-[#26251e] hover:bg-[#1a1a19] text-white cursor-pointer shadow-xs text-center">
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {/* ─── WORKSPACE ───────────────────────────────────────────── */}
              {step === 'workspace' && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-3xl tracking-tight text-[#26251e] font-serif font-light font-georgia">Welcome to Minerva OS Lite</h2>
                    <p className="text-xs text-[#807d72] font-semibold">Join or create a workspace</p>
                  </div>

                  <div className="border border-[#e6e5e0] rounded-2xl p-5 bg-white space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-[#26251e]">Create a new workspace</h4>
                      <p className="text-[11px] text-[#807d72] leading-relaxed">Set up an agency dashboard and configure AI campaigns from scratch.</p>
                    </div>
                    <div className="space-y-3 pt-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-[#807d72]">Your Full Name</label>
                        <input type="text" placeholder="e.g. Alex Smith" value={fullName} onChange={(e) => setFullName(e.target.value)}
                          className="w-full text-xs font-semibold px-4 py-2.5 bg-white border border-[#e6e5e0] focus:border-[#10b981] rounded-full outline-none shadow-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-[#807d72]">Workspace Name (Company)</label>
                        <input type="text" placeholder="e.g. Uprising Agency" value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)}
                          className="w-full text-xs font-semibold px-4 py-2.5 bg-white border border-[#e6e5e0] focus:border-[#10b981] rounded-full outline-none shadow-xs"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-3">
                      <button
                        onClick={handleCreateWorkspace}
                        disabled={!fullName.trim() || !workspaceName.trim() || creatingWorkspace}
                        className={cn(
                          'rounded-full px-6 py-2 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5',
                          fullName.trim() && workspaceName.trim()
                            ? 'bg-[#26251e] hover:bg-[#1a1a19] text-white cursor-pointer'
                            : 'bg-neutral-100 text-[#807d72] cursor-not-allowed border border-[#e6e5e0]',
                        )}
                      >
                        {creatingWorkspace ? (
                          <><Loader2 className="w-3.5 h-3.5 animate-spin text-[#807d72]" /><span>Creating...</span></>
                        ) : (
                          <span>Create</span>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="border border-[#e6e5e0] rounded-2xl p-5 bg-white flex items-center justify-between">
                    <div className="space-y-0.5 text-left">
                      <h4 className="text-xs font-bold text-[#26251e]">Not seeing your workspace?</h4>
                      <p className="text-[11px] text-[#807d72]">Try logging in with a different email address.</p>
                    </div>
                    <button
                      onClick={async () => {
                        const supabase = createClient();
                        await supabase.auth.signOut();
                        router.refresh();
                        router.push('/login');
                      }}
                      className="rounded-full border border-[#e6e5e0] bg-white hover:bg-neutral-50 px-5 py-2 text-xs font-bold text-[#cf2d56] transition-colors shadow-xs"
                    >
                      Log out
                    </button>
                  </div>

                  <div className="flex items-center gap-4 pt-2 border-t border-[#e6e5e0]/60">
                    <button onClick={() => goToStep('selection', 'backward')} className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#e6e5e0] bg-white hover:bg-neutral-50 px-6 py-2.5 text-xs font-bold text-[#26251e] shadow-xs transition-colors">
                      Back
                    </button>
                    <div className="text-center text-[10px] text-[#807d72] font-semibold flex-1">
                      Signed in as <span className="text-[#26251e] underline">{email || 'active user'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── PRICING ─────────────────────────────────────────────── */}
              {step === 'pricing' && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <h2 className="text-3xl tracking-tight text-[#26251e] font-serif font-light font-georgia">Upgrade your workspace</h2>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs text-[#807d72] font-semibold">Save €60/user/year with annual billing</span>
                      <button
                        title="Toggle annual billing"
                        aria-label="Toggle annual billing"
                        onClick={() => setIsAnnualPlan(!isAnnualPlan)}
                        className={cn(
                          'w-10 h-5 rounded-full p-0.5 transition-colors duration-200 flex items-center shrink-0',
                          isAnnualPlan ? 'bg-[#10b981] justify-end' : 'bg-neutral-200 justify-start',
                        )}
                      >
                        <span className="w-4 h-4 rounded-full bg-white shadow block" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Free plan */}
                    <div className="border border-[#e6e5e0] rounded-2xl p-4 bg-white space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-[#26251e]">Free</h4>
                          <p className="text-xl font-light text-[#26251e] font-serif font-georgia">€0 / month</p>
                        </div>
                        <button onClick={() => goToStep('analytics', 'forward')} className="rounded-full border border-[#e6e5e0] bg-white hover:bg-neutral-50 text-xs font-bold text-[#26251e] px-5 py-2 transition-colors">
                          Continue free
                        </button>
                      </div>
                      <ul className="space-y-1.5">
                        {['50 prospects / mois', '5 campagnes actives', 'Audit SEO de base', 'Support e-mail'].map((f, i) => (
                          <li key={i} className="flex items-center gap-2 text-[11px] font-semibold text-[#555552]">
                            <Check className="w-3 h-3 text-[#10b981] shrink-0" /><span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Team plan */}
                    <div className="border-2 border-[#10b981] rounded-2xl p-4 bg-[#10b981]/5 space-y-3 relative">
                      <span className="absolute -top-2.5 left-4 bg-[#10b981] text-white text-[9px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">Recommandé</span>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-[#26251e]">Team</h4>
                          <p className="text-xl font-light text-[#26251e] font-serif font-georgia">
                            {isAnnualPlan ? '€30' : '€35'}<span className="text-xs text-[#807d72] font-semibold"> / month</span>
                            {isAnnualPlan && <span className="text-xs text-[#807d72] line-through ml-2">€35</span>}
                          </p>
                        </div>
                        <button onClick={() => goToStep('analytics', 'forward')} className="rounded-full bg-[#26251e] hover:bg-[#1a1a19] text-white text-xs font-bold px-5 py-2 transition-colors">
                          Select Team
                        </button>
                      </div>
                      <ul className="space-y-1.5">
                        {['Prospects illimités', 'Campagnes illimitées', 'IA multi-agents avancée', 'Intégrations premium', 'Support prioritaire', 'Jusqu\'à 50 membres'].map((f, i) => (
                          <li key={i} className="flex items-center gap-2 text-[11px] font-semibold text-[#555552]">
                            <Check className="w-3 h-3 text-[#10b981] shrink-0" /><span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <p className="text-center text-[9px] font-semibold text-[#807d72]">
                    ISO 27001 · RGPD · Données chiffrées AES-256
                  </p>

                  <div className="flex items-center gap-4 pt-2 border-t border-[#e6e5e0]/60">
                    <button onClick={() => goToStep('workspace', 'backward')} className="inline-flex items-center justify-center rounded-full border border-[#e6e5e0] bg-white hover:bg-neutral-50 px-6 py-2.5 text-xs font-bold text-[#26251e] shadow-xs transition-colors">
                      Back
                    </button>
                  </div>
                </div>
              )}

              {/* ─── ANALYTICS ───────────────────────────────────────────── */}
              {step === 'analytics' && (
                <div className="space-y-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#10b981]/10 border border-[#10b981]/20">
                    <Sparkles className="w-6 h-6 text-[#10b981]" />
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-3xl tracking-tight text-[#26251e] font-serif font-light font-georgia">Help us improve</h2>
                    <p className="text-xs text-[#555552] font-semibold leading-relaxed">
                      Allow your questions to be logged anonymously to help us improve our services. You can opt-out at any time in Settings.{' '}
                      <span className="underline cursor-pointer hover:text-[#26251e]">Learn more in our Privacy Notice</span>.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {[
                      { icon: <BarChart3 className="w-4 h-4 text-[#10b981]" />, title: 'Analytics d\'usage', desc: 'Nous aide à améliorer les performances de l\'IA.' },
                      { icon: <ShieldCheck className="w-4 h-4 text-[#10b981]" />, title: 'Données anonymisées', desc: 'Aucune donnée personnelle ou sensible n\'est collectée.' },
                      { icon: <Zap className="w-4 h-4 text-[#10b981]" />, title: 'Opt-out à tout moment', desc: 'Désactivez le partage dans Paramètres > Confidentialité.' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-2xl border border-[#e6e5e0] bg-neutral-50">
                        <div className="shrink-0 mt-0.5">{item.icon}</div>
                        <div>
                          <p className="text-xs font-bold text-[#26251e]">{item.title}</p>
                          <p className="text-[11px] text-[#807d72] font-semibold leading-relaxed">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t border-[#e6e5e0]/60">
                    <button onClick={handleFinalizeOnboarding} className="flex-1 rounded-full bg-neutral-100 hover:bg-neutral-200 text-xs font-bold text-[#555552] py-2.5 transition-colors text-center">
                      Don&apos;t share
                    </button>
                    <button onClick={handleFinalizeOnboarding} className="flex-1 rounded-full bg-[#26251e] hover:bg-[#1a1a19] text-white text-xs font-bold py-2.5 transition-colors shadow-xs text-center">
                      Share analytics
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom brand */}
            <div className="flex items-center gap-1.5 justify-start text-[10px] text-[#807d72] font-semibold mt-6">
              <MinervaIcon size={14} className="text-[#10b981]" />
              <span>Minerva OS Reach Lite</span>
            </div>
          </div>

          {/* ── RIGHT COLUMN (Dynamic) ── */}
          <div className="hidden lg:flex w-1/2 bg-[#0c0c0b] flex-col items-center justify-center relative p-8 border-l border-neutral-800">

            {/* Background glows */}
            <div className="absolute top-[10%] right-[10%] w-[350px] h-[350px] bg-[#10b981]/5 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute bottom-[10%] left-[10%] w-[350px] h-[350px] bg-neutral-800/10 rounded-full blur-[140px] pointer-events-none" />

            {/* Dynamic headline (fades with step) */}
            <div
              className={cn(
                'absolute top-12 left-10 right-10 transition-all duration-300',
                rightFade ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2',
              )}
            >
              {panelContent.badge && (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#10b981] bg-[#10b981]/10 border border-[#10b981]/20 rounded-full px-3 py-1 mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                  {panelContent.badge}
                </span>
              )}
              <h3
                className="text-2xl font-light text-white font-serif leading-snug mb-2 font-georgia"
              >
                {panelContent.headline}
              </h3>
              <p className="text-xs text-neutral-400 font-semibold leading-relaxed max-w-xs">
                {panelContent.sub}
              </p>
            </div>

            {/* 3D Laptop Mockup */}
            <div
              className="relative w-full max-w-[560px] aspect-[16/11] select-none transition-transform duration-700 ease-out laptop-mockup-3d"
            >
              {/* Laptop lid */}
              <div
                className="relative bg-[#1f1f1e] rounded-xl p-[10px] border border-neutral-700/30 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.85)] laptop-lid-3d"
              >
                {/* Webcam dot */}
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-black rounded-full border border-neutral-800 flex items-center justify-center">
                  <div className="w-0.5 h-0.5 bg-blue-500 rounded-full opacity-60" />
                </div>

                {/* Screen */}
                <div className="relative bg-[#0c0c0b] aspect-[16/10] rounded-lg overflow-hidden border border-neutral-800/80 flex text-[10px] leading-tight text-white select-none">

                  {/* Sidebar */}
                  <div className="w-[110px] bg-[#161615] border-r border-neutral-800 flex flex-col justify-between p-2 shrink-0">
                    <div className="space-y-4">
                      <div className="flex items-center gap-1.5 px-1 font-bold text-white tracking-tight text-[9px] pt-1">
                        <MinervaIcon size={12} className="text-[#10b981]" />
                        <span>Minerva OS</span>
                      </div>
                      <div className="space-y-1">
                        {[
                          { name: 'Prospecter', active: true },
                          { name: 'Search', active: false },
                          { name: 'Library', active: false },
                          { name: 'Agents', active: false },
                          { name: 'Integrations', active: false },
                        ].map((item, i) => (
                          <div
                            key={i}
                            className={cn(
                              'flex items-center gap-1.5 px-1.5 py-1 rounded transition-colors text-[8px] font-semibold',
                              item.active ? 'bg-[#1f1f1e] text-[#10b981] border border-neutral-800' : 'text-neutral-400',
                            )}
                          >
                            <div className={cn('w-1.5 h-1.5 rounded-full', item.active ? 'bg-[#10b981]' : 'bg-neutral-600')} />
                            <span>{item.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-1 text-[8px] text-neutral-400 font-semibold border-t border-neutral-800/50 pt-2">
                      <div className="w-4 h-4 rounded-full bg-neutral-800 flex items-center justify-center font-bold text-[7px] text-white">M</div>
                      <span className="truncate text-left">{email ? email.split('@')[0] : 'workspace'}</span>
                    </div>
                  </div>

                  {/* Main area */}
                  <div className="flex-1 bg-[#0c0c0b] flex flex-col justify-between p-3.5 relative">
                    <div className="flex justify-between items-center pb-2 border-b border-neutral-800/40">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500/80" />
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500/80" />
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500/80" />
                      </div>
                      <div className="text-[7px] text-neutral-500 font-mono">https://minerva.os/dashboard</div>
                    </div>

                    <div className="flex-1 flex flex-col justify-center space-y-2.5 max-w-[240px] mx-auto py-2">
                      <div
                        className="bg-[#10b981]/10 border border-[#10b981]/30 rounded-lg p-3 text-left space-y-1.5 shadow-xl animate-float-4s"
                      >
                        <div className="flex items-center justify-between text-[7px] font-bold text-[#10b981] uppercase tracking-wider">
                          <span>Suggested Task</span>
                          <span className="px-1.5 py-0.5 rounded-full bg-[#10b981]/20 text-[6px]">Active</span>
                        </div>
                        <h4 className="text-[10px] font-bold text-white tracking-tight font-serif leading-snug">Update local leads database & qualification pipeline</h4>
                        <div className="flex items-center gap-1 pt-0.5">
                          <div className="w-3 h-3 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-[5px]">👤</div>
                          <span className="text-[7px] text-neutral-300 font-semibold">Sales AI Agent</span>
                        </div>
                      </div>

                      <div
                        className="bg-[#161615] border border-neutral-800 rounded-lg p-3 text-left space-y-1.5 shadow-xl animate-float-5-5s"
                      >
                        <div className="flex items-center justify-between text-[7px] font-bold text-neutral-500 uppercase tracking-wider">
                          <span>Recent Meeting</span>
                        </div>
                        <h4 className="text-[10px] font-bold text-neutral-200 tracking-tight font-serif leading-snug">Feedback my local pitch with Kindred bakery owner</h4>
                        <div className="h-1 bg-neutral-800 rounded-full w-full overflow-hidden">
                          <div className="bg-[#10b981] h-full rounded-full w-3/4" />
                        </div>
                      </div>
                    </div>

                    <div className="border border-neutral-800/80 rounded-full bg-[#161615] px-3.5 py-2 flex items-center justify-between">
                      <span className="text-[7.5px] text-neutral-400 font-semibold font-serif">Ask Sales Assistant anything...</span>
                      <button className="w-4 h-4 bg-[#10b981] text-black font-bold rounded-full flex items-center justify-center text-[9px]">→</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Keyboard base */}
              <div
                className="absolute top-[96%] left-[3%] w-[94%] h-[15px] bg-[#2a2a29] rounded-b-xl border-t border-neutral-600/30 shadow-[0_25px_45px_rgba(0,0,0,0.95)] keyboard-base-3d"
              >
                <div className="absolute top-0.5 left-1/2 -translate-x-1/2 w-[120px] h-[10px] bg-[#1a1a1a] rounded-b border-x border-b border-neutral-700/40" />
                <div className="absolute top-[2px] left-[10px] right-[10px] h-0.5 bg-neutral-800 opacity-80" />
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
