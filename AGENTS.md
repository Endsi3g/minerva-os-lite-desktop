<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Instructions pour le développement natif Electron & Offline-First

## Stockage SQLite
- L'application utilise `sqlite3` pour le stockage hors-ligne en mode natif Electron.
- Le schéma est initialisé dans [database.cjs](file:///Users/kaelbelceus/Minerva%20OS%20Reach%20Lite/minerva-os-lite-desktop/electron/database.cjs). Toute modification de schéma Supabase (leads, notes, drafts, settings, tasks) doit être répliquée dans `database.cjs`.
- Les requêtes SQLite dans le client Next.js se font via le pont `window.electron` (`dbAll`, `dbRun`, `dbGet`).

## Synchronisation bidirectionnelle
- La synchronisation s'effectue dans [sync.cjs](file:///Users/kaelbelceus/Minerva%20OS%20Reach%20Lite/minerva-os-lite-desktop/electron/sync.cjs). Elle utilise la politique "Last-Write-Wins" en comparant les timestamps `updated_at`.
- Les mutations locales doivent marquer la colonne `sync_status` avec `pending_insert`, `pending_update` ou `pending_delete` et appeler `electron.triggerSync()` pour forcer la synchronisation.

## Raccourci global & Spotlight
- Le Spotlight Search est accessible via `Option + Espace` (macOS) et `Alt + Espace` (Windows/Linux). Il est géré dans [main.cjs](file:///Users/kaelbelceus/Minerva%20OS%20Reach%20Lite/minerva-os-lite-desktop/electron/main.cjs).
- Quand Spotlight envoie l'événement de focus, l'application principale écoute sur `minerva_focus_lead` dans [layout.tsx](file:///Users/kaelbelceus/Minerva%20OS%20Reach%20Lite/minerva-os-lite-desktop/app/%28app%29/layout.tsx) et redirige le routeur Next.js vers la fiche du lead.

## Génération PDF
- La génération de PDF s'effectue en utilisant le service d'impression natif d'Electron via `electron.printToPdf(fileName, htmlContent)`.

