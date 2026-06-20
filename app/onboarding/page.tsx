'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  Camera,
  Upload,
  User,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { MinervaIcon } from '@/components/icons';
import { useLanguage } from '@/lib/language-context';

// ─── Types ────────────────────────────────────────────────────────────────────
type Step = 'login' | 'otp' | 'selection' | 'workspace' | 'pricing' | 'analytics' | 'profile' | 'finalizing';
type Direction = 'forward' | 'backward';

// Steps that show the progress dots (excludes landing)
const FLOW_STEPS: Step[] = ['login', 'otp', 'selection', 'workspace', 'pricing', 'analytics', 'profile'];

const PRESET_ROLES = [
  'Fondateur / CEO',
  'Commercial / Prospecteur',
  'Chargé de compte',
  'Développeur / Designer',
];

const PRESET_NICHES = [
  'Boulangerie', 'Coiffure', 'Restaurant', 'Garage',
  'Fleuriste', 'Plombier', 'Cabinet Médical', 'Agence Immo',
];

const PRESET_CITIES = [
  'Montréal', 'Québec', 'Laval', 'Gatineau', 'Sherbrooke', 'Toronto', 'Vancouver',
];


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

// ─── Finalizing Checklist Component ───────────────────────────────────────────
function FinalizingCheck({ index, delay }: { index: number; delay: number }) {
  const [status, setStatus] = useState<'pending' | 'loading' | 'done'>('pending');

  useEffect(() => {
    const loadTimer = setTimeout(() => {
      setStatus('loading');
    }, delay);

    const doneTimer = setTimeout(() => {
      setStatus('done');
    }, delay + 1200);

    return () => {
      clearTimeout(loadTimer);
      clearTimeout(doneTimer);
    };
  }, [delay]);

  if (status === 'pending') {
    return <div className="w-4 h-4 rounded-full border border-[#e6e5e0] shrink-0" />;
  }

  if (status === 'loading') {
    return (
      <div className="w-4 h-4 rounded-full border border-[#10b981]/30 border-t-[#10b981] animate-spin shrink-0" />
    );
  }

  return (
    <div className="w-4 h-4 rounded-full bg-[#10b981] text-white flex items-center justify-center text-[10px] font-bold shrink-0 animate-in zoom-in duration-300">
      ✓
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
function OnboardingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, setLocale } = useLanguage();
  const [isInvited, setIsInvited] = useState(false);
  const [step, setStep] = useState<Step>('selection');
  const [direction, setDirection] = useState<Direction>('forward');
  const [slidePhase, setSlidePhase] = useState<'idle' | 'exit' | 'enter'>('idle');
  // rightFade was used by the removed right panel — kept as no-op to avoid refactoring goToStep
  const [_rightFade, setRightFade] = useState(true);

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

  // Profile step states
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [photoTab, setPhotoTab] = useState<'file' | 'webcam'>('file');
  const [userRole, setUserRole] = useState('');
  const [userRoleCustom, setUserRoleCustom] = useState('');
  const [bio, setBio] = useState('');
  const [emailSignature, setEmailSignature] = useState('');
  const [webcamActive, setWebcamActive] = useState(false);
  const [webcamError, setWebcamError] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  // Detect invited flow
  useEffect(() => {
    if (searchParams.get('invited') === 'true') setIsInvited(true);
  }, [searchParams]);

  // ── Pre-populate from session ───────────────────────────────────────────────
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        if (user.email) { setEmail(user.email); checkEmailDomain(user.email); }
        if (user.user_metadata?.full_name) setFullName(user.user_metadata.full_name);
        setStep((prev) => {
          if (prev === 'login' || prev === 'otp') {
            return 'selection';
          }
          return prev;
        });
      } else {
        router.push('/login');
      }
    };
    fetchUser();
  }, [checkEmailDomain, router]);

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

  // ── Webcam helpers ──────────────────────────────────────────────────────────
  const startWebcam = async () => {
    setWebcamError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 256, height: 256, facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setWebcamActive(true);
    } catch {
      setWebcamError('Caméra inaccessible. Vérifiez les permissions.');
    }
  };

  const stopWebcam = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setWebcamActive(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const size = 256;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, size, size);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setProfilePhoto(dataUrl);
    stopWebcam();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 256;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        setProfilePhoto(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Stop webcam when switching tabs or leaving step
  useEffect(() => {
    if (photoTab !== 'webcam' || step !== 'profile') stopWebcam();
  }, [photoTab, step]);

  const handleCreateWorkspace = async () => {
    setCreatingWorkspace(true);
    await new Promise((r) => setTimeout(r, 2200));
    setCreatingWorkspace(false);
    goToStep('pricing', 'forward');
  };

  const handleFinalizeOnboarding = async () => {
    const name = fullName.trim() || 'Utilisateur Minerva';
    const nameParts = name.split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    const company = workspaceName.trim() || 'Mon Workspace';
    const finalRole = userRole === 'Autre' ? (userRoleCustom.trim() || 'Autre') : userRole;

    goToStep('finalizing', 'forward');

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Try full upsert first
      const { error: fullError } = await supabase.from('settings').upsert({
        user_id: user.id,
        full_name: name,
        last_name: lastName,
        phone: '',
        email: email || user.email || '',
        company_name: company,
        timezone: 'Europe/Paris',
        niches: selectedNiches.length > 0 ? selectedNiches : ['Boulangerie', 'Coiffure'],
        cities: selectedCities.length > 0 ? selectedCities : ['Paris'],
        ai_tone: aiTone === 'casual' ? 'Calme & Conseil' : aiTone === 'professional' ? 'Direct & Closer' : 'Storytelling',
        ai_density: 'Standard',
        avatar_base64: profilePhoto || null,
        user_role: finalRole || null,
        bio: bio.trim() || null,
        email_signature: emailSignature.trim() || null,
      });

      // If full upsert fails (e.g. missing columns), fall back to minimal required fields
      if (fullError) {
        await supabase.from('settings').upsert({
          user_id: user.id,
          full_name: name,
          company_name: company,
        });
      }
    }

    const localSettings = {
      profile: {
        firstName,
        lastName,
        email: email || 'contact@uprising.studio',
        phone: '',
        language: locale,
        timezone: 'Europe/Paris',
      },
      prospecting: { niches: selectedNiches, cities: selectedCities, services: { website: true, seoAudit: true, acquisition: false }, language: 'both' },
      ai: { tone: aiTone },
      theme: 'light',
    };
    localStorage.setItem('minerva_settings', JSON.stringify(localSettings));

    setTimeout(() => {
      router.push('/welcome');
    }, 5000);
  };

  const isEmailValid = email.includes('@') && email.includes('.');
  const isOtpComplete = otpCode.every((d) => d !== '');
  // panelContent was used by the removed right panel — no longer needed

  return (
    <div className="min-h-screen w-screen bg-white text-[#26251e] font-sans selection:bg-[#10b981]/10 flex flex-col justify-between overflow-x-hidden relative">

      {/* ── CENTERED ONBOARDING LAYOUT ── */}
      <div className="flex-grow flex flex-col h-screen min-h-screen overflow-hidden">

        {/* ── FULL-WIDTH CENTERED COLUMN ── */}
        <div className="w-full max-w-xl mx-auto flex flex-col justify-between py-10 px-6 sm:px-8 bg-white relative z-10 overflow-y-auto h-full">

          {/* Top bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-[#26251e] cursor-pointer" onClick={() => router.push('/')}>
              <MinervaIcon size={18} className="text-[#10b981]" />
              <span className="text-xs">Minerva Reach</span>
            </div>
            <div className="flex items-center gap-3">
              {/* Language toggle */}
              <div className="flex items-center bg-[#f7f7f4] border border-[#e6e5e0] rounded-full overflow-hidden">
                <button
                  onClick={() => setLocale('fr')}
                  className={cn(
                    'px-3 py-1.5 text-[10px] font-bold transition-all',
                    locale === 'fr' ? 'bg-[#26251e] text-white' : 'text-[#807d72] hover:text-[#26251e]',
                  )}
                >
                  FR
                </button>
                <button
                  onClick={() => setLocale('en')}
                  className={cn(
                    'px-3 py-1.5 text-[10px] font-bold transition-all',
                    locale === 'en' ? 'bg-[#26251e] text-white' : 'text-[#807d72] hover:text-[#26251e]',
                  )}
                >
                  EN
                </button>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-semibold text-[#807d72] bg-[#f7f7f4] border border-[#e6e5e0] rounded-full px-4 py-1.5">
                <span className="hover:text-[#26251e] transition-colors cursor-pointer">Overview</span>
                <span className="hover:text-[#26251e] transition-colors cursor-pointer">Pricing</span>
                <span className="hover:text-[#26251e] transition-colors cursor-pointer">FAQ</span>
              </div>
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
                  className="w-full flex items-center justify-center gap-2 bg-white border border-[#e6e5e0] hover:bg-neutral-50 text-xs font-bold rounded-full py-2.5 text-[#26251e] transition-all shadow-none"
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
                    className="w-full text-xs font-semibold px-4 py-3 bg-white border border-[#e6e5e0] focus:border-[#10b981] rounded-full outline-none transition-colors shadow-none"
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
                      'w-full rounded-full py-3 text-xs font-bold transition-all shadow-none',
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
                      className="aspect-square text-center text-sm font-bold bg-white border border-[#e6e5e0] focus:border-[#10b981] rounded-xl outline-none transition-colors shadow-none text-[#26251e] placeholder:text-neutral-300"
                    />
                  ))}
                </div>

                <div className="text-left">
                  <span className="text-[10px] font-bold text-[#807d72] hover:text-[#26251e] uppercase tracking-wider cursor-pointer underline transition-colors">Resend code</span>
                </div>

                <div className="flex items-center gap-4 pt-4 border-t border-[#e6e5e0]/60">
                  <button
                    onClick={() => goToStep('login', 'backward')}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#e6e5e0] bg-white hover:bg-neutral-50 px-6 py-2.5 text-xs font-bold text-[#26251e] shadow-none transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => goToStep('selection', 'forward')}
                    disabled={!isOtpComplete}
                    className={cn(
                      'flex-1 rounded-full py-2.5 text-xs font-bold transition-all shadow-none text-center',
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
                  <button onClick={() => router.push('/')} className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#e6e5e0] bg-white hover:bg-neutral-50 px-6 py-2.5 text-xs font-bold text-[#26251e] shadow-none transition-colors">
                    Back
                  </button>
                  <button onClick={() => goToStep(isInvited ? 'pricing' : 'workspace', 'forward')} className="flex-1 rounded-full py-2.5 text-xs font-bold bg-[#26251e] hover:bg-[#1a1a19] text-white cursor-pointer shadow-none text-center">
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
                        className="w-full text-xs font-semibold px-4 py-2.5 bg-white border border-[#e6e5e0] focus:border-[#10b981] rounded-full outline-none shadow-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-[#807d72]">Workspace Name (Company)</label>
                      <input type="text" placeholder="e.g. Uprising Agency" value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)}
                        className="w-full text-xs font-semibold px-4 py-2.5 bg-white border border-[#e6e5e0] focus:border-[#10b981] rounded-full outline-none shadow-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-3">
                    <button
                      onClick={handleCreateWorkspace}
                      disabled={!fullName.trim() || !workspaceName.trim() || creatingWorkspace}
                      className={cn(
                        'rounded-full px-6 py-2 text-xs font-bold transition-all shadow-none flex items-center gap-1.5',
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
                    className="rounded-full border border-[#e6e5e0] bg-white hover:bg-neutral-50 px-5 py-2 text-xs font-bold text-[#cf2d56] transition-colors shadow-none"
                  >
                    Log out
                  </button>
                </div>

                <div className="flex items-center gap-4 pt-2 border-t border-[#e6e5e0]/60">
                  <button onClick={() => goToStep('selection', 'backward')} className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#e6e5e0] bg-white hover:bg-neutral-50 px-6 py-2.5 text-xs font-bold text-[#26251e] shadow-none transition-colors">
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
                     <span className="text-xs text-[#807d72] font-semibold">Save $60/user/year with annual billing</span>
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
                         <p className="text-xl font-light text-[#26251e] font-serif font-georgia">$0 / month</p>
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
                           {isAnnualPlan ? '$30' : '$35'}<span className="text-xs text-[#807d72] font-semibold"> / month</span>
                           {isAnnualPlan && <span className="text-xs text-[#807d72] line-through ml-2">$35</span>}
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
                  <button onClick={() => goToStep(isInvited ? 'selection' : 'workspace', 'backward')} className="inline-flex items-center justify-center rounded-full border border-[#e6e5e0] bg-white hover:bg-neutral-50 px-6 py-2.5 text-xs font-bold text-[#26251e] shadow-none transition-colors">
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
                  <button onClick={() => goToStep('profile', 'forward')} className="flex-1 rounded-full bg-neutral-100 hover:bg-neutral-200 text-xs font-bold text-[#555552] py-2.5 transition-colors text-center">
                    Don&apos;t share
                  </button>
                  <button onClick={() => goToStep('profile', 'forward')} className="flex-1 rounded-full bg-[#26251e] hover:bg-[#1a1a19] text-white text-xs font-bold py-2.5 transition-colors shadow-none text-center">
                    Share analytics
                  </button>
                </div>
              </div>
            )}

            {/* ─── PROFILE ─────────────────────────────────────────────── */}
            {step === 'profile' && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-3xl tracking-tight text-[#26251e] font-serif font-light font-georgia">Votre profil</h2>
                  <p className="text-xs text-[#807d72] font-semibold leading-relaxed">
                    Personnalisez votre identité dans Minerva. Seul le rôle est requis.
                  </p>
                </div>

                {/* ── Photo ── */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#807d72] flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-[#10b981]" /><span>Photo de profil <span className="text-[#c8c6be] normal-case font-semibold">(optionnel)</span></span>
                  </label>

                  {/* Tab switcher */}
                  <div className="flex items-center bg-[#f7f7f4] border border-[#e6e5e0] rounded-full overflow-hidden w-fit">
                    {(['file', 'webcam'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => { setPhotoTab(tab); if (tab !== 'webcam') stopWebcam(); }}
                        className={cn(
                          'px-4 py-1.5 text-[10px] font-bold transition-all flex items-center gap-1',
                          photoTab === tab ? 'bg-[#26251e] text-white' : 'text-[#807d72] hover:text-[#26251e]',
                        )}
                      >
                        {tab === 'file' ? <><Upload className="w-3 h-3" /><span>Fichier</span></> : <><Camera className="w-3 h-3" /><span>Webcam</span></>}
                      </button>
                    ))}
                  </div>

                  {/* Preview or capture area */}
                  <div className="flex items-center gap-4">
                    {/* Avatar preview */}
                    <div className="w-16 h-16 rounded-full bg-[#f7f7f4] border-2 border-[#e6e5e0] flex items-center justify-center overflow-hidden shrink-0">
                      {profilePhoto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={profilePhoto} alt="Aperçu" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-7 h-7 text-[#c8c6be]" />
                      )}
                    </div>

                    {photoTab === 'file' && (
                      <div className="flex-1 space-y-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#e6e5e0] bg-white hover:bg-neutral-50 px-4 py-2 text-xs font-bold text-[#26251e] transition-colors"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          {profilePhoto ? 'Changer la photo' : 'Choisir un fichier'}
                        </button>
                        {profilePhoto && (
                          <button onClick={() => setProfilePhoto(null)} className="block text-[10px] font-semibold text-rose-500 hover:underline">
                            Supprimer
                          </button>
                        )}
                      </div>
                    )}

                    {photoTab === 'webcam' && (
                      <div className="flex-1 space-y-2">
                        {!webcamActive && !profilePhoto && (
                          <button
                            onClick={startWebcam}
                            className="inline-flex items-center gap-1.5 rounded-full border border-[#e6e5e0] bg-white hover:bg-neutral-50 px-4 py-2 text-xs font-bold text-[#26251e] transition-colors"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            Activer la caméra
                          </button>
                        )}
                        {webcamActive && (
                          <div className="space-y-2">
                            <video ref={videoRef} className="w-24 h-24 rounded-full object-cover border-2 border-[#10b981]" muted playsInline />
                            <div className="flex gap-2">
                              <button onClick={capturePhoto} className="rounded-full bg-[#10b981] text-white text-[10px] font-bold px-3 py-1.5 hover:bg-[#059669] transition-colors">
                                Capturer
                              </button>
                              <button onClick={stopWebcam} className="rounded-full border border-[#e6e5e0] text-[10px] font-bold px-3 py-1.5 text-[#807d72] hover:bg-neutral-50 transition-colors">
                                Annuler
                              </button>
                            </div>
                          </div>
                        )}
                        {profilePhoto && !webcamActive && (
                          <button onClick={() => { setProfilePhoto(null); startWebcam(); }} className="inline-flex items-center gap-1.5 rounded-full border border-[#e6e5e0] bg-white hover:bg-neutral-50 px-4 py-2 text-xs font-bold text-[#26251e] transition-colors">
                            <Camera className="w-3.5 h-3.5" />
                            Reprendre
                          </button>
                        )}
                        {webcamError && <p className="text-[10px] text-rose-500 font-semibold">{webcamError}</p>}
                        <canvas ref={canvasRef} className="hidden" />
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Role ── */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#807d72] flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-[#10b981]" />
                    <span>Rôle <span className="text-[#f54e00] normal-case font-semibold">*</span></span>
                  </label>
                  <div className="relative">
                    <select
                      value={userRole}
                      onChange={(e) => setUserRole(e.target.value)}
                      className="w-full appearance-none text-xs font-semibold px-4 py-2.5 bg-white border border-[#e6e5e0] focus:border-[#10b981] rounded-full outline-none pr-8 text-[#26251e]"
                    >
                      <option value="">Sélectionnez votre rôle…</option>
                      {PRESET_ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                      <option value="Autre">Autre…</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#807d72] pointer-events-none" />
                  </div>
                  {userRole === 'Autre' && (
                    <input
                      type="text"
                      placeholder="Précisez votre rôle…"
                      value={userRoleCustom}
                      onChange={(e) => setUserRoleCustom(e.target.value)}
                      className="w-full text-xs font-semibold px-4 py-2.5 bg-white border border-[#e6e5e0] focus:border-[#10b981] rounded-full outline-none"
                    />
                  )}
                </div>

                {/* ── Bio ── */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#807d72]">
                    Bio <span className="text-[#c8c6be] normal-case font-semibold">(optionnel)</span>
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="En 2–3 lignes, décrivez votre parcours ou spécialité…"
                    rows={3}
                    className="w-full text-xs font-semibold px-4 py-3 bg-white border border-[#e6e5e0] focus:border-[#10b981] rounded-2xl outline-none resize-none"
                  />
                </div>

                {/* ── Email Signature ── */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#807d72]">
                    Signature email <span className="text-[#c8c6be] normal-case font-semibold">(optionnel · injectée dans les brouillons IA)</span>
                  </label>
                  <textarea
                    value={emailSignature}
                    onChange={(e) => setEmailSignature(e.target.value)}
                    placeholder={`${fullName || 'Prénom Nom'}\nFondateur, Uprising Agency\n+1 (514) 000-0000`}
                    rows={3}
                    className="w-full text-xs font-semibold px-4 py-3 bg-white border border-[#e6e5e0] focus:border-[#10b981] rounded-2xl outline-none resize-none font-mono"
                  />
                </div>

                {/* ── Actions ── */}
                <div className="flex items-center gap-3 pt-4 border-t border-[#e6e5e0]/60">
                  <button
                    onClick={() => goToStep('analytics', 'backward')}
                    className="inline-flex items-center justify-center rounded-full border border-[#e6e5e0] bg-white hover:bg-neutral-50 px-6 py-2.5 text-xs font-bold text-[#26251e] shadow-none transition-colors"
                  >
                    Retour
                  </button>
                  <button
                    onClick={handleFinalizeOnboarding}
                    disabled={!userRole || (userRole === 'Autre' && !userRoleCustom.trim())}
                    className={cn(
                      'flex-1 rounded-full py-2.5 text-xs font-bold transition-all shadow-none text-center',
                      (userRole && (userRole !== 'Autre' || userRoleCustom.trim()))
                        ? 'bg-[#26251e] hover:bg-[#1a1a19] text-white cursor-pointer'
                        : 'bg-neutral-100 text-[#807d72] cursor-not-allowed border border-[#e6e5e0]',
                    )}
                  >
                    Finaliser
                  </button>
                </div>
                <div className="text-center">
                  <button
                    onClick={handleFinalizeOnboarding}
                    className="text-[10px] font-semibold text-[#807d72] hover:text-[#26251e] underline transition-colors"
                  >
                    Passer cette étape
                  </button>
                </div>
              </div>
            )}

            {/* ─── FINALIZING ─────────────────────────────────────────── */}
            {step === 'finalizing' && (
              <div className="space-y-8 animate-in fade-in duration-500 text-left">
                <div className="space-y-3">
                  <h2 className="text-3xl tracking-tight text-[#26251e] font-serif font-light font-georgia">
                    Configuration en cours
                  </h2>
                  <p className="text-xs text-[#807d72] font-semibold leading-relaxed">
                    Veuillez patienter pendant que nous initialisons votre environnement de prospection.
                  </p>
                </div>

                {/* Checklist items with progressive reveal */}
                <div className="space-y-4">
                  {[
                    { text: 'Création du profil utilisateur', delay: 0 },
                    { text: 'Configuration de l\'IA et des filtres cibles', delay: 1200 },
                    { text: 'Initialisation de l\'espace de travail SQLite local', delay: 2400 },
                    { text: 'Synchronisation globale avec Supabase', delay: 3600 },
                  ].map((item, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center gap-3 text-xs font-semibold text-[#26251e] animate-in fade-in slide-in-from-bottom-2 duration-500"
                      style={{
                        animationDelay: `${item.delay}ms`,
                        animationFillMode: 'both'
                      }}
                    >
                      <FinalizingCheck index={idx} delay={item.delay} />
                      <span className="text-[#555552]">{item.text}</span>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div className="flex flex-col gap-2 pt-4 border-t border-[#e6e5e0]/60">
                  <div className="w-full bg-[#e6e5e0]/50 h-[3px] rounded-full overflow-hidden">
                    <div 
                      className="bg-[#10b981] h-full rounded-full"
                      style={{
                        animation: 'finalProgress 4.5s linear forwards'
                      }}
                    />
                  </div>
                </div>

                <style jsx global>{`
                  @keyframes finalProgress {
                    0% { width: 0%; }
                    100% { width: 100%; }
                  }
                `}</style>
              </div>
            )}
          </div>

          {/* Bottom brand */}
          <div className="flex items-center gap-1.5 justify-start text-[10px] text-[#807d72] font-semibold mt-6">
            <MinervaIcon size={14} className="text-[#10b981]" />
            <span>Minerva OS Reach Lite</span>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingPageContent />
    </Suspense>
  );
}
