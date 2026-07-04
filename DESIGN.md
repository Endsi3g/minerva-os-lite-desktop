# Minerva OS Lite — Design System

> **Version**: 3.53.0 · Dernière mise à jour : 4 juillet 2026

## Philosophy

Minerva OS Lite suit une esthétique **dense, professionnelle, monochromatique** inspirée de Linear et Langdock. L'interface est utility-first : chaque pixel sert une fonction. Pas de dégradés décoratifs, pas d'ombres lourdes, pas de fonds bruités — sauf quand ils servent l'orientation (ex. dot pattern sur Today/Welcome).

---

## Color Tokens

Toutes les couleurs de marque sont codées en dur comme hex littéraux (pas de noms Tailwind) pour un contrôle pixel-perfect. **Ne jamais utiliser `green-600`, `emerald-500` ou tout autre nom Tailwind pour les éléments de marque.**

| Token | Hex | Usage |
|---|---|---|
| Text primary | `#26251e` | Tout texte primaire, headers nav |
| Text secondary | `#7a7a76` | Métadonnées, labels, placeholders |
| Border | `#e5e5e0` | Toutes les bordures et séparateurs |
| Background page | `#fafaf8` | Fond de page |
| Background card | `#f4f4f3` | Cards, sidebar bg |
| Background hover | `#fafaf8` | Hover sur les lignes de liste |
| **Accent / Primary** | `#059669` (hover `#047857`) | **Couleur d'accent unique de l'app** — boutons CTA, highlights, focus rings, badges actifs |
| Success / Brand Green | `#10b981` | Indicateurs de succès, bulles de chat IA |
| Danger | `#ef4444` | Destructif, erreurs |
| Warning | `#d97706` | Alertes, statut "Proposition" |
| Purple | `#7c3aed` | Tournées, étapes, Négociation pipeline |
| Blue | `#2563eb` | Statut "RDV planifié", liens externes |

> **Il n'y a pas d'orange dans l'app.** Ne jamais utiliser `#f54e00`, `#d94400` ou les classes Tailwind `orange-*`. L'accent unique est le vert `#059669`.

### Couleurs de statut leads (map + pipeline)

| Statut | Hex |
|---|---|
| Nouveau | `#7a7a76` |
| Contacté | `#6b7280` |
| RDV planifié | `#2563eb` |
| Proposition | `#d97706` |
| Négociation | `#7c3aed` |
| Gagné | `#059669` |
| Perdu | `#ef4444` |

### Dark Mode

Géré par `ThemeProvider` (next-themes). Les variables CSS basculent automatiquement. Ne jamais hard-coder les overrides `dark:` pour les couleurs structurelles — utiliser les variables CSS via `bg-background`, `text-foreground`, etc.

---

## Typography

- **Font stack** : system sans-serif via `font-sans`; nombres monospaces via `font-mono`
- **Page header** : `text-2xl font-bold` (28px)
- **Section header** : `text-xl font-bold` (20px)
- **Card title** : `text-sm font-bold` (14px)
- **UI chrome** : `text-xs` (12px) — corps par défaut de toute l'interface
- **Content areas** : `text-sm` (14px) — éditeur, chat, longues descriptions
- **Labels / metadata** : `text-[10px]` ou `text-[9px]` — badges, timestamps, compteurs, labels de section
- **Tracking** : `tracking-tight` sur les grands titres; `tracking-wider uppercase` sur les labels de section

---

## Spacing & Density

- Sidebar width : `240px` (w-60 ou w-64 selon contexte)
- Topbar height : `h-14` (56px)
- Card padding : `p-5` (standard), `p-4` (compact), `p-3` (micro-card)
- Section gap : `gap-6` entre sections majeures, `gap-3` à l'intérieur d'une card
- Border radius :
  - `rounded-2xl` (16px) — modals, panels flottants, popups carte
  - `rounded-xl` (12px) — cards, drawers, zones de contenu
  - `rounded-lg` (8px) — inputs, boutons
  - `rounded-md` (6px) — petits contrôles, menus
  - `rounded-full` — badges, avatars, icônes circulaires

---

## Component Patterns

### Structure de page

Chaque page feature suit le pattern `*-root.tsx` :

```
app/(app)/<feature>/page.tsx                        ← server component (thin wrapper)
app/(app)/<feature>/_components/<feature>-root.tsx  ← client component (tout le state)
```

### Boutons

```tsx
// Primary CTA
<button className="bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold rounded-lg h-9 px-4 transition-colors">
  Action
</button>

// Secondary / outline
<button className="border border-[#e5e5e0] bg-white text-[#26251e] text-xs font-bold rounded-lg h-9 px-4 hover:bg-[#f4f4f3] transition-colors">
  Annuler
</button>

// Ghost / icon-only
<button className="h-8 w-8 rounded-lg hover:bg-[#f4f4f3] flex items-center justify-center text-[#7a7a76] hover:text-[#26251e] transition-colors">
  <Icon className="h-3.5 w-3.5" />
</button>

// Destructif
<button className="bg-[#ef4444] hover:bg-[#dc2626] text-white text-xs font-bold rounded-lg h-9 px-4">
  Supprimer
</button>
```

