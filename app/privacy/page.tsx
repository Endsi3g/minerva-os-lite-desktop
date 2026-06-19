'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { MinervaIcon } from '@/components/icons';
import { TextureOverlay } from '@/components/ui/texture-overlay';
import { ArrowLeft, Shield, Mail, Lock, Eye } from 'lucide-react';

export default function PrivacyPolicyPage() {
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
                <Shield className="h-6 w-6" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-[#26251e] font-serif font-georgia">
                Politique de Confidentialité
              </h1>
              <p className="text-[11px] text-[#807d72] mt-2 font-medium tracking-wide uppercase">
                Dernière mise à jour : 19 juin 2026
              </p>
            </div>

            {/* Intro */}
            <p className="text-xs text-[#555552] leading-relaxed">
              Chez <strong>Minerva Reach</strong>, accessible depuis l'adresse <code>https://minerva-os-lite-desktop.vercel.app</code>, l'une de nos priorités principales est la confidentialité et la sécurité de nos utilisateurs. Cette politique de confidentialité détaille les types d'informations recueillies et stockées par Minerva Reach, et la manière dont nous les utilisons.
            </p>

            {/* Section 1 */}
            <div className="space-y-3">
              <h2 className="text-base font-bold text-[#26251e] flex items-center gap-2">
                <Lock className="h-4 w-4 text-[#10b981] shrink-0" />
                1. Utilisation des données de l'API Google (Gmail)
              </h2>
              <p className="text-xs text-[#555552] leading-relaxed">
                Minerva Reach permet aux utilisateurs d'intégrer leur propre compte Gmail pour envoyer, recevoir et suivre leurs e-mails de prospection. Lorsque vous connectez votre compte via le protocole d'authentification Google OAuth, notre application demande l'accès aux permissions suivantes :
              </p>
              <ul className="list-disc pl-5 text-xs text-[#555552] space-y-1.5">
                <li><code>gmail.readonly</code> : Permet de synchroniser votre boîte de réception dans Minerva Reach pour afficher et suivre les réponses de vos prospects.</li>
                <li><code>gmail.send</code> : Permet d'envoyer des courriels et des séquences de suivi de prospection planifiés directement depuis votre adresse Gmail.</li>
                <li><code>userinfo.email</code> et <code>userinfo.profile</code> : Utilisés pour vous identifier et afficher votre adresse e-mail connectée dans les paramètres de l'application.</li>
              </ul>
              <div className="bg-[#f7f7f4] border-l-2 border-[#10b981] p-3.5 rounded-r-lg mt-2">
                <p className="text-[11px] text-[#26251e] font-semibold leading-relaxed">
                  <strong>Règle d'utilisation limitée de Google :</strong> L'utilisation par Minerva Reach des informations reçues des API Google respectera la <a href="https://developers.google.com/terms/api-services-user-data-policy#key-terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#10b981]">politique de données utilisateur des services d'API Google</a>, y compris les exigences d'utilisation limitée (Limited Use Requirements).
                </p>
              </div>
            </div>

            {/* Section 2 */}
            <div className="space-y-3">
              <h2 className="text-base font-bold text-[#26251e] flex items-center gap-2">
                <Eye className="h-4 w-4 text-[#10b981] shrink-0" />
                2. Stockage et sécurité des données
              </h2>
              <p className="text-xs text-[#555552] leading-relaxed">
                Vos clés d'accès Google OAuth (tokens) sont cryptées et stockées de manière hautement sécurisée dans notre base de données hébergée sur Supabase.
              </p>
              <ul className="list-disc pl-5 text-xs text-[#555552] space-y-1.5">
                <li><strong>Pas de revente :</strong> Vos données ne sont jamais vendues, partagées, louées ou transmises à des tiers.</li>
                <li><strong>Utilisation stricte :</strong> Ces informations sont uniquement utilisées pour exécuter les fonctionnalités de messagerie demandées directement par vous sur la plateforme.</li>
                <li><strong>Déconnexion instantanée :</strong> Vous pouvez révoquer l'accès à tout moment depuis la page <em>Paramètres &rsaquo; Intégrations</em> en cliquant sur le bouton « Déconnecter ».</li>
              </ul>
            </div>

            {/* Section 3 */}
            <div className="space-y-3">
              <h2 className="text-base font-bold text-[#26251e] flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#10b981] shrink-0" />
                3. Contact
              </h2>
              <p className="text-xs text-[#555552] leading-relaxed">
                Si vous avez des questions concernant cette politique de confidentialité ou l'utilisation de vos données Google, n'hésitez pas à nous contacter directement par e-mail :
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
