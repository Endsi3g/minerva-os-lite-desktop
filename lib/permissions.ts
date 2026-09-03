// Minerva OS permission system.
// A "permission module" maps to one or more routes in the sidebar.
// Default roles have predefined module access. Custom roles store permissions as a JSON array of module keys.

export type PermissionModule =
  | 'leads'
  | 'prospecting'
  | 'pipeline'
  | 'inbox'
  | 'campaigns'
  | 'sequences'
  | 'analytics'
  | 'team'
  | 'settings'
  | 'agents'
  | 'assistant'
  | 'map'
  | 'billing'
  | 'integrations'
  | 'services'
  | 'library'
  | 'roadmap'
  | 'tasks'
  | 'audit';

export interface PermissionModuleConfig {
  label: string;
  description: string;
  routes: string[];
  icon: string;
}

export const PERMISSION_MODULES: Record<PermissionModule, PermissionModuleConfig> = {
  leads:       { label: 'Leads & Fiches',     description: 'Voir et modifier les leads',             routes: ['/leads'],            icon: '👥' },
  prospecting: { label: 'Prospection',         description: 'Scraping et recherche de prospects',     routes: ['/prospecting'],      icon: '🔍' },
  pipeline:    { label: 'Pipeline',            description: 'Pipeline Kanban et deals',               routes: ['/pipeline'],         icon: '📊' },
  inbox:       { label: 'Boîte de réception',  description: 'Gmail et messagerie intégrée',           routes: ['/inbox'],            icon: '📬' },
  campaigns:   { label: 'Campagnes',           description: 'Campagnes multi-leads',                  routes: ['/campaigns'],        icon: '📣' },
  sequences:   { label: 'Séquences email',     description: 'Séquences automatisées',                 routes: ['/sequences'],        icon: '✉️' },
  analytics:   { label: 'Analytics',           description: 'Tableaux de bord et KPIs',               routes: ['/analytics'],        icon: '📈' },
  team:        { label: 'Équipe',              description: 'Gestion des membres et rôles',           routes: ['/team', '/leaderboard'], icon: '🫂' },
  settings:    { label: 'Paramètres',          description: 'Configuration du workspace',             routes: ['/settings'],         icon: '⚙️' },
  agents:      { label: 'Agents IA',           description: 'Agents personnalisés',                   routes: ['/agents'],           icon: '🤖' },
  assistant:   { label: 'Assistant IA',        description: 'Canvas et assistant chat',               routes: ['/assistant'],        icon: '🧠' },
  map:         { label: 'Carte terrain',       description: 'Route planner et GPS',                   routes: ['/map'],              icon: '🗺️' },
  billing:     { label: 'Facturation',         description: 'Abonnement et paiements',                routes: ['/billing'],          icon: '💳' },
  integrations:{ label: 'Intégrations',        description: 'Connecteurs tiers',                      routes: ['/integrations'],     icon: '🔌' },
  services:    { label: 'Services & Tarifs',   description: 'Catalogue et devis',                     routes: ['/services'],         icon: '🏷️' },
  library:     { label: 'Bibliothèque',        description: 'Assets et documents',                    routes: ['/library'],          icon: '📚' },
  roadmap:     { label: 'Roadmap',             description: 'Feuille de route produit',               routes: ['/roadmap'],          icon: '🗺️' },
  tasks:       { label: 'Tâches',              description: 'Gestion des tâches',                     routes: ['/tasks'],            icon: '✅' },
  audit:       { label: 'Audit SEO',           description: 'Analyse et audit',                       routes: ['/audit'],            icon: '🛡️' },
};

export const ALL_MODULES = Object.keys(PERMISSION_MODULES) as PermissionModule[];

// Predefined role permissions
export const DEFAULT_ROLE_PERMISSIONS: Record<string, PermissionModule[]> = {
  owner: ALL_MODULES,
  admin: [
    'leads', 'prospecting', 'pipeline', 'inbox', 'campaigns', 'sequences',
    'analytics', 'team', 'agents', 'assistant', 'map', 'services', 'library',
    'roadmap', 'tasks', 'audit', 'integrations',
  ],
  editor: [
    'leads', 'prospecting', 'pipeline', 'inbox', 'campaigns',
    'agents', 'assistant', 'map', 'services', 'library', 'tasks',
  ],
  viewer: [
    'leads', 'pipeline', 'map', 'assistant', 'tasks',
  ],
};

export function hasPermission(permissions: PermissionModule[], module: PermissionModule): boolean {
  return permissions.includes(module);
}

export function routeToModule(pathname: string): PermissionModule | null {
  for (const [mod, cfg] of Object.entries(PERMISSION_MODULES)) {
    if (cfg.routes.some(r => pathname === r || pathname.startsWith(r + '/'))) {
      return mod as PermissionModule;
    }
  }
  return null;
}
