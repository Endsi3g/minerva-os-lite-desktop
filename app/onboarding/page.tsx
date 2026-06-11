'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, 
  MapPin, 
  Brain, 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Plus, 
  X 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';


// Timezones list
const TIMEZONES = [
  { value: "Europe/Paris", label: "Europe/Paris (France)" },
  { value: "Europe/London", label: "Europe/London (Royaume-Uni)" },
  { value: "America/New_York", label: "America/New_York (Est USA)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (Ouest USA)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (Japon)" }
];

// Presets suggestions
const PRESET_NICHES = [
  "Boulangerie",
  "Coiffure",
  "Restaurant",
  "Garage",
  "Fleuriste",
  "Plombier"
];

const PRESET_CITIES = [
  "Paris",
  "Lyon",
  "Marseille",
  "Bordeaux",
  "Lille"
];

interface ProfileData {
  fullName: string;
  email: string;
  phone: string;
  language: string;
  timezone: string;
}

interface ProspectingData {
  niches: string[];
  cities: string[];
  services: {
    website: boolean;
    seoAudit: boolean;
    acquisition: boolean;
  };
  language: string;
}

interface AiData {
  tone: 'casual' | 'professional' | 'storytelling';
  customization: 'low' | 'medium' | 'high';
  autoInsights: boolean;
  autoFollowUps: boolean;
}

interface NotificationsData {
  reminderOverdue: boolean;
  dailyDigest: boolean;
  weeklyReport: boolean;
  digestTime: string;
}

interface AppearanceData {
  density: 'comfortable' | 'compact';
  theme: 'system' | 'light' | 'dark';
}

interface AppSettings {
  profile: ProfileData;
  prospecting: ProspectingData;
  ai: AiData;
  notifications: NotificationsData;
  appearance: AppearanceData;
}

