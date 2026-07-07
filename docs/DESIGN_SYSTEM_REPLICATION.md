# Répliquer le design de Minerva OS Reach Lite dans une autre application

Ce document explique, de manière ultra-précise et avec les chemins de fichiers réels de ce dépôt, comment le design de Minerva OS Reach Lite a été construit — et exactement quoi copier/adapter pour reproduire à l'identique la sidebar et la mise en page (layout) générale dans une autre application Next.js.

Racine du projet sur cette machine :
`/Users/kaelbelceus/Minerva OS Reach Lite/minerva-os-lite-desktop`

Tous les chemins ci-dessous sont relatifs à cette racine, sauf mention contraire.

---

## 1. Vue d'ensemble : comment le design a été construit

Le design n'est **pas** basé sur un thème shadcn/ui par défaut, ni sur une bibliothèque de composants "sidebar" toute faite (le composant `components/ui/sidebar.tsx` de shadcn existe dans le projet mais **n'est pas utilisé** pour la sidebar principale — elle est écrite à la main directement dans le layout applicatif). La stack réelle :

1. **Next.js App Router** (`next@16.2.6`, React 19) — un layout serveur/client par section de l'app.
2. **Tailwind CSS v4** (`tailwindcss@^4`) — configuré en CSS pur via `@theme inline` dans `app/globals.css` (pas de `tailwind.config.ts` séparé pour les tokens de couleur — Tailwind v4 lit directement les variables CSS).
3. **shadcn/ui** (Radix UI primitives) pour les briques bas niveau génériques (Tooltip, DropdownMenu, Popover, Button, Card, Badge, Switch, Input) — composants dans `components/ui/`.
4. **`motion` (Motion for React, ex-Framer Motion)**, `motion@^12.40.0`, importé via `motion/react` (pas `framer-motion`) — pour toutes les animations de layout (collapse sidebar, expand/collapse catégories, transitions de dropdown).
5. **`lucide-react@^1.17.0`** — bibliothèque d'icônes exclusive, aucune autre lib d'icônes, aucun emoji comme icône de navigation.
6. **Couleurs codées en dur en hex littéraux** dans les classNames Tailwind (`bg-[#059669]`, `text-[#26251e]`, etc.) — volontairement, pour un contrôle pixel-perfect indépendant du système de tokens shadcn par défaut (qui reste utilisé uniquement pour les variables structurelles génériques comme `--background`/`--foreground`, cf. §4).

La philosophie complète (couleurs, espacement, typographie, patterns de composants) est documentée dans `DESIGN.md` à la racine du projet — **à lire en premier**, ce document-ci le complète spécifiquement pour la sidebar/layout.

---

## 2. Le fichier central : `app/(app)/layout.tsx`

**C'est le seul fichier qui contient toute la sidebar.** Il n'y a pas de composant `<Sidebar />` séparé — tout (sidebar gauche, topbar, breadcrumb, bottom-nav mobile, providers) vit dans ce layout de 2160+ lignes qui enveloppe toutes les pages authentifiées (`app/(app)/*`).

Chemin exact : `app/(app)/layout.tsx`

### Structure du fichier (dans l'ordre)

| Section | Lignes approx. | Rôle |
|---|---|---|
| Imports | 1–101 | Voir §3 |
| State & hooks (sidebar collapsed, workspace menu, footer expanded, etc.) | ~150–300 | `useState` locaux, pas de state manager externe pour l'UI du layout |
| `pinnedItems` (6 items épinglés) | 748–755 | Tableau statique `{ name, href, icon }` |
| `navCategories` (5 catégories collapsibles) | 757–812 | Tableau `{ id, label, items: [...] }` |
| Filtrage par permissions (`canShowNavItem`) | 814–827 | Masque les items selon le rôle de l'utilisateur |
| JSX : overlay mobile | ~840–847 | `fixed inset-0 bg-black/40` quand sidebar ouverte sur mobile |
| JSX : `<motion.aside>` (conteneur sidebar) | 850–1346 | Toute la sidebar, voir §2.1 |
| JSX : topbar + breadcrumb | ~1350–1620 | Header horizontal au-dessus du contenu |
| JSX : bottom-nav mobile | 1624+ | `<nav className="fixed bottom-0 ... md:hidden">` |
| `ReachProvider` wrapper | fin du fichier | Contexte global de données (voir §5) |

### 2.1 Anatomie exacte de la sidebar (`<motion.aside>`, ligne 850)

