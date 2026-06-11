<p align="center">
  <img src="Minerva OS Lite/minerva-os-lite-desktop/public/favicon.ico" alt="Minerva Logo" width="80" height="80" />
</p>

<h1 align="center">Minerva OS Reach Lite</h1>

<p align="center">
  <strong>Systeme de Prospection et de Qualification de Leads Locaux de Haute Performance</strong>
</p>

<p align="center">
  Une application de bureau legere basee sur Next.js, tailwindcss, Supabase et Google APIs pour automatiser la decouverte, l'audit technique SEO et l'engagement des commerces locaux.
</p>

<div align="center">
  
  [![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-blue.svg?style=flat-square)](https://nodejs.org/)
  [![pnpm Package Manager](https://img.shields.io/badge/pnpm-%3E%3D9.0.0-orange.svg?style=flat-square)](https://pnpm.io/)
  [![Framework Next.js](https://img.shields.io/badge/next.js-16.2.6-black.svg?style=flat-square)](https://nextjs.org/)
  [![Database Supabase](https://img.shields.io/badge/database-supabase-emerald.svg?style=flat-square)](https://supabase.com/)
  
</div>

---

## Table des matieres

- [Presentation](#presentation)
- [Fonctionnalites principales](#fonctionnalites-principales)
- [Architecture du projet](#architecture-du-projet)
- [Prerequis et configuration](#prerequis-et-configuration)
- [Developpement local](#developpement-local)
- [Validation et deploiement](#validation-et-deploiement)

---

## Presentation

Minerva OS Reach Lite est concu pour aider les agences et les professionnels du web a identifier et cibler les entreprises locales presentant des lacunes de presence en ligne. Le systeme extrait automatiquement les profils d'etablissements physiques, analyse leurs forces et faiblesses SEO, genere des messages de prospection personnalises par intelligence artificielle et permet un envoi direct par e-mail via l'API Gmail.

---

## Fonctionnalites principales

### Moteur de recherche et de scraping multicritere

- Recherche geolocalisee par secteur d'activite et par ville.
- Extraction multi-source integrant Google Maps (via OpenStreetMap Nominatim), Yelp et PagesJaunes.
- De-duplication automatique des resultats et fusion des fiches de prospection.

### Audit SEO technique automatise en temps reel

- Analyse en direct du protocole de securite (HTTPS).
- Verification de la compatibilite mobile (balise viewport).
- Validation de la presence et de la pertinence des balises meta title et description.
- Mesure des performances de chargement serveur.
- Detection des scripts de suivi de trafic (Google Analytics, Facebook Pixel).

### Redacteur IA et engagement direct

- Generation intelligente de brouillons de courriels de prospection (canaux Email, DM, Script).
- Choix de tonalite (Calme et Conseil, Direct et Closer, Storytelling) via OpenRouter ou Anthropic.
- Envoi securise en un clic via l'API REST de Gmail grace a une connexion Google OAuth native.
- Export direct des audits et des scripts dans le Google Drive de l'utilisateur.

---

## Architecture du projet

Le projet est structure comme suit :

- `/Minerva OS Lite/minerva-os-lite-desktop` : Repertoire principal de l'application Next.js.
  - `/app` : Routage applicatif Next.js (pages de pipeline, prospection, reglages, et routes API).
  - `/components` : Composants graphiques reutilisables de l'interface utilisateur.
  - `/lib` : Bibliotheques utilitaires, contextes React et clients de base de donnees.
    - `/lib/supabase` : Helpers d'initialisation des clients Supabase (client, serveur et middleware).
  - `/public` : Actifs statiques et images.
  - `deploy-test.ps1` : Script de validation et de test de compilation.
  - `supabase_schema.sql` : Schema relationnel de la base de donnees.

---

## Prerequis et configuration

### Prerequis systeme

- Node.js (version 20.0.0 ou superieure)
- pnpm (version 9.0.0 ou superieure)
- Base de donnees Supabase active

### Variables d'environnement

Creez un fichier `.env.local` dans le dossier `Minerva OS Lite/minerva-os-lite-desktop` avec les variables suivantes :

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-cle-anon
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=votre-cle-anon

# Google APIs (OAuth Gmail / Drive)
GOOGLE_CLIENT_ID=votre-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=votre-client-secret

# Intelligence Artificielle & Fournisseurs
ANTHROPIC_API_KEY=votre-cle-anthropic
```

---

## Developpement local

Pour installer et demarrer l'application en mode de developpement :

```bash
# Aller dans le repertoire de l'application
cd "Minerva OS Lite/minerva-os-lite-desktop"

# Installer les dependances
pnpm install

# Lancer le serveur de developpement
pnpm run dev
```

L'application est disponible a l'adresse : `http://localhost:3000`

---

## Validation et deploiement

Avant chaque soumission, executez le script de validation PowerShell pour tester la compilation et la qualite du code :

```powershell
# Executer le script de test a la racine
./deploy-test.ps1
```

Ce script effectue automatiquement les etapes suivantes :

1. Verification de la disponibilite du port 3000.
2. Nettoyage du cache de build.
3. Validation des types TypeScript.
4. Validation de la qualite de code via le linter.
5. Compilation de production de l'application.
6. Demarrage temporaire du serveur de production local et verification de l'acces reseau.
