"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, ChevronRight, PlayCircle, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GuidePage() {
  const router = useRouter();

  const sections = [
    {
      title: "1. Paramétrage Initial",
      description: "Configurer votre compte pour la prospection autonome",
      items: [
        { title: "Définir vos personas (ICP)", icon: <Target />, time: "5 min", status: "completed" },
        { title: "Connecter votre boîte mail (SMTP)", icon: <Mail />, time: "3 min", status: "pending" },
        { title: "Régler vos critères de scoring", icon: <Sliders />, time: "2 min", status: "pending" },
      ]
    },
    {
      title: "2. Automatisations",
      description: "Créer des règles 'si... alors...'",
      items: [
        { title: "Créer une règle de relance", icon: <Zap />, time: "5 min", status: "pending" },
        { title: "Configurer l'Agent Interne", icon: <Bot />, time: "2 min", status: "pending" },
      ]
    },
    {
      title: "3. Passage à l'Action",
      description: "Lancer vos premières campagnes",
      items: [
        { title: "Démarrer une campagne avec Hermes", icon: <PlayCircle />, time: "10 min", status: "pending" },
        { title: "Analyser le Dashboard Ops", icon: <Activity />, time: "3 min", status: "pending" },
      ]
    }
  ];

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf9] text-[#26251e] font-sans">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        
        {/* Header navigation bar */}
        <div className="flex items-center gap-3 border-b border-[#e5e5e0] pb-4">
          <button
            onClick={() => router.push("/setup")}
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#e5e5e0] hover:bg-neutral-100 text-[#807d72] hover:text-[#26251e] transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold tracking-tight">
              Guide d'Implémentation
            </h1>
            <p className="text-xs text-[#807d72] mt-0.5">
              Étape par étape pour verrouiller votre écosystème de prospection.
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {sections.map((section, idx) => (
            <div key={idx} className="space-y-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#807d72]">{section.title}</h2>
                <p className="text-xs text-[#807d72] mt-0.5">{section.description}</p>
              </div>
              <div className="bg-white border border-[#e5e5e0] rounded-2xl overflow-hidden">
                {section.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border-b last:border-0 hover:bg-slate-50 cursor-pointer group transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                        {item.status === 'completed' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <div className="w-2 h-2 rounded-full bg-slate-300" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{item.title}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" /> {item.time}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

// Inline dummy icons for the guide
const Target = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
const Mail = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>;
const Sliders = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="21" y2="14"/><line x1="4" x2="20" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/></svg>;
const Zap = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
const Bot = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>;
const Activity = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>;
const Clock = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
