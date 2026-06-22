# Minerva OS Lite — Design System

## Philosophy

Minerva OS Lite follows a **dense, professional, monochromatic** aesthetic inspired by Langdock and Linear. The interface is utility-first: every pixel serves a function. No decorative gradients, no heavy shadows, no noisy backgrounds unless they serve orientation (e.g., the dot pattern on the Today/Welcome pages).

---

## Color Tokens

All brand colors are hard-coded as hex literals (not Tailwind color names) for pixel-perfect control. Never use Tailwind named colors like `green-600` or `orange-500` for brand elements.

| Token | Hex | Usage |
|---|---|---|
| `--foreground` / text primary | `#26251e` | All primary text |
| `--muted-foreground` | `#7a7a76` | Secondary/helper text |
| `--border` | `#e5e5e0` | All borders, dividers |
| `--background` | `#fafaf8` | Page background |
| `--card` / sidebar bg | `#f4f4f3` | Cards, sidebar |
| Accent / Primary | `#059669` (hover `#047857`) | CTA buttons, highlights, all accents — **green is the only accent color, app-wide** |
| Brand Green | `#059669` / `#10b981` | Success states, prospecting, chat bubbles |
| Warm Dark | `#26251e` | Headers, nav items |
| Warm Tan | `#e5e5e2` | Hover states, dividers |

### Dark Mode
Handled by `ThemeProvider` (next-themes). CSS variables flip automatically. Never hard-code `dark:` overrides for structural colors — use CSS variables via `bg-background`, `text-foreground`, etc.

---

## Typography

- **Font stack**: system sans-serif via Tailwind's `font-sans`; monospaced numbers via `font-mono`
- **Title sizes**: `text-2xl font-bold` (page headers), `text-xl font-bold` (section headers), `text-sm font-bold` (card titles)
- **Body**: `text-xs` (12px) for all UI chrome; `text-sm` (14px) for content areas (editor, chat)
- **Labels / metadata**: `text-[10px]` or `text-[9px]` for badges, timestamps, point counters
- **Tracking**: `tracking-tight` on large headings; `tracking-wider uppercase` on section labels

---

## Spacing & Density

- Sidebar width: `240px` (collapsed: `0`/`border-r-0`)
- Topbar height: `h-14` (56px)
- Card padding: `p-5` (20px); compact cards: `p-3` or `p-4`
- Section gap: `gap-6` between major sections; `gap-3` within a card
- Border radius: `rounded-xl` (12px) for cards/modals; `rounded-lg` (8px) for inputs/buttons; `rounded-md` (6px) for small controls; `rounded-full` for badges
- Comfortable density is the default; compact mode can be toggled in Appearance settings

---

## Component Patterns

### Page structure
Every feature page follows the `*-root.tsx` client component pattern:
```
app/(app)/<feature>/page.tsx          ← server component (thin wrapper)
app/(app)/<feature>/_components/<feature>-root.tsx  ← client component (all state)
```

### Buttons
- **Primary CTA**: `bg-[#059669] hover:bg-[#047857] text-white font-bold rounded-lg` (green for prospecting/chat actions)
- **Accent CTA**: `bg-primary text-primary-foreground` (uses CSS variable, green `#059669` app-wide)
- **Secondary/outline**: `border border-[#e5e5e0] bg-white text-[#555552] hover:bg-[#f4f4f3]`
- **Destructive**: `bg-destructive text-destructive-foreground`
- **Ghost**: `hover:bg-muted text-muted-foreground`
- Height: `h-8` (small), `h-9` (default), `h-10` (large); always `text-xs font-bold` or `text-sm font-semibold`

### Cards
```tsx
<div className="border border-border rounded-xl p-5 bg-card space-y-3">
```
Cards use `bg-card` (maps to `#f4f4f3` in light mode) with `border-border` (`#e5e5e0`). No shadow by default — only `shadow-sm` when elevation is needed (modals, popovers).

