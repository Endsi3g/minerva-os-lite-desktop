'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import {
  Map,
  Bot,
  Compass,
  Briefcase,
  BarChart3,
  HelpCircle,
  PlayCircle,
  Loader2,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { MinervaIcon } from '@/components/icons'
import {
  Onboarding,
  ChoiceGroup,
  FeatureCarousel,
  useOnboarding,
} from '@/components/ui/onboarding'
import ShiftCard from '@/components/ui/shift-card'

// ── Feature slides data ─────────────────────────────────────────────────────
const FEATURES = [
  {
    Icon: Map,
    title: 'Carte intelligente',
    description:
      'Visualisez vos prospects sur une carte interactive avec clustering, heatmap et planification de tournées',
  },
  {
    Icon: Bot,
    title: 'Agent IA Minerva',
    description:
      'Votre copilote IA qui génère des emails, analyse votre pipeline et vous suggère les meilleures actions',
  },
  {
    Icon: Compass,
    title: 'Prospection terrain',
    description:
      'Trouvez de nouveaux prospects en temps réel par niche et ville directement sur la carte',
  },
]

// ── Step 1: Feature Carousel (synced to Onboarding stepValue) ──────────────
function Step1Content() {
  const { stepValue, setStepValue } = useOnboarding()

  return (
    <div className="space-y-5">
      <Onboarding.Header
        title="Bienvenue sur Minerva"
        description="Découvrez les outils qui vont transformer votre prospection"
      />

      <FeatureCarousel
        value={stepValue}
        onValueChange={setStepValue}
        className="flex flex-col gap-2.5"
      >
        {FEATURES.map(({ Icon, title, description }, index) => {
          const isActive = stepValue === index
          return (
            <FeatureCarousel.Item
              key={index}
              index={index}
              className={cn(
                'w-full text-left px-4 py-3 rounded-xl border transition-all duration-200',
                isActive
                  ? 'border-[#059669] bg-[#059669]/5 shadow-sm'
                  : 'border-[#e5e5e0] bg-[#f7f7f4] opacity-60 hover:opacity-80'
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg shrink-0 transition-colors',
                    isActive ? 'bg-[#059669]/15' : 'bg-[#e5e5e0]'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-4 w-4 transition-colors',
                      isActive ? 'text-[#059669]' : 'text-[#7a7a76]'
                    )}
                  />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <p
                    className={cn(
                      'text-sm font-bold leading-tight',
                      isActive ? 'text-[#26251e]' : 'text-[#7a7a76]'
                    )}
                  >
                    {title}
                  </p>
                  {isActive && (
                    <p className="text-xs text-[#7a7a76] leading-relaxed pt-0.5">
                      {description}
                    </p>
                  )}
                </div>
              </div>
            </FeatureCarousel.Item>
          )
        })}
      </FeatureCarousel>

      {/* Slide dot indicators */}
      <div className="flex items-center justify-center gap-2 pt-1">
        {FEATURES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setStepValue(i)}
            aria-label={`Slide ${i + 1}`}
            className={cn(
              'rounded-full transition-all duration-200',
              stepValue === i
                ? 'w-5 h-1.5 bg-[#059669]'
                : 'w-1.5 h-1.5 bg-[#e5e5e0] hover:bg-[#7a7a76]'
            )}
          />
        ))}
      </div>
    </div>
  )
}

// ── Step 2: ChoiceGroups — Role + Sector ────────────────────────────────────
const ROLES = [
  { value: 'commercial', label: 'Commercial' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'agence', label: 'Agence' },
  { value: 'manager', label: 'Manager' },
]

const SECTORS = [
  { value: 'tech', label: 'Tech' },
  { value: 'services-b2b', label: 'Services B2B' },
  { value: 'commerce-local', label: 'Commerce local' },
  { value: 'immobilier', label: 'Immobilier' },
]

interface Step2Props {
  role: string
  setRole: (v: string) => void
  sector: string
  setSector: (v: string) => void
}