```tsx
<motion.aside
  animate={{
    ...(isMobile
      ? { x: sidebarOpen ? 0 : -240, width: 240 }
      : { width: isCollapsed ? 0 : 240, x: 0 }
    ),
  }}
  initial={false}
  transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 1 }}
  className={cn(
    "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-[#e5e5e0] bg-[#f4f4f3] md:static md:relative shrink-0 overflow-hidden",
    isCollapsed ? "md:border-r-0" : "",
  )}
  style={{ minWidth: 0 }}
>
  <motion.div
    className="flex flex-col h-full w-[240px] min-w-[240px]"
    animate={isMobile ? { x: 0, opacity: 1 } : { x: isCollapsed ? -48 : 0, opacity: isCollapsed ? 0 : 1 }}
    transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 1 }}
  >
    {/* 1. Header : logo + workspace switcher (§2.2) */}
    {/* 2. Navigation : items épinglés + catégories collapsibles (§2.3) */}
    {/* 3. Footer : onboarding card + liens secondaires + settings/logout (§2.4) */}
  </motion.div>
</motion.aside>
```

**Point technique clé** : le conteneur extérieur (`motion.aside`) anime sa **largeur** (0 ↔ 240px) pour pousser le contenu de la page ; le conteneur intérieur (`motion.div`, largeur fixe 240px) anime sa **position X** (0 ↔ -48px, avec fade opacity) pour que le contenu ne se redistribue jamais pendant l'animation — les deux animations tournent en parallèle avec le même spring (`stiffness: 300, damping: 30, mass: 1`), qui est **le spring standard de toute l'app** (utilisé aussi pour les autres transitions listées dans `DESIGN.md`).

### 2.2 Header sidebar — logo + workspace switcher

```tsx
<div className="relative flex h-12 items-center border-b border-[#e5e5e0] px-4">
  <img src={activeWorkspace?.logo_base64 || "/icon.png"} alt="Logo" className="w-5 h-5 object-contain rounded shrink-0" />
  <div onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)} className="cursor-pointer ...">
    <span className="font-semibold text-sm text-[#26251e] truncate">{activeWorkspace?.name ?? 'Minerva OS Lite'}</span>
    <ChevronDown className="h-3 w-3 text-[#7a7a76]" />
  </div>
  {/* Dropdown menu absolu positionné (top-11 left-4 w-56) avec liens Settings/Workspaces/Team + liste des workspaces */}
</div>
```

