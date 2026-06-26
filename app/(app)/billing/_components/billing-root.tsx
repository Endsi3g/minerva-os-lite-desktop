'use client';

import React, { useState, useEffect } from 'react';
import { Banner } from '@/components/billingsdk/banner';
import { TrialExpiryCard } from '@/components/billingsdk/trial-expiry-card';
import { SubscriptionManagement } from '@/components/billingsdk/subscription-management';
import { PricingTableTwo } from '@/components/billingsdk/pricing-table-two';
import { UsageMeter } from '@/components/billingsdk/usage-meter';
import { InvoiceHistory } from '@/components/billingsdk/invoice-history';
import { UpcomingCharges } from '@/components/billingsdk/upcoming-charges';
import { PaymentMethodSelector } from '@/components/billingsdk/payment-method-selector';
import { PaymentFailure } from '@/components/billingsdk/payment-failure';
import { DetailedUsageTable } from '@/components/billingsdk/detailed-usage-table';
import { plans, type Plan } from '@/lib/billingsdk-config';
import { createClient } from '@/lib/supabase/client';
import { useReach } from '@/lib/reach-context';
import { CreditCard, Zap, BarChart3, FileText, Sparkles, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type BillingTab = 'abonnement' | 'forfaits' | 'utilisation' | 'paiement' | 'factures';

// Demo data — not functional yet, wired to UI only
const DEMO_INVOICES = [
  { id: 'INV-001', date: '2026-06-01', amount: '$29.00', status: 'paid' as const, description: 'Minerva OS Pro · Juin 2026' },
  { id: 'INV-002', date: '2026-05-01', amount: '$29.00', status: 'paid' as const, description: 'Minerva OS Pro · Mai 2026' },
  { id: 'INV-003', date: '2026-04-01', amount: '$29.00', status: 'paid' as const, description: 'Minerva OS Pro · Avril 2026' },
];

const DEMO_USAGE = [
  { name: 'Leads', usage: 87, limit: 200 },
  { name: "Appels IA", usage: 142, limit: 500 },
  { name: 'Workspaces', usage: 1, limit: 1 },
  { name: 'Membres équipe', usage: 2, limit: 5 },
];

const DEMO_DETAILED_USAGE = [
  { name: 'Leads créés', used: 87, limit: 200, unit: 'leads', percentage: 43.5 },
  { name: 'Appels IA (scraping)', used: 142, limit: 500, unit: 'appels', percentage: 28.4 },
  { name: 'Emails envoyés', used: 34, limit: 200, unit: 'emails', percentage: 17 },
  { name: 'Exports PDF', used: 5, limit: 50, unit: 'exports', percentage: 10 },
];

const TRIAL_DAYS_REMAINING = 9;

const TABS: { id: BillingTab; label: string; icon: React.ReactNode }[] = [
  { id: 'abonnement', label: 'Abonnement', icon: <CreditCard className="h-3.5 w-3.5" /> },
  { id: 'forfaits', label: 'Forfaits', icon: <Sparkles className="h-3.5 w-3.5" /> },
  { id: 'utilisation', label: 'Utilisation', icon: <BarChart3 className="h-3.5 w-3.5" /> },
  { id: 'paiement', label: 'Paiement', icon: <Zap className="h-3.5 w-3.5" /> },
  { id: 'factures', label: 'Factures', icon: <FileText className="h-3.5 w-3.5" /> },
];

export default function BillingRoot() {
  const { leads, tasks, activeWorkspace } = useReach();
  const [activeTab, setActiveTab] = useState<BillingTab>('abonnement');
  const [showPaymentFailure, setShowPaymentFailure] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan>(plans[0]);
  const [userName, setUserName] = useState('Utilisateur');
  const [showTrialBanner, setShowTrialBanner] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase.from('settings').select('full_name').eq('user_id', user.id).maybeSingle();
          if (data?.full_name) setUserName(data.full_name.split(' ')[0] || 'Utilisateur');
        }
      } catch {}
    };
    init();
  }, []);

  // Real usage from CRM data
  const realUsage = [
    { name: 'Leads', usage: leads.length, limit: 200 },
    { name: 'Tâches', usage: tasks.length, limit: 500 },
    { name: 'Workspaces', usage: 1, limit: 1 },
    { name: 'Membres équipe', usage: 2, limit: 1 },
  ];

  const handlePlanChange = (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (plan) {
      setSelectedPlan(plan);
      toast.info(`Passage au forfait ${plan.title} — disponible bientôt.`);
    }
  };

  const handleCancelSubscription = async (_planId: string) => {
    toast.info('Annulation d\'abonnement — disponible bientôt.');
  };

  const handlePaymentProceed = (_method: string, _data: unknown) => {
    toast.info('Modification du paiement — disponible bientôt.');
  };

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf8]">

      {/* Trial banner */}
      {showTrialBanner && (
        <div className="px-6 pt-5">
          <Banner
            variant="warning"
            title={`Essai gratuit — ${TRIAL_DAYS_REMAINING} jours restants`}
            description="Passez au Pro pour débloquer les leads illimités, les séquences email et bien plus."
            buttonText="Passer au Pro"
            dismissable
            onDismiss={() => setShowTrialBanner(false)}
            className="w-full"
          />
        </div>
      )}

      <div className="w-full px-3 sm:px-4 md:px-6 pb-10 pt-5 flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[#26251e]">Facturation</h1>
            <p className="text-xs text-[#7a7a76] mt-0.5">
              Gérez votre abonnement, votre utilisation et vos moyens de paiement.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              ✦ Essai — {TRIAL_DAYS_REMAINING}j restants
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white border border-[#e5e5e0] rounded-xl p-1 w-fit">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors',
                activeTab === tab.id
                  ? 'bg-[#26251e] text-white'
                  : 'text-[#7a7a76] hover:text-[#26251e] hover:bg-[#f4f4f3]'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── TAB: ABONNEMENT ── */}
        {activeTab === 'abonnement' && (
          <div className="flex flex-col gap-6">
            {/* Trial expiry card */}
            <TrialExpiryCard
              daysRemaining={TRIAL_DAYS_REMAINING}
              onUpgrade={() => setActiveTab('forfaits')}
              title="Période d'essai gratuit"
              description="Votre essai de 14 jours est en cours. Passez au Pro pour ne pas perdre l'accès."
              upgradeButtonText="Voir les forfaits Pro →"
              features={[
                'Leads illimités dès le passage au Pro',
                'Séquences email automatisées',
                'Équipe jusqu\'à 5 membres',
                'Scraping Firecrawl activé',
              ]}
            />

            {/* Subscription management */}
            <SubscriptionManagement
              currentPlan={{
                plan: plans[0],
                type: 'monthly',
                price: '0',
                nextBillingDate: '—',
                paymentMethod: 'Aucun moyen de paiement',
                status: 'active',
              }}
              cancelSubscription={{
                title: 'Annuler l\'abonnement',
                description: 'Êtes-vous sûr de vouloir annuler votre abonnement ?',
                plan: plans[0],
                triggerButtonText: 'Annuler l\'abonnement',
                warningTitle: 'Vous perdrez l\'accès à :',
                warningText: 'Toutes vos données seront conservées pendant 30 jours après l\'annulation.',
                keepButtonText: 'Conserver mon abonnement',
                continueButtonText: 'Continuer',
                confirmButtonText: 'Confirmer l\'annulation',
                goBackButtonText: 'Retour',
                finalTitle: 'Abonnement annulé',
                finalSubtitle: 'Votre accès sera maintenu jusqu\'à la fin de la période.',
                finalWarningText: 'Vous pouvez réactiver votre abonnement à tout moment.',
                onCancel: handleCancelSubscription,
                onKeepSubscription: async () => { toast.info('Abonnement conservé.'); },
              }}
              updatePlan={{
                currentPlan: plans[0],
                plans: plans.slice(0, 3),
                triggerText: 'Changer de forfait',
                onPlanChange: handlePlanChange,
                title: 'Changer de forfait',
              }}
            />

            {/* Payment failure demo banner */}
            <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <div className="flex-1">
                <p className="font-bold text-amber-800">Simulation : paiement échoué</p>
                <p className="text-amber-700 mt-0.5">Cliquez pour voir le composant de gestion d'échec de paiement.</p>
              </div>
              <button
                onClick={() => setShowPaymentFailure(true)}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-lg transition-colors"
              >
                Voir
              </button>
            </div>

            {showPaymentFailure && (
              <PaymentFailure
                onRetry={() => { toast.info('Réessayer le paiement — disponible bientôt.'); setShowPaymentFailure(false); }}
                onSecondary={() => setShowPaymentFailure(false)}
                onTertiary={() => { toast.info('Contacter le support — disponible bientôt.'); }}
                title="Paiement échoué"
                subtitle="Nous n'avons pas pu traiter votre paiement."
                retryButtonText="Réessayer"
                secondaryButtonText="Fermer"
                tertiaryButtonText="Contacter le support"
              />
            )}
          </div>
        )}

        {/* ── TAB: FORFAITS ── */}
        {activeTab === 'forfaits' && (
          <div className="-mx-6">
            <PricingTableTwo
              plans={plans}
              onPlanSelect={handlePlanChange}
              size="small"
              theme="minimal"
              title="Choisissez votre forfait"
              description="Tous les forfaits incluent un essai gratuit de 14 jours. Annulez à tout moment."
            />
          </div>
        )}

        {/* ── TAB: UTILISATION ── */}
        {activeTab === 'utilisation' && (
          <div className="flex flex-col gap-6">
            <UsageMeter
              usage={realUsage}
              variant="linear"
              size="md"
              title="Utilisation du plan Gratuit"
              description="Quotas en temps réel basés sur votre compte actif."
              progressColor="usage"
            />

            <DetailedUsageTable
              resources={DEMO_DETAILED_USAGE}
              title="Détail de consommation"
              description="Répartition de votre utilisation par ressource ce mois-ci."
            />
          </div>
        )}

        {/* ── TAB: PAIEMENT ── */}
        {activeTab === 'paiement' && (
          <div className="flex flex-col gap-6">
            <div className="bg-white border border-[#e5e5e0] rounded-xl p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-[#7a7a76] mb-4">Moyen de paiement</p>
              <PaymentMethodSelector
                onProceed={handlePaymentProceed}
              />
            </div>

            <UpcomingCharges
              nextBillingDate="—"
              totalAmount="$0.00"
              title="Prochaine facturation"
              description="Votre plan gratuit n'entraîne aucune facturation."
              charges={[
                { id: 'charge-1', description: 'Plan Gratuit', amount: '$0.00', date: '—', type: 'recurring' },
              ]}
            />
          </div>
        )}

        {/* ── TAB: FACTURES ── */}
        {activeTab === 'factures' && (
          <div className="flex flex-col gap-6">
            <InvoiceHistory
              invoices={DEMO_INVOICES}
              title="Historique des factures"
              description="Toutes vos factures passées. Disponibles après souscription."
              onDownload={(id) => toast.info(`Téléchargement facture ${id} — disponible bientôt.`)}
            />
          </div>
        )}

      </div>
    </div>
  );
}