const DEFAULT_SETTINGS: AppSettings = {
  profile: {
    fullName: "",
    email: "contact@uprising.studio",
    phone: "+33 6 12 34 56 78",
    language: "fr",
    timezone: "Europe/Paris"
  },
  prospecting: {
    niches: [],
    cities: [],
    services: {
      website: true,
      seoAudit: true,
      acquisition: false
    },
    language: "both"
  },
  ai: {
    tone: "casual",
    customization: "medium",
    autoInsights: true,
    autoFollowUps: false
  },
  notifications: {
    reminderOverdue: true,
    dailyDigest: true,
    weeklyReport: false,
    digestTime: "20:00"
  },
  appearance: {
    density: "comfortable",
    theme: "dark"
  }
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Custom text input states for Step 2
  const [customNiche, setCustomNiche] = useState('');
  const [customCity, setCustomCity] = useState('');

  // Step 1: Form field updater
  const updateProfile = (fields: Partial<ProfileData>) => {
    setSettings((prev) => ({
      ...prev,
      profile: { ...prev.profile, ...fields }
    }));
  };

  // Step 2: Niches and Cities tag handlers
  const addNiche = (niche: string) => {
    const trimmed = niche.trim();
    if (!trimmed) return;
    if (settings.prospecting.niches.includes(trimmed)) return;
    setSettings((prev) => ({
      ...prev,
      prospecting: {
        ...prev.prospecting,
        niches: [...prev.prospecting.niches, trimmed]
      }
    }));
  };

  const removeNiche = (niche: string) => {
    setSettings((prev) => ({
      ...prev,
      prospecting: {
        ...prev.prospecting,
        niches: prev.prospecting.niches.filter((n) => n !== niche)
      }
    }));
  };

  const addCity = (city: string) => {
    const trimmed = city.trim();
    if (!trimmed) return;
    if (settings.prospecting.cities.includes(trimmed)) return;
    setSettings((prev) => ({
      ...prev,
      prospecting: {
        ...prev.prospecting,
        cities: [...prev.prospecting.cities, trimmed]
      }
    }));
  };

  const removeCity = (city: string) => {
    setSettings((prev) => ({
      ...prev,
      prospecting: {
        ...prev.prospecting,
        cities: prev.prospecting.cities.filter((c) => c !== city)
      }
    }));
  };

  // Step 3: AI preference updater
  const updateAi = (fields: Partial<AiData>) => {
    setSettings((prev) => ({
      ...prev,
      ai: { ...prev.ai, ...fields }
    }));
  };

  const handleNext = () => {
    if (step < 3) {
      setStep((prev) => (prev + 1) as 1 | 2 | 3);
    }
  };

  const handlePrev = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as 1 | 2 | 3);
    }
  };

  const handleFinalize = async () => {
    // Fill full email name fallback if profile name is blank
    const name = settings.profile.fullName.trim() || "Utilisateur Minerva";
    const finalSettings = {
      ...settings,
      profile: {
        ...settings.profile,
        fullName: name
      }
    };

    // Save to Supabase DB settings table
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      await supabase.from('settings').upsert({
        user_id: user.id,
        full_name: name,
        company_name: settings.profile.email === "contact@uprising.studio" ? "Uprising Studio" : settings.profile.email,
        timezone: settings.profile.timezone,
        niches: settings.prospecting.niches,
        cities: settings.prospecting.cities,
        ai_tone: settings.ai.tone === 'casual' ? 'Calme & Conseil' : settings.ai.tone === 'professional' ? 'Direct & Closer' : 'Storytelling',
        ai_density: settings.ai.customization === 'low' ? 'Standard' : settings.ai.customization === 'medium' ? 'Personnalisé' : 'Profond',
      });
    }

    localStorage.setItem('minerva_reach_settings', JSON.stringify(finalSettings));
    localStorage.setItem('minerva_welcome_seen', 'true');
    router.refresh();
    router.push('/today');
  };

  return (
    <div className="relative flex min-h-screen w-screen flex-col items-center justify-center overflow-x-hidden bg-background text-foreground font-sans">
      
      {/* Background soft highlights */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] left-[30%] h-[300px] w-[300px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[20%] right-[30%] h-[300px] w-[300px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-xl flex-col items-stretch px-6 py-12">
        
        {/* Step Indicator Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Onboarding</span>
            <span className="text-xs text-zinc-600">|</span>
            <span className="text-xs text-zinc-400">Etape {step} sur 3</span>
          </div>

          {/* Miniature step bars */}
          <div className="flex gap-1.5">
            <div className={cn("h-1 w-8 rounded-full transition-all duration-300", step >= 1 ? "bg-primary" : "bg-muted")} />
            <div className={cn("h-1 w-8 rounded-full transition-all duration-300", step >= 2 ? "bg-primary" : "bg-muted")} />
            <div className={cn("h-1 w-8 rounded-full transition-all duration-300", step >= 3 ? "bg-primary" : "bg-muted")} />
          </div>
        </div>

        {/* Dynamic Step Panels */}
        
        {/* STEP 1: PROFILE SETUP */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
                <User className="h-5 w-5 text-primary" /> Identité & Profil
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Renseigne tes informations personnelles pour personnaliser tes correspondances commerciales et ton espace.
              </p>
            </div>

            <Card className="border border-border bg-card shadow-none">
              <CardContent className="p-6 space-y-4">
                
                <div className="grid gap-1.5">
                  <label htmlFor="fullName" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nom Complet / Commercial</label>
                  <input
                    id="fullName"
                    type="text"
                    placeholder="Ex: Jean Dupont"
                    value={settings.profile.fullName}
                    onChange={(e) => updateProfile({ fullName: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary"
                  />
                </div>

                <div className="grid gap-1.5">
                  <label htmlFor="companyName" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nom de l&apos;entreprise</label>
                  <input
                    id="companyName"
                    type="text"
                    placeholder="Ex: Dupont Consulting"
                    value={settings.profile.email === "contact@uprising.studio" ? "Uprising Studio" : settings.profile.email}
                    onChange={(e) => updateProfile({ email: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary"
                  />
                </div>

                <div className="grid gap-1.5">
                  <label htmlFor="timezone" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Fuseau Horaire (Timezone)</label>
                  <Select 
                    value={settings.profile.timezone}
                    onValueChange={(val) => updateProfile({ timezone: val })}
                  >
                    <SelectTrigger id="timezone" className="h-10 text-xs border border-border bg-card text-foreground">
                      <SelectValue placeholder="Europe/Paris" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-foreground">
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value} className="text-xs focus:bg-muted focus:text-foreground">
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

              </CardContent>
            </Card>
          </div>
        )}

        {/* STEP 2: PROSPECTING TARGETS */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
                <MapPin className="h-5 w-5 text-primary" /> Cibles & Secteurs
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Configure tes cibles prioritaires. Ces secteurs et villes guideront les propositions de ton copilote IA.
              </p>
            </div>

            <Card className="border border-border bg-card shadow-none space-y-6 p-6">
              
              {/* Niches Section */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Secteurs d&apos;activité (Niches)</label>
                
                {/* Suggestions badges */}
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_NICHES.map((n) => {
                    const isAdded = settings.prospecting.niches.includes(n);
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => isAdded ? removeNiche(n) : addNiche(n)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors cursor-pointer",
                          isAdded 
                            ? "bg-primary/10 text-primary border border-primary/20" 
                            : "bg-muted text-muted-foreground border border-border hover:bg-muted/80"
                        )}
                      >
                        {n}
                        {isAdded ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                      </button>
                    );
                  })}
                </div>

                {/* Custom tag input */}
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Autre secteur... (ex: Electricien)"
                    value={customNiche}
                    onChange={(e) => setCustomNiche(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addNiche(customNiche);
                        setCustomNiche('');
                      }
                    }}
                    className="flex h-9 flex-1 rounded-md border border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary"
                  />
                  <Button 
                    type="button" 
                    size="icon" 
                    onClick={() => {
                      addNiche(customNiche);
                      setCustomNiche('');
                    }}
                    className="h-9 w-9 bg-card border border-border hover:bg-muted text-foreground shadow-none"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Active Niches Badges */}
                {settings.prospecting.niches.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border">
                    {settings.prospecting.niches.map((n) => (
                      <span key={n} className="inline-flex items-center gap-1 rounded bg-muted border border-border px-2 py-0.5 text-[10px] font-semibold text-foreground">
                        {n}
                        <button type="button" onClick={() => removeNiche(n)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Cities Section */}
              <div className="space-y-3 pt-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Villes cibles</label>
                
                {/* Suggestions badges */}
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_CITIES.map((c) => {
                    const isAdded = settings.prospecting.cities.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => isAdded ? removeCity(c) : addCity(c)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors cursor-pointer",
                          isAdded 
                            ? "bg-primary/10 text-primary border border-primary/20" 
                            : "bg-muted text-muted-foreground border border-border hover:bg-muted/80"
                        )}
                      >
                        {c}
                        {isAdded ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                      </button>
                    );
                  })}
                </div>

                {/* Custom tag input */}
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Autre ville... (ex: Strasbourg)"
                    value={customCity}
                    onChange={(e) => setCustomCity(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCity(customCity);
                        setCustomCity('');
                      }
                    }}
                    className="flex h-9 flex-1 rounded-md border border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary"
                  />
                  <Button 
                    type="button" 
                    size="icon" 
                    onClick={() => {
                      addCity(customCity);
                      setCustomCity('');
                    }}
                    className="h-9 w-9 bg-card border border-border hover:bg-muted text-foreground shadow-none"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Active Cities Badges */}
                {settings.prospecting.cities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border">
                    {settings.prospecting.cities.map((c) => (
                      <span key={c} className="inline-flex items-center gap-1 rounded bg-muted border border-border px-2 py-0.5 text-[10px] font-semibold text-foreground">
                        {c}
                        <button type="button" onClick={() => removeCity(c)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

            </Card>
          </div>
        )}

        {/* STEP 3: AI CONFIGURATION */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
                <Brain className="h-5 w-5 text-primary" /> Configuration du Copilote IA
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ajuste les réglages de ton assistant IA. Cela modifiera le style de rédaction des messages de vente de tes playbooks.
              </p>
            </div>

            <Card className="border border-border bg-card shadow-none p-6 space-y-5">
              
              {/* AI Tone Choice */}
              <div className="space-y-2.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ton de rédaction favori</label>
                <div className="grid grid-cols-1 gap-2.5">
                  {[
                    { id: 'casual' as const, name: "Calme & Conseil", desc: "Rédaction de conseils techniques bienveillants et constructifs." },
                    { id: 'professional' as const, name: "Direct & Closer", desc: "Rédaction centrée sur l'accroche rapide et la conversion." },
                    { id: 'storytelling' as const, name: "Storytelling", desc: "Rédaction basée sur les cas clients et la preuve sociale." }
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => updateAi({ tone: t.id })}
                      className={cn(
                        "flex flex-col gap-1 rounded-lg border p-4 text-left transition-all cursor-pointer",
                        settings.ai.tone === t.id
                          ? "border-primary bg-primary/5 shadow-none"
                          : "border-border/60 bg-card hover:bg-muted"
                      )}
                    >
                      <span className="text-xs font-bold text-foreground">{t.name}</span>
                      <span className="text-[10px] text-muted-foreground leading-relaxed">{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Context depth */}
              <div className="space-y-2.5 pt-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Profondeur de personnalisation</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'low' as const, name: "Standard", desc: "Rappels simples" },
                    { id: 'medium' as const, name: "Moyen", desc: "Intègre le contact" },
                    { id: 'high' as const, name: "Profond", desc: "Intègre les notes" }
                  ].map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => updateAi({ customization: d.id })}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1 rounded-lg border p-3 text-center transition-all cursor-pointer",
                        settings.ai.customization === d.id
                          ? "border-primary bg-primary/5"
                          : "border-border/60 bg-card hover:bg-muted"
                      )}
                    >
                      <span className="text-xs font-bold text-foreground">{d.name}</span>
                      <span className="text-[9px] text-muted-foreground leading-tight">{d.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

            </Card>
          </div>
        )}

        {/* Wizard Navigation Footer */}
        <div className="mt-8 flex items-center justify-between gap-4 border-t border-border pt-6">
          {/* Back button */}
          {step > 1 ? (
            <Button 
              type="button"
              onClick={handlePrev}
              className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-card text-foreground hover:bg-muted shadow-none cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Retour
            </Button>
          ) : (
            <div />
          )}

          {/* Next / Finalize button */}
          {step < 3 ? (
            <Button 
              type="button"
              onClick={handleNext}
              className="group inline-flex items-center gap-1.5 rounded-full bg-primary hover:bg-primary/95 text-primary-foreground shadow-none border-0 cursor-pointer text-xs font-bold uppercase tracking-wider"
            >
              Continuer
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          ) : (
            <Button 
              type="button"
              onClick={handleFinalize}
              className="group inline-flex items-center gap-1.5 rounded-full bg-primary hover:bg-primary/95 text-primary-foreground shadow-none border-0 cursor-pointer text-xs font-bold uppercase tracking-wider"
            >
              Confirmer et finaliser
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          )}
        </div>

      </div>
    </div>
  );
}
