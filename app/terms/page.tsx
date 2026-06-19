'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { MinervaIcon } from '@/components/icons';
import { TextureOverlay } from '@/components/ui/texture-overlay';
import { ArrowLeft, FileText, Lock, ShieldAlert, Scale, HelpCircle } from 'lucide-react';

export default function TermsOfUsePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen w-screen bg-[#f7f7f4] text-[#26251e] font-sans selection:bg-[#10b981]/10 flex flex-col justify-between overflow-x-hidden relative">
      <TextureOverlay texture="grid" opacity={0.4} />

      <div className="flex-grow flex flex-col justify-between min-h-screen relative z-10">
        {/* Header */}
        <header className="flex h-16 items-center justify-between px-6 md:px-16 border-b border-[#e6e5e0]/80 bg-white/80 backdrop-blur-md sticky top-0 z-50">
          <div 
            onClick={() => router.push('/')}
            className="flex items-center gap-2.5 font-bold tracking-tight text-[#26251e] cursor-pointer"
          >
            <MinervaIcon size={22} className="text-[#10b981]" />
            <span className="text-sm font-semibold">Minerva Reach</span>
          </div>

          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-xs font-bold text-[#555552] hover:text-[#26251e] transition-colors cursor-pointer border border-[#e6e5e0] px-4 py-1.5 rounded-full bg-white shadow-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 max-w-3xl mx-auto w-full py-16 px-6">
          <div className="bg-white border border-[#e6e5e0] rounded-2xl p-8 md:p-12 shadow-sm space-y-8">
            <div className="border-b border-[#e6e5e0]/60 pb-6">
              <div className="h-12 w-12 rounded-xl bg-[#10b981]/10 text-[#10b981] flex items-center justify-center mb-4">
                <FileText className="h-6 w-6" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-[#26251e] font-serif font-georgia">
                Conditions d'Utilisation
              </h1>
              <p className="text-[11px] text-[#807d72] mt-2 font-medium tracking-wide uppercase">
                Dernière mise à jour : 19 juin 2026
              </p>
            </div>

            {/* Section 1 */}
            <div className="space-y-3">
              <h2 className="text-base font-bold text-[#26251e] flex items-center gap-2">
                <Scale className="h-4 w-4 text-[#10b981] shrink-0" />
                1. Acceptation des conditions
              </h2>
              <p className="text-xs text-[#555552] leading-relaxed">
                En accédant et en utilisant les services de <strong>Minerva Reach</strong>, vous acceptez d'être lié par les présentes Conditions d'Utilisation. Si vous n'acceptez pas ces conditions, vous ne devez pas utiliser le service. Ces conditions s'appliquent à tous les visiteurs, utilisateurs et autres personnes accédant ou utilisant le service.
              </p>
            </div>

            {/* Section 2 */}
            <div className="space-y-3">
              <h2 className="text-base font-bold text-[#26251e] flex items-center gap-2">
                <Lock className="h-4 w-4 text-[#10b981] shrink-0" />
                2. Comptes et sécurité des identifiants
              </h2>
              <p className="text-xs text-[#555552] leading-relaxed">
                Pour utiliser certaines fonctionnalités, vous devez créer un compte utilisateur. Vous êtes responsable du maintien de la confidentialité de vos identifiants de connexion et de toutes les activités effectuées sous votre compte. Vous devez immédiatement signaler toute utilisation non autorisée ou faille de sécurité détectée.
              </p>
            </div>

            {/* Section 3 */}
            <div className="space-y-3">
              <h2 className="text-base font-bold text-[#26251e] flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-[#10b981] shrink-0" />
                3. Règles d'utilisation & conformité anti-spam
              </h2>
              <p className="text-xs text-[#555552] leading-relaxed">
                Minerva Reach propose des fonctionnalités d'automatisation de prospection par e-mail et de scraping de données publiques. En tant qu'utilisateur, vous vous engagez à respecter strictement les règles suivantes :
              </p>
              <ul className="list-disc pl-5 text-xs text-[#555552] space-y-1.5">
                <li><strong>Respect des lois locales :</strong> Vous êtes entièrement responsable de veiller à ce que vos campagnes respectent la législation applicable en matière de protection des données et de lutte contre le spam (notamment la loi canadienne LCAP, la loi CAN-SPAM aux États-Unis, et le RGPD en Europe).</li>
                <li><strong>Pas d'utilisation abusive (Scraping) :</strong> Vous vous engagez à ne pas surcharger les APIs ou services de cartographie/recherche externes et à utiliser le scraping dans la limite du raisonnable et du respect des conditions des tiers.</li>
                <li><strong>Gmail et restrictions Google :</strong> L'intégration de votre compte Gmail via notre flux OAuth est effectuée sous votre entière responsabilité. Vous reconnaissez et acceptez que Minerva Reach n'est pas responsable des suspensions ou limitations de quota imposées par Google sur vos comptes.</li>
              </ul>
            </div>

            {/* Section 4 */}
            <div className="space-y-3">
              <h2 className="text-base font-bold text-[#26251e] flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#10b981] shrink-0" />
                4. Propriété intellectuelle et données
              </h2>
              <p className="text-xs text-[#555552] leading-relaxed">
                Le logiciel, les algorithmes de ciblage des agents IA, l'interface graphique et l'ensemble de la marque Minerva Reach restent la propriété exclusive de Minerva Reach. L'utilisateur est propriétaire des données de leads générées, de ses listes de prospection et du contenu des courriels qu'il rédige ou envoie.
              </p>
            </div>

            {/* Section 5 */}
            <div className="space-y-3">
              <h2 className="text-base font-bold text-[#26251e] flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-[#10b981] shrink-0" />
                5. Limitation de responsabilité
              </h2>
              <p className="text-xs text-[#555552] leading-relaxed">
                Le service Minerva Reach est fourni « en l'état » et « selon disponibilité », sans aucune garantie d'aucune sorte, expresse ou implicite. Minerva Reach ne garantit pas que les services répondront à vos attentes en matière de ventes ou de conversions. En aucun cas, Minerva Reach ne pourra être tenu responsable des dommages indirects, accessoires, spéciaux ou consécutifs découlant de votre utilisation du service.
              </p>
            </div>

            {/* Section 6 */}
            <div className="space-y-3">
              <h2 className="text-base font-bold text-[#26251e] flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-[#10b981] shrink-0" />
                6. Contact
              </h2>
              <p className="text-xs text-[#555552] leading-relaxed">
                Pour toute question concernant ces Conditions d'Utilisation, vous pouvez nous écrire directement à :
              </p>
              <p className="text-xs font-semibold text-[#10b981] bg-[#10b981]/5 px-3 py-2 rounded-lg inline-block">
                quebecsaas@gmail.com
              </p>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="h-16 flex items-center justify-between px-8 border-t border-[#e6e5e0] text-[10px] text-[#807d72] font-semibold bg-white/40">
          <div className="flex items-center gap-1.5">
            <MinervaIcon size={14} className="text-[#10b981]" />
            <span>Minerva OS</span>
          </div>
          <div>
            <span>&copy; 2026 Minerva Reach. Tous droits réservés.</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
