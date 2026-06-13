<p align="center">
  <img src="Minerva OS Lite/minerva-os-lite-desktop/public/favicon.ico" alt="Minerva Logo" width="80" height="80" />
</p>

<h1 align="center">Minerva OS Reach Lite</h1>

<p align="center">
  <strong>Système de Prospection et de Qualification de Leads Locaux de Haute Performance</strong>
</p>

<p align="center">
  Une application de bureau légère basée sur Next.js, tailwindcss, Supabase et Google APIs pour automatiser la découverte, l'audit technique SEO et l'engagement des commerces locaux.
</p>

<div align="center">
  
  [![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-blue.svg?style=flat-square)](https://nodejs.org/)
  [![pnpm Package Manager](https://img.shields.io/badge/pnpm-%3E%3D9.0.0-orange.svg?style=flat-square)](https://pnpm.io/)
  [![Framework Next.js](https://img.shields.io/badge/next.js-16.2.6-black.svg?style=flat-square)](https://nextjs.org/)
  [![Database Supabase](https://img.shields.io/badge/database-supabase-emerald.svg?style=flat-square)](https://supabase.com/)
  
</div>

---

## Table des matières

- [Présentation](#présentation)
- [Fonctionnalités principales](#fonctionnalités-principales)
- [Architecture du projet](#architecture-du-projet)
- [Prérequis et configuration](#prérequis-et-configuration)
- [Développement local](#développement-local)
- [Validation et déploiement](#validation-et-déploiement)

---

## Présentation

Minerva OS Reach Lite est conçu pour aider les agences et les professionnels du web à identifier et cibler les entreprises locales présentant des lacunes de présence en ligne. Le système extrait automatiquement les profils d'établissements physiques, analyse leurs forces et faiblesses SEO, génère des messages de prospection personnalisés par intelligence artificielle et permet un envoi direct par e-mail via l'API Gmail.

---

## Fonctionnalités principales

### Moteur de recherche et de scraping multicritère
- Recherche géolocalisée par secteur d'activité et par ville.
- Extraction multi-source intégrant Google Maps (via OpenStreetMap Nominatim), Yelp et PagesJaunes.
- Dé-duplication automatique des résultats et fusion des fiches de prospection.

### Audit SEO technique automatisé en temps réel
- Analyse en direct du protocole de sécurité (HTTPS).
- Vérification de la compatibilité mobile (balise viewport).
- Validation de la présence et de la pertinence des balises meta title et description.
- Mesure des performances de chargement serveur.
- Détection des scripts de suivi de trafic (Google Analytics, Facebook Pixel).

### Rédacteur IA et engagement direct
- Génération intelligente de brouillons de courriels de prospection (canaux Email, DM, Script).
- Choix de tonalité (Calme et Conseil, Direct et Closer, Storytelling) via OpenRouter ou Anthropic.
- Envoi sécurisé en un clic via l'API REST de Gmail grâce à une connexion Google OAuth native.
- Export direct des audits et des scripts dans le Google Drive de l'utilisateur.

### Authentification & Sécurité Avancée (Nouveau)
- **Connexion Passwordless OTP** : Authentification rapide par code unique envoyé par email.
- **Réinitialisation de mot de passe** : Flux sécurisé avec redirection PKCE (`/api/auth/confirm-reset`).
- **Gestion des mots de passe** : Page dédiée `/update-password` avec indicateur de force visuel et contrôles de visibilité.
- **Formulaire de Connexion premium** : Layout moderne à 3 onglets (Connexion standard, Code OTP, Inscription).

### Gestion d'Équipe & Invitations (Nouveau)
- **Système d'invitation sécurisé** : Invitation directe par email via l'API Admin de Supabase (utilisation de la clé de rôle de service `SUPABASE_SERVICE_ROLE_KEY` côté serveur).
- **Rôles et Permissions** : Rôles configurables (Administrateur, Éditeur, Lecteur) avec politiques RLS (Row Level Security) strictes sur la base de données.
- **Tableau de bord de l'équipe (`/team`)** : Interface premium de gestion des membres, affichage du propriétaire avec badge Couronne, modification de rôles en temps réel et suppression sécurisée des membres avec confirmation double-clic.

### Onboarding Interactif Premium (Nouveau)
- **Parcours d'onboarding inspiré de Sana AI** : Assistant multi-étapes avec animations fluides de glissement directionnel (gauche/droite) et indicateur visuel de progression circulaire.
- **Configuration intégrée** : Étapes intégrées pour le choix des forfaits (Gratuit vs Équipe) et le consentement analytique.

### Système de Workspaces & Commutation Dynamique (Nouveau)
- **Sélecteur de style Langdock** : Menu déroulant interactif dans la sidebar avec sous-menu volant (flyout menu) de commutation instantanée des workspaces.
- **Partitionnement étanche des données** : Les leads, tâches, notes et suggestions d&apos;IA sont filtrés de manière transparente en fonction du workspace actif.
- **Sécurité et RLS strictes** : Accès contrôlé via Supabase RLS autorisant uniquement les propriétaires et les membres invités actifs d&apos;un workspace à lire/écrire ses données.
- **Gestion dédiée (`/workspaces`)** : Page d&apos;administration complète permettant de créer de nouveaux workspaces, renommer ou supprimer ceux que l&apos;on possède (avec garde-fou interdisant la suppression du dernier espace).

### Fonctionnalités Natives & Support Hors-ligne Electron (Nouveau)
- **Stockage SQLite hors-ligne complet** : Base de données locale pour persister et modifier les prospects, les notes et les tâches sans connexion Internet.
- **Synchronisation bidirectionnelle automatique** : Moteur de synchronisation asynchrone utilisant la politique **Last-Write-Wins** basée sur les dates `updated_at` pour résoudre les conflits avec Supabase.
- **Planificateur de prospection persistant** : Déclenchement automatique et persistant du scraping de leads toutes les 6 heures avec notifications natives sur le système d'exploitation.
- **Spotlight Search global** : Barre de recherche rapide de type Spotlight accessible par-dessus toutes les applications via `Option + Espace` (macOS) ou `Alt + Espace` (Windows/Linux).
- **Exportation PDF native enrichie** : Impression PDF native des rapports d'audits SEO sous forme hautement stylisée sans dépendance lourde tierce.

---

## Architecture du projet

Le projet est structuré comme suit :

- `/Minerva OS Lite/minerva-os-lite-desktop` : Répertoire principal de l'application Next.js.
  - `/app` : Routage applicatif Next.js (pages de pipeline, prospection, réglages, équipe et routes API).
  - `/components` : Composants graphiques réutilisables de l'interface utilisateur.
  - `/lib` : Bibliothèques utilitaires, contextes React et clients de base de données.
    - `/lib/supabase` : Helpers d'initialisation des clients Supabase (client, serveur et middleware).
  - `/public` : Actifs statiques et images.
  - `deploy-test.ps1` : Script de validation et de test de compilation.
  - `supabase_schema.sql` : Schéma relationnel de la base de données.

---

## Prérequis et configuration

### Prérequis système
- Node.js (version 20.0.0 ou supérieure)
- pnpm (version 9.0.0 ou supérieure)
- Base de données Supabase active

### Variables d'environnement
Créez un fichier `.env.local` dans le dossier `Minerva OS Lite/minerva-os-lite-desktop` avec les variables suivantes :

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-cle-anon
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=votre-cle-anon

# Clé Secrète Admin Supabase (Serveur uniquement - NE JAMAIS exposer côté client)
SUPABASE_SERVICE_ROLE_KEY=votre-cle-service-role

# Google APIs (OAuth Gmail / Drive)
GOOGLE_CLIENT_ID=votre-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=votre-client-secret

# Intelligence Artificielle & Fournisseurs
ANTHROPIC_API_KEY=votre-cle-anthropic
```

---

## Développement local

Pour installer et démarrer l'application en mode de développement :

```bash
# Aller dans le répertoire de l'application
cd "Minerva OS Lite/minerva-os-lite-desktop"

# Installer les dépendances
pnpm install

# Lancer le serveur de développement
pnpm run dev
```

L'application est disponible à l'adresse : `http://localhost:3000`

---

## Validation et déploiement

Avant chaque soumission, exécutez le script de validation PowerShell pour tester la compilation et la qualité du code :

```powershell
# Exécuter le script de test à la racine ou dans le sous-dossier
./deploy-test.ps1
```

Ce script effectue automatiquement les étapes suivantes :
1. Vérification de la disponibilité du port 3000.
2. Nettoyage du cache de build.
3. Validation des types TypeScript.
4. Validation de la qualité de code via le linter.
5. Compilation de production de l'application.
6. Démarrage temporaire du serveur de production local et vérification de l'accès réseau.
