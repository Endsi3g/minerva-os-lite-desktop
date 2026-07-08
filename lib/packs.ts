// Minerva OS — Packs de plateforme (PRD v12, Sprint 1).
// Un "pack" regroupe des capacités activables par workspace (Acquisition,
// Outreach, Field, Analytics & Growth). Contrairement à lib/permissions.ts
// (qui contrôle l'accès PAR RÔLE utilisateur), les packs contrôlent la
// visibilité PAR WORKSPACE — les deux se combinent : un item de nav n'est
// visible que si le rôle ET le(s) pack(s) concerné(s) l'autorisent.

export type PackId = 'acquisition' | 'outreach' | 'field' | 'analytics_growth';

export interface PackConfig {
  label: string;
  description: string;
  icon: string;
  routes: string[];
}

export const PACKS: Record<PackId, PackConfig> = {
  acquisition: {
    label: 'Acquisition',
    description: 'Scraping, Google Places, profils cibles, publicité, site web, audit SEO.',
    icon: '🎯',
    routes: ['/prospecting', '/personas', '/ads', '/acquisition', '/website-builder', '/audit'],
  },
  outreach: {
    label: 'Outreach',
    description: 'Email, DM, boîte de réception, séquences, playbooks, campagnes.',
    icon: '📨',
    routes: ['/outreach', '/inbox', '/messages', '/sequences', '/playbooks', '/contacts'],
  },
  field: {
    label: 'Terrain',
    description: 'Mode terrain, tournées, preuves de visite, carte GPS.',
    icon: '🚗',
    routes: ['/field', '/map'],
  },
  analytics_growth: {
    label: 'Analytics & Growth',
    description: 'Performance, rapports client, webhooks, activités, campagnes/programmes de croissance.',
    icon: '📈',
    routes: ['/performance', '/client-reports', '/webhooks', '/activities', '/campaigns'],
  },
};

export const ALL_PACKS = Object.keys(PACKS) as PackId[];

// Tout est activé par défaut — un workspace existant sans enabled_packs
// configuré ne perd aucun accès tant que l'utilisateur ne désactive rien
// explicitement depuis /platform.
export const DEFAULT_ENABLED_PACKS: PackId[] = ALL_PACKS;

export function routeToPack(pathname: string): PackId | null {
  for (const [packId, cfg] of Object.entries(PACKS)) {
    if (cfg.routes.some((r) => pathname === r || pathname.startsWith(r + '/'))) {
      return packId as PackId;
    }
  }
  return null;
}

export function isRouteEnabled(pathname: string, enabledPacks: string[] | null | undefined): boolean {
  const pack = routeToPack(pathname);
  if (!pack) return true; // route non rattachée à un pack — toujours visible
  const enabled = enabledPacks ?? DEFAULT_ENABLED_PACKS;
  return enabled.includes(pack);
}
