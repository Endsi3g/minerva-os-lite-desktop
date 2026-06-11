'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, Users, Kanban, Brain, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function WelcomePage() {
  const router = useRouter();

  const handleStart = () => {
    router.push('/onboarding');
  };

  const pillars = [
    {
      title: "Today",
      icon: LayoutDashboard,
      description: "Organise ta journée commerciale, suis tes relances prioritaires et consulte tes rappels chauds en un coup d'œil.",
      color: "bg-[var(--timeline-read)]/15 text-[var(--timeline-read)] border-[var(--timeline-read)]/30"
    },
    {
      title: "Leads",
      icon: Users,
      description: "Pilote ton fichier de prospects B2B grâce à un listing dense et rapide, équipé d'outils d'importation CSV et d'actions ciblées.",
      color: "bg-[var(--timeline-thinking)]/15 text-[var(--timeline-thinking)] border-[var(--timeline-thinking)]/30"
    },
    {
      title: "Pipeline",
      icon: Kanban,
      description: "Suis tes opportunités commerciales en temps réel via un tableau Kanban fluide ou une vue tabulaire compacte.",
      color: "bg-[var(--timeline-edit)]/15 text-[var(--timeline-edit)] border-[var(--timeline-edit)]/30"
    },
    {
      title: "Intelligence IA",
      icon: Brain,
      description: "Accélère ta prospection avec le copilote IA : scripts d'outreach personnalisés, analyses de niches et suggestions automatiques.",
      color: "bg-[var(--timeline-done)]/15 text-[var(--timeline-done)] border-[var(--timeline-done)]/30"
    }
  ];

  return (
    <div className="relative flex min-h-screen w-screen flex-col items-center justify-center overflow-x-hidden bg-background text-foreground font-sans">
      
      {/* Background Decorative Blur Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[40%] -left-[20%] h-[80%] w-[60%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute -bottom-[40%] -right-[20%] h-[80%] w-[60%] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center px-6 py-16 text-center">
        
        {/* Brand Header */}
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-black">
            M
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">Minerva Reach</span>
          <span className="rounded-full bg-muted border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            Lite
          </span>
        </div>

        {/* Hero Title */}
        <h1 className="max-w-2xl text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl leading-tight font-sans">
          Propulse ta prospection <span className="text-primary">locale</span>
        </h1>
        <p className="mt-4 max-w-xl text-xs leading-relaxed text-muted-foreground">
          Minerva Reach Lite centralise et simplifie ton action commerciale terrain. Qualifie tes contacts, pilote tes opportunités et utilise notre copilote IA pour signer plus d&apos;artisans et PME.
        </p>

        {/* Feature Pillars Grid */}
        <div className="mt-12 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 text-left">
          {pillars.map((p, index) => {
            const Icon = p.icon;
            return (
              <Card 
                key={index} 
                className="overflow-hidden border border-border bg-card shadow-none transition-all duration-300 hover:border-border hover:bg-card"
              >
                <CardContent className="p-5 flex gap-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${p.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">{p.title}</h3>
                    <p className="text-[10px] leading-relaxed text-muted-foreground">{p.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Action button */}
        <div className="mt-12">
          <Button 
            size="lg" 
            onClick={handleStart}
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-primary hover:bg-primary/95 px-8 py-6 text-xs font-bold uppercase tracking-wider text-primary-foreground transition-all shadow-none border-0"
          >
            Commencer l&apos;exploration
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
          <p className="mt-3 text-[10px] text-muted-foreground">
            En continuant, vos préférences seront enregistrées localement dans votre navigateur.
          </p>
        </div>

      </div>
    </div>
  );
}