Asset logo : `public/icon.png` (icône par défaut si aucun logo de workspace n'est uploadé).

### 2.3 Navigation — la donnée exacte à répliquer

```ts
// Lignes 748–812 de app/(app)/layout.tsx
const pinnedItems = [
  { name: 'Accueil',  href: '/today',    icon: Home },
  { name: 'Leads',    href: '/leads',    icon: Users },
  { name: 'Outreach', href: '/outreach', icon: Send },
  { name: 'Carte',    href: '/map',      icon: MapPin },
  { name: 'Agenda',   href: '/agenda',   icon: CalendarDays },
  { name: 'Équipe',   href: '/team',     icon: UsersRound },
];

const navCategories = [
  { id: 'sales',     label: 'Ventes',           items: [ /* Prospection, Profils cibles, Pipeline, Inbox, Terrain */ ] },
  { id: 'daily',     label: 'Quotidien',        items: [ /* Tâches, Activités, Messages, Contacts, Notifications */ ] },
  { id: 'ai',        label: 'Minerva AI',       items: [ /* Assistant IA, Agents, Intelligence, Skills */ ] },
  { id: 'marketing', label: 'Marketing',        items: [ /* Publicité, Acquisition, Site Web, Audit SEO, Rapports client, Performance, Webhooks */ ] },
  { id: 'tools',     label: 'Outils outreach',  items: [ /* Séquences & Envoi, Campagnes, Playbooks */ ] },
];
```

Liste complète des icônes et routes exactes : voir `app/(app)/layout.tsx` lignes 748–812 directement, ou le tableau équivalent dans `DESIGN.md` (section "Navigation").

**Rendu d'un lien de nav** (identique pour items épinglés et items de catégorie) :

```tsx
<Link
  href={item.href}
  className={cn(
    "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150",
    isActive
      ? "bg-[#e5e5e2] text-[#26251e] font-semibold"
      : "text-[#555552] hover:bg-[#e5e5e2]/60 hover:text-[#26251e]"
  )}
>
  <item.icon
    className={cn("h-4 w-4 shrink-0 transition-all duration-150", isActive ? "text-[#26251e]" : "text-[#555552] opacity-60")}
    strokeWidth={isActive ? 2 : 1.5}
  />
  <span className="truncate">{item.name}</span>
</Link>
```

Détection d'état actif : `pathname.startsWith(item.href)` (via `usePathname()` de `next/navigation`). Icônes : `strokeWidth={2}` si actif, `1.5` sinon ; `opacity-60` sur l'icône si inactif — c'est la seule différence visuelle d'icône entre actif/inactif (pas de changement de couleur d'icône hors ce contraste d'opacité).

**Catégories collapsibles** — bouton toggle + `AnimatePresence`/`motion.div` avec `height: 0 ↔ 'auto'` :

```tsx
<button onClick={() => toggleCategory(cat.id)} className="w-full flex items-center justify-between px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] hover:text-[#26251e]">
  <span>{cat.label}</span>
  <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", isCatCollapsed && "-rotate-90")} />
</button>
<AnimatePresence initial={false}>
  {!isCatCollapsed && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
      className="overflow-hidden"
    >
      {/* items de la catégorie, même rendu de lien que ci-dessus */}
    </motion.div>
  )}
</AnimatePresence>
```

Règle métier : **la catégorie contenant la page active se déplie automatiquement**, même si l'utilisateur l'avait repliée manuellement (`const isCatCollapsed = hasCatActive ? false : (collapsedCategories[cat.id] ?? true)`).

### 2.4 Footer sidebar

Trois blocs empilés, tous dans `border-t border-[#e5e5e0] bg-[#f4f4f3] py-2 px-3` :

1. **Carte "Get Started" collapsible** — barre de progression onboarding (`w-full bg-[#e5e5e2] h-1 rounded-full`, remplissage `bg-[#10b981]`), liste de tâches cochables en popup au-dessus (`absolute bottom-full`).
2. **Accordéon "Paramètres & Plus"** — 9 liens secondaires (Guide, Revenue OS, Statistiques, Facturation, Aide & Docs, Changelog, Roadmap, Bibliothèque de preuves, Récupération de données), même `AnimatePresence` pattern que les catégories de nav.
3. **Ligne Settings/Logout** — lien `/settings` (icône `SettingsIcon`) + bouton logout séparé (icône `LogOut`, `hover:text-red-600`, appelle `signout()` de `app/login/actions`).

---

## 3. Imports exacts nécessaires pour répliquer

```tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';   // PAS 'framer-motion'
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';                          // clsx + tailwind-merge, voir §4
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  Home, Users, Send, MapPin, CalendarDays, UsersRound,      // pinned icons
  Search, UserCog, KanbanSquare, Inbox, Navigation,          // 'sales' category icons
  ListChecks, Activity, MessageCircle, Bell,                 // 'daily' category icons
  Sparkles, Bot, Brain, Zap,                                 // 'ai' category icons
  Target, TrendingUp, Globe, ShieldCheck, FileText, BarChart3, // 'marketing' category icons
  Mail, Megaphone, BookOpen,                                 // 'tools' category icons
  ChevronDown, ChevronUp, Settings as SettingsIcon, LogOut,  // chrome
  Folder, FolderPlus, Flag, CreditCard, HelpCircle, RefreshCw, Gauge,
} from 'lucide-react';
```

Dépendances npm exactes (`package.json`) :

```json
{
  "next": "16.2.6",
  "react": "19.2.4",
  "motion": "^12.40.0",
  "lucide-react": "^1.17.0",
  "tailwindcss": "^4",
  "clsx": "^2.1.1",
  "tailwind-merge": "^3.6.0",
  "class-variance-authority": "^0.7.1",
  "@radix-ui/react-popover": "^1.1.16",
  "next-themes": "^0.4.6"
}
```

---

## 4. Fondations design : tokens, thème, police

### 4.1 `lib/utils.ts` — la fonction `cn`

```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

À copier tel quel — c'est le seul helper de composition de classes utilisé dans tout le projet (aucun `cva` custom pour la sidebar, `cva` n'est utilisé que dans certains composants shadcn comme `Button`).

### 4.2 `app/globals.css` — tokens Tailwind v4

Tailwind v4 n'utilise pas de fichier `tailwind.config.ts` pour les couleurs de thème — tout est déclaré en CSS :

```css
@import "tailwindcss";
@import "tw-animate-css";

@theme inline {
  --font-sans: var(--font-sans);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  /* ... voir app/globals.css lignes 1–58 pour la liste complète */
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
}

:root {
  --background: #f7f7f4;   /* Cursor-inspired Warm Cream */
  --foreground: #26251e;   /* Warm Ink */
  --primary: #10b981;      /* Emerald Green — structurel, pas l'accent de marque */
  /* ... voir app/globals.css lignes 62+ */
}
```

**Important** : `--primary: #10b981` est la couleur structurelle générique shadcn (utilisée par les composants Radix par défaut) — ce n'est **pas** la couleur d'accent de marque de la sidebar. L'accent de marque réel (`#059669`, plus foncé) est codé en dur directement dans les classNames (`bg-[#059669]`), jamais via une variable CSS. Ne pas confondre les deux verts en répliquant.

Grille de fond décorative (utilisée sur Today/Welcome, pas sur la sidebar elle-même) :

```css
.bg-grid-pattern-20 {
  background-image: linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px);
  background-size: 20px 20px;
}
```

### 4.3 `app/layout.tsx` — police et providers racine

```tsx
import { JetBrains_Mono, Inter } from "next/font/google"

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-sans" })
const fontMono = JetBrains_Mono({ subsets: ["latin"], display: "swap", variable: "--font-mono" })
```

Ordre des providers (racine, `app/layout.tsx`) :

```
<html>
  <body className={cn(inter.variable, fontMono.variable, "font-sans antialiased")}>
    <ThemeProvider>          {/* components/theme-provider.tsx — next-themes */}
      <LanguageProvider>     {/* lib/language-context.tsx */}
        <PageTransition>     {/* components/page-transition.tsx — transitions de page globales */}
          {children}
        </PageTransition>
      </LanguageProvider>
    </ThemeProvider>
    <Toaster />               {/* sonner */}
  </body>
</html>
```

Puis, à l'intérieur de `app/(app)/layout.tsx` spécifiquement, tout est enveloppé par `<ReachProvider>` (`lib/reach-context.tsx`) et `<TooltipProvider>` (shadcn).

---

## 5. Ce qui est spécifique à Minerva et ce qui est réutilisable tel quel

| Élément | Réutilisable tel quel dans une autre app | Spécifique à Minerva (à adapter) |
|---|---|---|
| Structure `motion.aside` + `motion.div` (double conteneur, spring 300/30/1) | ✅ Oui | — |
| Fonction `cn()` (`lib/utils.ts`) | ✅ Oui | — |
| Pattern de lien de nav (classes, icône strokeWidth conditionnel) | ✅ Oui | — |
| Pattern catégorie collapsible (`AnimatePresence` + `height: 'auto'`) | ✅ Oui | — |
| Tokens couleur (`#059669`, `#26251e`, `#e5e5e0`, `#f4f4f3`, `#fafaf8`) | ⚠️ Copier si on veut l'identité visuelle exacte | Changer si autre marque |
| Liste `pinnedItems`/`navCategories` (routes, labels, icônes) | ❌ Non | Spécifique aux fonctionnalités Minerva (Leads, Outreach, etc.) |
| `activeWorkspace`, `workspacesList`, `switchWorkspace` (workspace switcher) | ❌ Non | Dépend de `ReachProvider`/Supabase — à remplacer par l'équivalent de la nouvelle app |
| `canShowNavItem` / `userPermissions` (filtrage par rôle) | ❌ Non | Dépend de `lib/permissions.ts` — logique métier Minerva |
| Carte "Get Started" / onboarding | ❌ Non | Spécifique au flow d'onboarding Minerva (`lib/onboarding-store.ts`) |

**Pour répliquer dans une autre application** : copier la structure du §2.1 (les deux `motion` containers + le spring), la fonction `cn` (§4.1), les tokens de couleur si l'identité visuelle doit être identique (§4.2), et remplacer entièrement `pinnedItems`/`navCategories` par la navigation de la nouvelle app — la mécanique (collapse, catégories, active state, tooltips en mode réduit) est 100% indépendante du contenu métier Minerva.

---

## 6. Autres fichiers de référence utiles

| Fichier | Contenu |
|---|---|
| `DESIGN.md` | Philosophie design complète : couleurs, typographie, espacement, patterns de boutons/cards/modals/badges, règles absolues à ne jamais enfreindre |
| `components/ui/tooltip.tsx` | Tooltip shadcn utilisé pour la sidebar en mode réduit (`isCollapsed`) |
| `components/ui/button.tsx`, `card.tsx`, `badge.tsx`, `switch.tsx`, `input.tsx` | Primitives shadcn/Radix génériques, réutilisables telles quelles |
| `components/icons.tsx` | `MinervaIcon` — logo custom SVG de la marque (à remplacer par le logo de la nouvelle app) |
| `lib/language-context.tsx` | Système i18n (`useLanguage().t()`) — optionnel selon les besoins de la nouvelle app |
| `lib/permissions.ts` | `ALL_MODULES`, `routeToModule` — logique de filtrage de navigation par rôle |
| `public/icon.png` | Logo par défaut affiché dans le header de sidebar |
