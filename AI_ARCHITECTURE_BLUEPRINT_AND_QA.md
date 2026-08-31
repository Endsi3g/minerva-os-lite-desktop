# Minerva AI Architecture Blueprint & QA Certification Protocol
**Version :** 3.100.0  
**Stack :** Next.js 16 (App Router) + TypeScript + TailwindCSS + Supabase + TipTap WYSIWYG + Google Gemini 3.7 Flash  
**Statut :** Certifié Production (READY)

---

## 1. Vue d'Ensemble de l'Architecture AI

Le système IA de Minerva OS est conçu pour transformer un CRM classique en un **SDR AI Autonome de bout en bout**, intégrant la suite d'édition intelligente **Notion AI**, un moteur **RAG contextuel par dossiers de projets**, et un **Bilan quotidien de coaching d'équipe**.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                          MINERVA OS CLIENT                                            │
├───────────────────────────────┬───────────────────────────────────┬────────────────────────────────────┤
│       ASSISTANT CHAT          │        CANVAS WYSIWYG             │       SIDEBAR & DOSSIERS           │
│  - Streaming multi-tours      │  - TipTap Editor                  │  - Gestionnaire de Projets         │
│  - Détection @context         │  - Toolbar Flottante Notion-like  │  - Dépôt de documents (SOPs)       │
│  - Cartes d'actions 1-clic    │  - Insertion /ai                  │  - Filtre dynamique de sessions    │
│  - Graphiques Recharts        │  - Diff & Prévisualisation        │  - RAG automatique                │
└───────────────┬───────────────┴─────────────────┬─────────────────┴──────────────────┬─────────────────┘
                │                                 │                                    │
                ▼                                 ▼                                    ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                           NEXT.JS API ROUTES                                           │