Hauteurs standard : `h-7` (micro), `h-8` (small), `h-9` (default), `h-10` (large).  
Toujours `text-xs font-bold` ou `text-sm font-semibold`.

### Cards

```tsx
<div className="border border-[#e5e5e0] rounded-xl p-5 bg-white space-y-3">
  <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Section Label</p>
  {/* content */}
</div>
```

Pas de shadow par défaut. `shadow-sm` seulement pour les éléments flottants (modals, popovers, dropdowns).

### Modals / Dialogs

```tsx
// Overlay
<div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center">
  // Modal container
  <div className="bg-white rounded-2xl shadow-xl w-[480px] max-w-[95vw] p-6 animate-in zoom-in-95 duration-150">
    {/* content */}
  </div>
</div>
```

### Inputs / Select

```tsx
<input className="w-full h-9 px-3 text-xs border border-[#e5e5e0] rounded-lg outline-none focus:ring-1 focus:ring-[#059669] text-[#26251e] placeholder:text-[#7a7a76] bg-white" />

<select className="h-9 px-2 text-xs border border-[#e5e5e0] rounded-lg bg-white text-[#26251e] outline-none focus:ring-1 focus:ring-[#059669]" />
```

### Labels de section (settings / formulaires)

```tsx
<p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] mb-1.5">Label</p>
```

### Badges / Tags

```tsx
// Status badge
<span className="text-[9px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: STATUS_COLORS[status] }}>
  {STATUS_LABELS[status]}
</span>

// Feature badge
<span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full border bg-[#f0fdf4] text-[#059669] border-[#059669]/20">
  Actif
</span>
```

### Toggle Switch

```tsx
<button
  onClick={() => onChange(!value)}
  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${value ? 'bg-[#059669]' : 'bg-[#d4d4d0]'}`}
>
  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${value ? 'translate-x-4' : 'translate-x-0'}`} />
</button>
```

### SettingsSectionWrapper

Toutes les sections de settings utilisent un wrapper partagé avec `title`, `description`, `isSaving`. Il fournit un header cohérent et un indicateur de sauvegarde.

---

## Navigation

### Sidebar principale (240px)

**6 items épinglés en haut (toujours visibles)** :

| Label | Route | Icône |
|---|---|---|
| Accueil | `/today` | `Home` |
| Leads | `/leads` | `Users` |
| Outreach | `/outreach` | `Send` |
| Carte | `/map` | `MapPin` |
| Agenda | `/agenda` | `CalendarDays` |
| Équipe | `/team` | `UsersRound` |

**5 catégories collapsibles** (dans cet ordre) :

| Catégorie | id | Items |
|---|---|---|
| Ventes | `sales` | Prospection, Pipeline, Inbox, Terrain |
| Quotidien | `daily` | Tâches, Activités, Messages, Contacts, Notifications |
| **Minerva AI** | `ai` | Assistant IA, Agents, Intelligence, Skills |
| Marketing | `marketing` | Publicité, Acquisition, Site web IA, Rapports client, Performance, Webhooks |
| Outils outreach | `tools` | Séquences, Campagnes, Playbooks |

> Minerva AI est positionné **avant Marketing** — c'est la valeur principale du produit.

**Footer sidebar** :
- Workspace switcher (nom + chevron dropdown)
- Bouton Paramètres (`/settings`)
- Bouton Notifications
- Avatar utilisateur + menu logout

### Settings sidebar (w-56)

**3 groupes collapsibles** (chevron toggle) :

| Groupe | Sections |
|---|---|
| Compte | profile, appearance, notifications, security, preferences |
| Espace de travail | workspace_general, members, workspace_overview, workspace_api, groups |
| Outils | minerva_ai, ai, models, api_keys, diagnostics, automations, prospecting, custom_instructions, customizations, roles, agency, integrations, goals, billing |

Le groupe actif (contenant la section active) n'est jamais collapsed automatiquement.

---

## Page Map — Patterns spécifiques

### FlyTo au clic

Tout clic sur un lead (sidebar gauche ou point sur la carte) déclenche :

```tsx
map.flyTo({ center: [lng, lat], zoom: 15, duration: 900, essential: true });
```

### Popup inline sur la carte

Au lieu d'une sidebar droite, les infos lead apparaissent en popup ancré au marqueur :

```tsx
// Positionnement via map.project()
const pt = map.project([lead._lng, lead._lat]);
style={{ position: 'absolute', left: pt.x, top: pt.y - 14, transform: 'translate(-50%, -100%)', zIndex: 60 }}
```

Le popup contient : nom, ville+niche, distance GPS (si actif), statut coloré, score, email/tel, boutons "Voir détails" (ouvre le panel) et "Fiche" (lien `/leads/[id]`).

### GPS nearby leads

Quand le GPS est actif (`GpsTrackingLayer` → callback `onPositionUpdate`), les leads sont :
- Triés par distance croissante (Haversine)
- Annotés d'un badge distance : `< 1km` → `"450 m"`, sinon `"2.3 km"`
- Le popup affiche aussi la distance

### Clusters et statuts

