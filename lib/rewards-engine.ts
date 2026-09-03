// Minerva OS — Team Rewards & Commission Engine
// Règle 1: 1er deal confirmé = 100% de commission au closer
// Règle 2: 1er mois, 5 clients = 100% de l'argent des 5 deals partagé à parts égales dans l'équipe

import type { Lead } from './mock-data';

export interface LeadCommissionEstimate {
  dealAmount: number;
  isFirstDeal: boolean;
  commissionRate: number; // 1.0 = 100%, 0.2 = 20%
  estimatedCommission: number;
  contributesToTeamPool: boolean;
  badgeLabel: string;
}

export interface TeamMemberReward {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  hasFirstDealUnlocked: boolean;
  firstDealLeadId?: string;
  firstDealAmount?: number;
  firstDealDate?: string;
  totalDealsWon: number;
  totalPersonalCommission: number;
  teamPoolShare: number;
  totalEarned: number;
}

export interface MonthlyTeamChallenge {
  targetDeals: number;
  confirmedDealsCount: number;
  progressPercent: number;
  isCompleted: boolean;
  totalPoolAmount: number;
  activeMembersCount: number;
  sharePerMember: number;
  qualifyingDeals: Array<{
    id: string;
    businessName: string;
    dealAmount: number;
    closedBy: string;
    wonAt: string;
  }>;
  daysRemainingInMonth: number;
}

const DEFAULT_DEAL_AMOUNT = 1200;
const STANDARD_COMMISSION_RATE = 0.20; // 20% pour les deals suivants

/**
 * Calcule la commission estimée pour un lead spécifique pour un commercial donné
 */
export function calculateLeadCommission(
  lead: Partial<Lead>,
  memberWonCount: number = 0,
  teamChallengeCompleted: boolean = false
): LeadCommissionEstimate {
  const dealAmount = Number(lead.dealAmount) || DEFAULT_DEAL_AMOUNT;
  const isFirstDeal = memberWonCount === 0;

  // 1er deal = 100% de la valeur du deal pour le closer
  const commissionRate = isFirstDeal ? 1.0 : STANDARD_COMMISSION_RATE;
  const estimatedCommission = Math.round(dealAmount * commissionRate);

  let badgeLabel = isFirstDeal 
    ? '🎉 Bonus 1er Deal : 100% Commission' 
    : `Commission normale : ${Math.round(commissionRate * 100)}%`;

  return {
    dealAmount,
    isFirstDeal,
    commissionRate,
    estimatedCommission,
    contributesToTeamPool: !teamChallengeCompleted,
    badgeLabel,
  };
}

/**
 * Calcule l'état d'avancement du Challenge d'équipe du 1er mois (Objectif : 5 clients)
 */
export function calculateMonthlyTeamChallenge(
  leads: Lead[],
  activeMembersCount: number = 1,
  target: number = 5
): MonthlyTeamChallenge {
  const now = new Date();
  // Fin du mois courant
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const diffTime = endOfMonth.getTime() - now.getTime();
  const daysRemainingInMonth = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  // Récupérer tous les leads gagnés (Won)
  const wonLeads = (leads || []).filter(l => l.status === 'Won');

  // Trier par date de mise à jour / création pour identifier les 5 premiers
  const sortedWon = [...wonLeads].sort((a, b) => {
    const dateA = new Date(a.updatedAt || a.createdAt).getTime();
    const dateB = new Date(b.updatedAt || b.createdAt).getTime();
    return dateA - dateB;
  });

  const qualifying = sortedWon.slice(0, target).map(l => ({
    id: l.id,
    businessName: l.businessName || 'Client confirmé',
    dealAmount: Number(l.dealAmount) || DEFAULT_DEAL_AMOUNT,
    closedBy: l.owner || l.assignedTo || 'Équipe',
    wonAt: l.updatedAt || l.createdAt,
  }));

  const confirmedDealsCount = qualifying.length;
  const isCompleted = confirmedDealsCount >= target;
  const progressPercent = Math.min(100, Math.round((confirmedDealsCount / target) * 100));

  // Cagnotte totale des 5 premiers deals
  const totalPoolAmount = qualifying.reduce((sum, d) => sum + d.dealAmount, 0);

  // Répartition égale entre tous les membres actifs de l'équipe
  const effectiveMembers = Math.max(1, activeMembersCount);
  const sharePerMember = Math.round(totalPoolAmount / effectiveMembers);

  return {
    targetDeals: target,
    confirmedDealsCount,
    progressPercent,
    isCompleted,
    totalPoolAmount,
    activeMembersCount: effectiveMembers,
    sharePerMember,
    qualifyingDeals: qualifying,
    daysRemainingInMonth,
  };
}

/**
 * Construit le profil de récompenses pour chaque membre de l'équipe
 */
export function computeTeamRewards(
  leads: Lead[],
  teamMembers: Array<{ id: string; name: string; email: string; avatar?: string }>,
  challenge: MonthlyTeamChallenge
): TeamMemberReward[] {
  return teamMembers.map(member => {
    const memberName = (member.name || '').toLowerCase();
    const memberEmail = (member.email || '').toLowerCase();

    // Trouver tous les deals gagnés par ce membre
    const wonDeals = leads.filter(l => {
      if (l.status !== 'Won') return false;
      const owner = (l.owner || '').toLowerCase();
      const assigned = (l.assignedTo || '').toLowerCase();
      return (
        owner === memberName || 
        assigned === memberName || 
        owner === memberEmail || 
        assigned === memberEmail ||
        (member.id === 'usr-owner' && (owner === 'moi' || !owner))
      );
    });

    const hasFirstDealUnlocked = wonDeals.length > 0;
    const firstDeal = wonDeals[0];
    const firstDealAmount = firstDeal ? (Number(firstDeal.dealAmount) || DEFAULT_DEAL_AMOUNT) : 0;

    // Calcul de la commission personnelle : 100% sur le 1er deal + 20% sur les suivants
    let totalPersonalCommission = 0;
    if (wonDeals.length > 0) {
      totalPersonalCommission += firstDealAmount; // 100%
      for (let i = 1; i < wonDeals.length; i++) {
        const amt = Number(wonDeals[i].dealAmount) || DEFAULT_DEAL_AMOUNT;
        totalPersonalCommission += Math.round(amt * STANDARD_COMMISSION_RATE);
      }
    }

    // Part de la cagnotte d'équipe (si le challenge est complété ou en prévisionnel)
    const teamPoolShare = challenge.sharePerMember;
    const totalEarned = totalPersonalCommission + (challenge.isCompleted ? teamPoolShare : 0);

    return {
      id: member.id,
      name: member.name,
      email: member.email,
      avatar: member.avatar,
      hasFirstDealUnlocked,
      firstDealLeadId: firstDeal?.id,
      firstDealAmount: hasFirstDealUnlocked ? firstDealAmount : undefined,
      firstDealDate: firstDeal?.updatedAt || firstDeal?.createdAt,
      totalDealsWon: wonDeals.length,
      totalPersonalCommission,
      teamPoolShare,
      totalEarned,
    };
  });
}
