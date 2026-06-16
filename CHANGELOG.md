# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet suit le [versionnement sémantique](https://semver.org/lang/fr/).

## [2.11.0] - 2026-06-16

### Sécurité
- Les clés API IA (OpenRouter, Groq, Together.ai) ne sont plus jamais renvoyées en clair au navigateur. Une nouvelle route `app/api/settings/ai-keys` gère la lecture (masquée, format `sk-••••1234`), l'écriture et la suppression côté serveur ; elles ne sont plus mises en cache dans `localStorage`.
- `app/api/team/members` vérifie désormais explicitement que le `workspace_id` demandé appartient à l'utilisateur authentifié (propriétaire ou membre actif) avant de renvoyer la liste des membres.
- `app/api/team/invite` simplifie sa logique d'autorisation en une vérification unique et claire (propriétaire ou rôle admin sur le workspace ciblé).

### Ajouté
- Page dédiée `/integrations/import` : import d'une intégration personnalisée depuis un catalogue illustratif ou une configuration JSON brute.
- Pages dédiées `/help/guides/[slug]` : six guides pas-à-pas avec contenu réel (première campagne, pipeline Kanban, workspace d'équipe, email IA, agents IA, export Drive).
- `lib/lead-badges.ts` : helpers partagés `getTemperatureStyle`/`getTemperatureLabel` pour l'affichage des badges de température des leads.

### Corrigé
- Suppression de tous les liens et boutons sans destination réelle (`href="#"`, menus inertes, alertes placeholder) sur `/team`, `/welcome`, `/integrations` et `/billing` — chacun déclenche désormais une action ou une navigation réelle.
- Téléchargement de facture sur `/billing` génère désormais un véritable document imprimable/PDF.

### Supprimé
- Export `initialAiSuggestions` inutilisé de `lib/mock-data.ts`.
- Trois implémentations dupliquées de `getTemperatureStyle`/`getTemperatureLabel` (consolidées dans `lib/lead-badges.ts`).

## [2.10.0] - 2026-06-16

### Ajouté
- Carte interactive du Québec pour la prospection géolocalisée.
- Marketplace d'agents IA personnalisés.
- Éditeur de bibliothèque basé sur TipTap pour la rédaction de contenu enrichi.

## [2.9.1] - 2026-06-15

### Ajouté
- Étape de profil dans le parcours d'onboarding.
- Avatar dynamique généré pour l'utilisateur.
- Signature email générée par IA.

## [2.9.0] - 2026-06-15

### Ajouté
- Score de leads persisté en base de données.
- Configuration SMTP générique (au-delà de Gmail).
- Tableau de bord de prospection.
- Intégration des fournisseurs IA Groq et Together.ai.
- Pages `/billing` et `/help`.

## [2.8.0] - 2026-06-15

### Modifié
- Mise à niveau vers Electron 43 avec support de macOS 26 Tahoe.

## [2.7.0] / [2.7.1] - 2026-06-15

### Ajouté
- Présence en temps réel et mécanisme anti-collision sur les données partagées.

### Corrigé
- Mécanisme de redémarrage du processus principal Electron sans JIT pour la stabilité sur macOS Sequoia.
- Crash lié au JIT lors de la navigation.

## [2.5.x] - 2026-06-14 — Stabilité desktop macOS

Série de correctifs consolidée (v2.5.1 à v2.5.8) visant la stabilité de l'application Electron sur macOS 26 :

### Modifié
- Remplacement de la couleur orange par le vert dans toute l'interface ; `/welcome` devient l'écran d'accueil, `/today` reste accessible depuis la sidebar.

### Corrigé
- Désactivation du JIT concurrent V8 et compilation `--jitless` pour éliminer un crash `EXC_BREAKPOINT` récurrent sur macOS 26.
- Désactivation du réseau Chromium en arrière-plan pour limiter un crash `DCHECK`.
- Correction du nom de l'application et reprise automatique après un crash du renderer pendant la navigation.
- Suppression du plafond `--max-old-space-size` qui provoquait un crash par manque de mémoire (OOM) lors de la navigation.

## [2.5.0] - 2026-06-14

### Modifié
- Réduction de la consommation de ressources : ajout d'index SQLite, correction d'un problème N+1 dans la synchronisation, chargement différé des fenêtres secondaires, plafonnement du tas mémoire (heap).

## [2.4.0] - 2026-06-14

### Ajouté
- Extraction de la landing page vers la route racine (`/`).

### Corrigé
- Flux d'onboarding et thème au démarrage de l'application.

## [2.3.0] - 2026-06-14

### Ajouté
- Widget popover de la barre système (`/tray`) au design glassmorphisme, avec vérification des tâches SQLite et déclenchement de scraping à la demande.

## [2.1.0] - 2026-06-13

### Ajouté
- Pont natif Capacitor (`lib/native-bridge.ts`), configuration de la plateforme Android et workflows CI/CD Fastlane.

## [2.0.0] - 2026-06-13

### Ajouté
- Icône de barre système (tray) Electron, minimisation à la fermeture de fenêtre, raccourcis de menu applicatif et mise à jour automatique (auto-updater).

## [1.0.0] - [1.9.0]

Itérations initiales de l'application : authentification, gestion des leads, pipeline, paramètres multilingues (FR/EN/DE), tableau de bord d'équipe et journal des modifications in-app. Voir les tags Git correspondants pour le détail commit par commit.