function Step2Content({ role, setRole, sector, setSector }: Step2Props) {
  return (
    <div className="space-y-6">
      <Onboarding.Header>
        <h2 className="text-2xl font-normal font-serif text-[#26251e]" data-slot="onboarding-title">
          Parlez-nous de vous
        </h2>
        <p className="text-sm text-[#7a7a76] mt-1" data-slot="onboarding-description">
          Minerva personnalise votre expérience selon votre profil
        </p>
      </Onboarding.Header>

      {/* Role */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] flex items-center gap-1.5">
          <Briefcase className="w-3.5 h-3.5 text-[#059669]" />
          Votre rôle
        </p>
        <ChoiceGroup
          name="role"
          value={role}
          onValueChange={setRole}
          orientation="grid"
          className="grid grid-cols-2 gap-2"
        >
          {ROLES.map(({ value, label }) => (
            <ChoiceGroup.Item
              key={value}
              value={value}
              className={cn(
                'flex items-center justify-center py-2.5 px-3 rounded-xl border text-sm font-semibold cursor-pointer transition-all select-none',
                role === value
                  ? 'border-[#059669] bg-[#059669]/10 text-[#059669]'
                  : 'border-[#e5e5e0] bg-white text-[#26251e] hover:bg-[#f7f7f4] hover:border-[#7a7a76]'
              )}
            >
              {label}
            </ChoiceGroup.Item>
          ))}
        </ChoiceGroup>
      </div>

      {/* Sector */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] flex items-center gap-1.5">
          <BarChart3 className="w-3.5 h-3.5 text-[#059669]" />
          Votre secteur
        </p>
        <ChoiceGroup
          name="sector"
          value={sector}
          onValueChange={setSector}
          orientation="grid"
          className="grid grid-cols-2 gap-2"
        >
          {SECTORS.map(({ value, label }) => (
            <ChoiceGroup.Item
              key={value}
              value={value}
              className={cn(
                'flex items-center justify-center py-2.5 px-3 rounded-xl border text-sm font-semibold cursor-pointer transition-all select-none',
                sector === value
                  ? 'border-[#059669] bg-[#059669]/10 text-[#059669]'
                  : 'border-[#e5e5e0] bg-white text-[#26251e] hover:bg-[#f7f7f4] hover:border-[#7a7a76]'
              )}
            >
              {label}
            </ChoiceGroup.Item>
          ))}
        </ChoiceGroup>
      </div>
    </div>
  )
}

// ── Step 3: Profile form ────────────────────────────────────────────────────
interface Step3Props {
  fullName: string
  setFullName: (v: string) => void
  companyName: string
  setCompanyName: (v: string) => void
  niche: string
  setNiche: (v: string) => void
  city: string
  setCity: (v: string) => void
  isSaving: boolean
}

function Step3Content({
  fullName,
  setFullName,
  companyName,
  setCompanyName,
  niche,
  setNiche,
  city,
  setCity,
  isSaving,
}: Step3Props) {
  return (
    <div className="space-y-5">
      <Onboarding.Header>
        <h2 className="text-2xl font-normal font-serif text-[#26251e]" data-slot="onboarding-title">
          Votre profil
        </h2>
        <p className="text-sm text-[#7a7a76] mt-1" data-slot="onboarding-description">
          Ces informations seront utilisées pour personnaliser Minerva
        </p>
      </Onboarding.Header>

      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
            Prénom &amp; Nom <span className="text-[#059669]">*</span>
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="ex. Sophie Martin"
            disabled={isSaving}
            className="w-full text-sm font-medium px-4 py-2.5 bg-white border border-[#e5e5e0] focus:border-[#059669] rounded-xl outline-none transition-colors placeholder:text-[#c8c6be] disabled:opacity-50"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
            Entreprise <span className="text-[#059669]">*</span>
          </label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="ex. Agence Vertigo"
            disabled={isSaving}
            className="w-full text-sm font-medium px-4 py-2.5 bg-white border border-[#e5e5e0] focus:border-[#059669] rounded-xl outline-none transition-colors placeholder:text-[#c8c6be] disabled:opacity-50"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
            Ce que vous vendez
          </label>
          <input
            type="text"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            placeholder="ex. Sites web pour PME, SEO, audit digital…"
            disabled={isSaving}
            className="w-full text-sm font-medium px-4 py-2.5 bg-white border border-[#e5e5e0] focus:border-[#059669] rounded-xl outline-none transition-colors placeholder:text-[#c8c6be] disabled:opacity-50"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
            Ville principale
          </label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="ex. Montréal, Paris, Lyon…"
            disabled={isSaving}
            className="w-full text-sm font-medium px-4 py-2.5 bg-white border border-[#e5e5e0] focus:border-[#059669] rounded-xl outline-none transition-colors placeholder:text-[#c8c6be] disabled:opacity-50"
          />
        </div>
      </div>
    </div>
  )
}