├───────────────────────────────┬───────────────────────────────────┬────────────────────────────────────┤
│        /api/chat              │        /api/ai/* (Notion Suite)   │     /api/agent/daily-checkin       │
│  - System Prompts             │  - /generate (SOPs, Briefs)       │  - Agrégation CRM                  │
│  - Contexte RAG injecté       │  - /rewrite (Ton, Longueur)       │  - Diagnostic goulots              │
│  - Actions minerva-action     │  - /summarize (Points + TODOs)    │  - 3-5 Conseils Coaching           │
│  - maxTokens: 3500+           │  - /translate (FR ↔ EN/DE/ES)     │  - Plan d'actions 1-clic           │
└───────────────┬───────────────┴─────────────────┬─────────────────┴──────────────────┬─────────────────┘
                │                                 │                                    │
                ▼                                 ▼                                    ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     AI GATEWAY & GEMINI ENGINE                                         │
│                                                                                                        │
│  - Modèle Primaire : Google Gemini 3.7 Flash (`gemini-2.5-flash` / `gemini-2.0-flash` fallback)       │
│  - Budget Tokens : 3500 tokens par tour (zéro troncature JSON)                                         │
│  - Vision & Multimodal : Support natif images et documents                                             │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Spécification des Composants Backend

### 2.1 Moteur Gemini & Streaming (`/api/chat` & `lib/ai.ts`)
- **Plafond de tokens** : Défini à `3500 tokens` dans toutes les routes pour éviter toute coupure des blocs Recharts (`chart`) et des réponses d'audit longues.
- **Modèles de secours (Fallback Chain)** :
  1. `gemini-2.5-flash` (ou `gemini-3.7-flash` selon région)
  2. `gemini-2.0-flash`
  3. `gemini-1.5-flash`
- **Séparation Chat / Agents** : Les requêtes conversationnelles, analytiques et d'aide s'exécutent en streaming direct sans être détournées par des boucles d'itération aveugles.

### 2.2 Suite Notion AI (`/api/ai/*`)
Chaque endpoint est optimisé pour des tâches rédactionnelles d'agence :

| Endpoint | Méthode | Entrée JSON | Sortie JSON | Cas d'Usage |
| :--- | :--- | :--- | :--- | :--- |
| `/api/ai/generate` | `POST` | `{ prompt, context?, options? }` | `{ text, tokensUsed }` | Rédiger SOPs, plans de projets, briefs clients, emails froids, posts LinkedIn. |
| `/api/ai/rewrite` | `POST` | `{ text, options: { action, tone, language } }` | `{ text, action }` | Raccourcir (`shorter`), Développer (`longer`), Corriger grammaire (`fix_grammar`), Ton persuasif/commercial (`tone`). |
| `/api/ai/summarize` | `POST` | `{ text, options? }` | `{ summary, actionItems, fullMarkdown }` | Résumé exécutif en 5–7 points clés + Extraction automatique de la checklist de TODOs actionnables. |
| `/api/ai/translate` | `POST` | `{ text, targetLanguage }` | `{ translatedText, targetLanguage }` | Traduction instantanée FR ↔ EN, DE, ES préservant la syntaxe Markdown, les tableaux et les balises. |

### 2.3 Bilan & Coaching d'Équipe (`/api/agent/daily-checkin`)
- **Objectif** : Standup quotidien automatisé ou à la demande pour l'équipe SDR.
- **Entrées** : `workspaceId`, `teamStats`, `customNotes`.
- **Sortie** :
  1. 📊 **Bilan & Vélocité** : Ratio de contact, taux de réponse, leads chauds.
  2. ⚠️ **Goulots d'étranglement** : Alertes sur les relances en retard.
  3. 🎯 **3 à 5 Conseils Tactiques** : Coaching en direct sur l'approche, le traitement d'objections et le closing.
  4. ⚡ **Plan d'Action Immédiat** : Blocs `minerva-action` en 1 clic pour déléguer ou exécuter les tâches prioritaires.

---

## 3. Spécification des Composants Frontend

### 3.1 Éditeur Canvas & Toolbar Flottante Notion-like
- **Éditeur TipTap** : Intégration de `StarterKit`, `Underline`, `TextAlign`, `Placeholder`, `CharacterCount`.
- **Détection de sélection** : Écouteur `selectionUpdate` calculant les coordonnées absolues `getBoundingClientRect()`.
- **Toolbar Flottante** :
  - Déclencheurs rapides : ✨ *Améliorer*, ✂️ *Raccourcir*, 📝 *Développer*, 🔍 *Corriger*, 🎯 *Ton Commercial*, 🌐 *Traduire*, 📋 *Résumer & TODOs*.
  - **Panneau de Diff & Prévisualisation** : Affiche le texte généré avec boutons `Remplacer la sélection`, `Régénérer` et `Rejeter`.
- **Commande `/ai`** : Déclencheur inline dans le document pour générer des sections à la volée.

### 3.2 Gestionnaire de Projets & Dépôt de Documents (RAG)
- **Schéma Base de Données (Supabase)** :
  - Table `projects` : `id, workspace_id, owner_id, name, description, created_at, updated_at`.
  - Table `documents` : `id, user_id, workspace_id, title, type, content, folder_id, is_shared, created_at, updated_at`.
  - Table `assistant_sessions` : `id, user_id, workspace_id, title, pinned, project_id, created_at, updated_at`.
- **RAG Automatique** :
  - Lorsque l'utilisateur sélectionne un dossier de projet, l'ensemble des documents associés est lu via `dbGetProjectDocs` et concaténé dans le prompt système (`## Dossier de Projet Actif`).
  - Support des déclencheurs `@docs` et `@projects` dans la barre de saisie pour injecter des connaissances spécifiques.

### 3.3 Cartes d'Actions Interactives (`minerva-action`)
Gemini génère des blocs JSON interprétés par le composant `ActionCard` :
```json
```minerva-action
{
  "action": "create_lead" | "create_task" | "update_lead_status" | "create_campaign" | "create_project" | "create_canvas_doc" | "qualify_lead" | "book_meeting" | "escalate_to_human" | "send_email" | "trigger_enrichment" | "navigate",
  "params": { ... },
  "summary": "Explication claire de l'action pour l'utilisateur"
}
```
```
L'utilisateur clique sur **Confirmer** pour exécuter l'action directement dans l'état de l'application (Supabase / React Context).

---

## 4. Pipeline du SDR AI Autonome End-to-End

Le SDR AI opère selon une boucle en **6 étapes** avec un mode **Hybride Intelligent avec garde-fous** :

```
1. Découverte & Signaux      --> Scraping Google Places/OSM, détection changements de site & notes GMB.
2. Qualification BANT & ICP   --> Évaluation IA : Budget, Autorité, Besoin, Timing + Score /100.
3. Séquences Multi-Canales    --> Rédaction personnalisée d'emails de cold outreach & relances cadencées.
4. Inbox Intelligente         --> Classification automatique des réponses (Intéressé, Objection, RDV, Désabonnement).
5. Réservation & Escalade     --> Proposition automatique de créneaux ou passage de relais humain urgent.
6. Mémoire & Standup Matinal --> Analyse continue des conversions, mise à jour du playbook et Daily Check-in.
```

---

## 5. Protocole de Certification QA (Matrice de Tests E2E)

Pour certifier que chaque fonctionnalité est 100% opérationnelle avant toute annonce, exécuter la suite de tests suivante :

### 🧪 Test 1 : Génération & Élimination de Troncature (Moteur Gemini 3.7 Flash)
- **Action** : Envoyer la requête `"Analyse mon pipeline CRM complet et donne-moi un diagnostic détaillé avec un graphique Recharts"`.
- **Validation** :
  - ✅ La réponse contient un texte complet sans coupure.
  - ✅ Le bloc ````chart` est un JSON valide et s'affiche sous forme de graphique interactif Recharts (Bar/Pie).
  - ✅ Aucun résidu de JSON brut tel que `)", "value": 35), {"name":` n'est visible dans le chat.

### 🧪 Test 2 : Suite Notion AI — Réécriture & Toolbar Flottante
- **Action** : Ouvrir le Canvas, taper un paragraphe de 3 phrases, sélectionner le texte et cliquer sur `✂️ Raccourcir`.
- **Validation** :
  - ✅ La toolbar flottante apparaît au-dessus de la sélection.
  - ✅ L'appel à `/api/ai/rewrite` renvoie une version synthétique.
  - ✅ En cliquant sur `Accepter`, le texte sélectionné dans TipTap est instantanément remplacé par la nouvelle version.

### 🧪 Test 3 : Suite Notion AI — Résumé Exécutif & Checklist TODOs
- **Action** : Coller un document long dans le Canvas et cliquer sur `✨ Résumer & TODOs`.
- **Validation** :
  - ✅ L'API `/api/ai/summarize` renvoie un résumé en 5 points.
  - ✅ Une section distincte `### Plan d'Action & TODOs` contient une checklist de tâches concrètes avec cases à cocher.

### 🧪 Test 4 : Dossiers de Projets & Injection de Documents (RAG)
- **Action** : 
  1. Créer un dossier `"SOPs Prospection SaaS"`.
  2. Déposer un document `"Guide Objections Prix"` contenant : *"Si le client dit que c'est trop cher, proposer un audit gratuit d'une semaine"*.
  3. Dans le chat du dossier, demander : `"Comment répondre à un client qui trouve l'offre trop chère ?"`.
- **Validation** :
  - ✅ Gemini cite et applique directement la consigne de l'audit gratuit provenant du document déposé.

### 🧪 Test 5 : Daily Standup SDR & Actions 1-Clic
- **Action** : Cliquer sur le chip `🌅 Daily Standup SDR & Conseils`.
- **Validation** :
  - ✅ L'API `/api/agent/daily-checkin` génère le bilan de la journée avec métriques réelles.
  - ✅ 3 à 5 conseils de coaching de vente sont présentés.
  - ✅ Une carte `minerva-action` permet de créer la tâche prioritaire du jour en 1 clic.

---

## 6. Commandes de Validation & Déploiement

```bash
# 1. Validation de la compilation et des types
npm run build

# 2. Synchronisation Git
git add .
git commit -m "feat(ai): integrate Gemini 3.7 Flash engine, Notion AI suite, and Project Folders with document context"
git push origin master

# 3. Déploiement Production Vercel
npx -y vercel --prod --yes
```

---
*Ce document sert de spécification de référence officielle pour Minerva OS.*