### Modals / Dialogs
- Use shadcn `Dialog` or a custom fixed overlay with `bg-black/40 backdrop-blur-sm`
- Modal container: `bg-white rounded-2xl shadow-xl w-[480px] max-w-[95vw] p-6`
- Animation: `animate-in zoom-in-95 duration-150`

### Section headers (settings / forms)
```tsx
<div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Label</div>
```

### Badges / Tags
```tsx
<span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-600 border-emerald-200">Actif</span>
```

### SettingsSectionWrapper
All settings sections use a shared wrapper with `title`, `description`, `isSaving` props. The wrapper provides a consistent header and saving indicator.

### Toggle switches
Custom toggle (not shadcn Switch for consistency):
```tsx
<button onClick={() => onChange(!value)} className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${value ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${value ? 'translate-x-4' : 'translate-x-0'}`} />
</button>
```

---

## Navigation

### Sidebar (240px)
- **Fixed pinned items**: Aujourd'hui, Leads, Pipeline, Prospection, Chat IA
- **Collapsible categories**: Intelligence IA, Données & Fichiers, Plateforme
- **Bottom section**: Projects (from Supabase), then Get Started progress
- **Footer**: Workspace switcher, theme, notifications bell

### Settings nav
Grouped into 4 sections: **Compte** / **Espace de travail** / **Gestion des utilisateurs** / **Outils**. Width: `w-56`.

---

## Dot Pattern Background (Cult UI)
Used on Today and Welcome pages for visual orientation:
```tsx
<div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 opacity-40 dark:opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #a1a1aa 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
```

---

## Localization (i18n)

All visible UI strings go through `useLanguage().t(key)`. Translation keys live in `lib/translations.ts` under 3 locales: `fr` (default), `en`, `de`. Keys use dot-notation: `nav.today`, `settings.tab_profile`, `analytics.title`, etc.

**Rule**: never hard-code French, English, or German strings in JSX. Add the key to all 3 locales simultaneously.

---

## Animation

- Page transitions: `animate-in fade-in duration-200`
- Modals: `animate-in zoom-in-95 duration-150`
- Sidebar collapse: `sidebar-transition` (custom CSS class, duration ~200ms)
- Progress bars: `transition-all duration-500`
- Toast/notification slide: `animate-in slide-in-from-bottom-2 duration-200`

---

## Icons

Use `lucide-react` exclusively. Icon sizes: `w-4 h-4` (standard), `w-3.5 h-3.5` (compact / toolbar), `w-3 h-3` (inline / badge). Never use emoji as icons unless explicitly in a badge or score display.

---

## Data Architecture Notes (for design consistency)

- **Workspace partitioning**: all data queries include `workspace_id = activeWorkspace.id`; the active workspace ID is always visible in the topbar workspace switcher
- **Optimistic UI**: all mutations update local state before the async Supabase/SQLite write, so the UI feels instant
- **Sync status**: in Electron mode, rows carry `sync_status: 'pending_insert' | 'pending_update' | 'pending_delete' | 'synced'` — no visual indicator in the UI (sync is silent)

---

## Preferences for Future Apps

When replicating this design system for other Minerva-family products:

1. Keep the **`#26251e` warm dark** as foreground — it's distinctly warmer than pure black and reads better on the `#fafaf8` background
2. Keep **`#e5e5e0`** for all borders — it's warm enough to feel "paper-like" without being gray
3. **`#059669`** (Tailwind `emerald-600`, hover `#047857`) is the single brand accent — used in the `--primary` token and for all CTAs/highlights app-wide. **There is no orange in the app**; never introduce `#f54e00` or Tailwind `orange-*` classes.
4. The `font-sans` stack + `text-xs` body creates the "dense UI" feel — resist going to `text-sm` for UI chrome
5. All section labels use `text-[10px] font-bold uppercase tracking-wider` — this small-caps pattern creates visual hierarchy without weight changes
6. Cards never have drop shadows in the default state — only `shadow-sm` for modals/popovers that float above the surface