// ── Smart navigation (replaces Onboarding.Navigation for fine-grained control) ─
interface SmartNavigationProps {
  step2CanProceed: boolean
  step3CanComplete: boolean
  isSaving: boolean
}

function SmartNavigation({
  step2CanProceed,
  step3CanComplete,
  isSaving,
}: SmartNavigationProps) {
  const {
    currentStep,
    totalSteps,
    canGoBack,
    handleBack,
    handleNext,
    handleComplete,
  } = useOnboarding()

  const isLastStep = currentStep === totalSteps

  const isNextDisabled = currentStep === 2 ? !step2CanProceed : false
  const isCompleteDisabled = !step3CanComplete || isSaving

  return (
    <div className="flex gap-3 pt-2">
      <button
        type="button"
        onClick={handleBack}
        disabled={!canGoBack}
        className={cn(
          'flex-1 rounded-xl py-2.5 text-sm font-semibold border transition-all',
          canGoBack
            ? 'border-[#e5e5e0] bg-white text-[#26251e] hover:bg-[#f7f7f4]'
            : 'border-[#e5e5e0] bg-[#f7f7f4] text-[#c8c6be] cursor-not-allowed'
        )}
      >
        Retour
      </button>

      {isLastStep ? (
        <button
          type="button"
          onClick={handleComplete}
          disabled={isCompleteDisabled}
          className={cn(
            'flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all flex items-center justify-center gap-2',
            !isCompleteDisabled
              ? 'bg-[#059669] text-white hover:bg-[#047857]'
              : 'bg-[#e5e5e0] text-[#7a7a76] cursor-not-allowed'
          )}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Enregistrement…
            </>
          ) : (
            'Commencer'
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleNext}
          disabled={isNextDisabled}
          className={cn(
            'flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all',
            !isNextDisabled
              ? 'bg-[#26251e] text-white hover:bg-[#1a1a19]'
              : 'bg-[#e5e5e0] text-[#7a7a76] cursor-not-allowed'
          )}
        >
          Suivant
        </button>
      )}
    </div>
  )
}

// ── Help ShiftCard (fixed bottom-right) ────────────────────────────────────
function HelpShiftCard() {
  // Hidden on small screens — on mobile this floating card was wide/tall enough
  // to sit on top of the "Suivant"/"Commencer" button with no way to reach it,
  // which blocked the onboarding flow entirely. Also dismissible on desktop.
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 hidden sm:block">
      <ShiftCard
        className="relative"
        topContent={
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#059669]/15">
                <HelpCircle className="h-3.5 w-3.5 text-[#059669]" />
              </div>
              <span className="text-xs font-bold text-[#26251e]">Aide</span>
            </div>
            <button
              type="button"
              aria-label="Fermer"
              onClick={e => {
                e.stopPropagation()
                setDismissed(true)
              }}
              className="flex h-6 w-6 items-center justify-center rounded-md text-[#7a7a76] hover:bg-[#f7f7f4] hover:text-[#26251e] transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        }
        middleContent={
          <div className="flex flex-col items-center justify-center gap-3 text-center px-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#059669]/10">
              <MinervaIcon size={28} className="text-[#059669]" />
            </div>
            <p className="text-xs font-semibold text-[#7a7a76] leading-relaxed max-w-[180px]">
              Besoin d&apos;aide pour configurer Minerva ?
            </p>
          </div>
        }
        bottomContent={
          <div className="px-3 pb-2 space-y-2">
            <button
              type="button"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#059669] text-white text-xs font-bold py-2.5 hover:bg-[#047857] transition-colors"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              Voir la démo
            </button>
            <p className="text-[10px] text-center text-[#7a7a76] font-medium">
              Tutoriel vidéo · 2 min
            </p>
          </div>
        }
      />
    </div>
  )
}