Clustering MapLibre GL JS avec couleurs de statut sur les points individuels (voir table STATUS_COLORS ci-dessus). Heatmap verte (`#059669`) désactivée par défaut.

---

## Composants IA

### Modèle primaire

**`@cf/moonshotai/kimi-k2.7-code`** (Moonshot AI via Cloudflare Workers AI) — modèle par défaut de toute l'application. Aucune clé externe requise (creds hardcodés en fallback).

Cascade de providers dans `resolveAIProvider` (`lib/ai.ts`) :
1. Anthropic (si clé configurée + provider explicite `anthropic`)
2. OpenRouter (si provider explicite `openrouter`)
3. Cloudflare / modèle `@cf/` (si provider explicite `cloudflare` ou modèle `@cf/*`)
4. Anthropic (fallback si `ANTHROPIC_API_KEY` disponible)
5. **Cloudflare Kimi K2** (fallback primaire — hardcodé, toujours disponible)
6. OpenRouter (si `OPENROUTER_API_KEY` configuré)
7. OpenRouter sans clé (last resort, fail avec 401)

### JSON stripping

Les modèles raisonnants (Kimi K2) encapsulent parfois le JSON dans des backticks markdown. `callCloudflare` strip automatiquement :

```ts
content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
```

### Assistant — Sélecteur de modèle

```ts
const AI_MODELS = [
  { id: '@cf/moonshotai/kimi-k2.7-code', name: 'Kimi K2 — Principal', provider: 'cloudflare' },
  { id: 'claude-sonnet-4-6',             name: 'Claude Sonnet',         provider: 'anthropic' },
  { id: 'claude-opus-4-8',               name: 'Claude Opus — Avancé',  provider: 'anthropic' },
  { id: 'claude-haiku-4-5-20251001',     name: 'Claude Haiku — Rapide', provider: 'anthropic' },
];
```

---

## Dot Pattern Background (Cult UI)

Utilisé sur Today et Welcome pour l'orientation visuelle :

```tsx
<div
  aria-hidden="true"
  className="pointer-events-none absolute inset-0 z-0 opacity-40 dark:opacity-20"
  style={{
    backgroundImage: 'radial-gradient(circle, #a1a1aa 1px, transparent 1px)',
    backgroundSize: '20px 20px',
  }}
/>
```

---

## Animation

| Contexte | Classe |
|---|---|
| Transitions de page | `animate-in fade-in duration-200` |
| Modals / popups | `animate-in zoom-in-95 duration-150` |
| Collapse sidebar | Transition CSS custom ~200ms |
| Progress bars | `transition-all duration-500` |
| Toasts | `animate-in slide-in-from-bottom-2 duration-200` |
| Loader spinner | `animate-spin` sur `Loader2` |
| GPS pulse | `animate-pulse` sur l'icône position |

---

## Icons

`lucide-react` exclusivement. Tailles :

| Contexte | Taille |
|---|---|
| Standard (boutons, nav) | `h-4 w-4` |
| Compact (toolbar, badge, carte) | `h-3.5 w-3.5` |
| Micro (inline, inside badge) | `h-3 w-3` ou `h-2.5 w-2.5` |

Ne jamais utiliser des emojis comme icônes sauf dans les badges de score ou les affichages de statut numériques.

---

## Data Architecture (design consistency)

- **Workspace partitioning** : toutes les requêtes incluent `workspace_id = activeWorkspace.id`; le workspace actif est toujours visible dans le switcher topbar
- **Optimistic UI** : toutes les mutations mettent à jour le state local avant l'écriture Supabase/SQLite
- **Sync status (Electron)** : les rows portent `sync_status: 'pending_insert' | 'pending_update' | 'pending_delete' | 'synced'` — pas d'indicateur visuel, la sync est silencieuse
- **Dual-store** : `if (window.electron)` → SQLite IPC; sinon → Supabase direct

---

## Localization (i18n)

Toutes les chaînes UI visibles passent par `useLanguage().t(key)`. Les clés de traduction sont dans `lib/translations.ts`, 3 locales : `fr` (défaut), `en`, `de`. Format : `nav.today`, `settings.tab_profile`, etc.

**Règle** : ne jamais hard-coder de chaînes françaises, anglaises ou allemandes dans le JSX. Toujours ajouter la clé dans les 3 locales simultanément.

---

## Règles absolues (ne jamais enfreindre)

1. **Pas d'orange** : zéro occurrence de `#f54e00`, `#d94400`, `orange-*` — le seul accent est `#059669`
2. **Hex littéraux pour la marque** : `#059669`, `#26251e`, `#e5e5e0` — jamais `green-600`, `zinc-800`, `gray-200`
3. **`text-xs` pour l'UI chrome** : résister à la tentation de `text-sm` pour les labels, badges, métadonnées
4. **Cards sans shadow** : `border border-[#e5e5e0]` suffit; `shadow-sm` uniquement pour les éléments qui flottent au-dessus du contenu
5. **`#7a7a76` pour le texte secondaire** — jamais `gray-500` ou `text-muted` pour les éléments de marque
6. **Green is the only accent** : focus rings, active states, primary CTAs, highlights — tout `#059669`