// ── Main page content ───────────────────────────────────────────────────────
function OnboardingPageContent() {
  const router = useRouter()

  // Step 2 state
  const [role, setRole] = useState('')
  const [sector, setSector] = useState('')

  // Step 3 state
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [niche, setNiche] = useState('')
  const [city, setCity] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Set page title + pre-populate from session
  useEffect(() => {
    document.title = 'Configuration — Minerva'
    const fetchUser = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      if (user.user_metadata?.full_name) {
        setFullName(user.user_metadata.full_name as string)
      }
    }
    fetchUser()
  }, [router])

  // Supabase save + redirect on complete (preserves existing logic)
  const handleComplete = async () => {
    const name = fullName.trim()
    const company = companyName.trim()
    if (!name || !company) return

    setIsSaving(true)

    // Persist role + sector to localStorage
    if (role) localStorage.setItem('minerva_user_role', role)
    if (sector) localStorage.setItem('minerva_user_sector', sector)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const { error } = await supabase.from('settings').upsert({
        user_id: user.id,
        full_name: name,
        company_name: company,
        niches: niche.trim() ? [niche.trim()] : ['Général'],
        cities: city.trim() ? [city.trim()] : ['Paris'],
        timezone: 'Europe/Paris',
      })

      // Fallback to minimal required fields if columns missing
      if (error) {
        await supabase.from('settings').upsert({
          user_id: user.id,
          full_name: name,
          company_name: company,
        })
      }
    }

    router.push('/today')
  }

  const step2CanProceed = !!role && !!sector
  const step3CanComplete = !!fullName.trim() && !!companyName.trim()

  return (
    <div className="min-h-screen bg-[#f7f7f4] flex flex-col items-center justify-center px-4 py-12 relative">

      {/* Logo */}
      <div className="mb-8 flex items-center gap-2">
        <MinervaIcon size={22} className="text-[#059669]" />
        <span className="text-base font-bold tracking-tight text-[#26251e]">
          Minerva
        </span>
      </div>

      {/* Onboarding card */}
      <Onboarding
        totalSteps={3}
        maxStepValue={2}
        onComplete={handleComplete}
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-[#e5e5e0] p-8 space-y-6"
      >
        {/* Step progress pills */}
        <Onboarding.StepIndicator
          variant="pills"
          className="w-full"
          dotClassName="h-1 flex-1 max-w-none rounded-full data-[state=active]:bg-[#059669] data-[state=completed]:bg-[#059669]/40 data-[state=inactive]:bg-[#e5e5e0]"
        />

        {/* Step 1 — Feature Carousel */}
        <Onboarding.Step step={1}>
          <Step1Content />
        </Onboarding.Step>

        {/* Step 2 — Role + Sector */}
        <Onboarding.Step step={2}>
          <Step2Content
            role={role}
            setRole={setRole}
            sector={sector}
            setSector={setSector}
          />
        </Onboarding.Step>

        {/* Step 3 — Profile form */}
        <Onboarding.Step step={3}>
          <Step3Content
            fullName={fullName}
            setFullName={setFullName}
            companyName={companyName}
            setCompanyName={setCompanyName}
            niche={niche}
            setNiche={setNiche}
            city={city}
            setCity={setCity}
            isSaving={isSaving}
          />
        </Onboarding.Step>

        {/* Navigation */}
        <SmartNavigation
          step2CanProceed={step2CanProceed}
          step3CanComplete={step3CanComplete}
          isSaving={isSaving}
        />
      </Onboarding>

      {/* Footer */}
      <p className="mt-6 text-[10px] text-[#7a7a76] font-medium">
        Minerva OS Reach Lite · Données sécurisées
      </p>

      {/* Help widget */}
      <HelpShiftCard />
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingPageContent />
    </Suspense>
  )
}
