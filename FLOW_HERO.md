# Flows Héros — Minerva OS Reach Lite

> Ce document décrit les 2 flows principaux que TOUTE décision produit doit servir.
> Avant d'ajouter une feature, une route API, un onglet dans la nav : vérifier qu'elle accélère l'un de ces deux flows.

---

## Flow Héros 1 — Gestion des leads tièdes et froids

**Persona :** Commercial terrain qui a 40–80 leads dans son pipeline mais ne sait plus lesquels relancer, quand, et avec quoi.

**Job :** Transformer des leads dormants en opportunités actives, sans effort de gestion manuelle.

### Parcours idéal

```
1. Ouvrir Today → Agent Feed
   → L'agent affiche : "3 leads inactifs depuis 9+ jours avec score > 60"
   → Pour chaque lead : reasoning visible ("Dernier contact il y a 11 jours, statut Contacté, score 74")

2. Cliquer "Approuver" sur une suggestion de relance
   → Tâche créée automatiquement OU brouillon email prêt

3. Ouvrir le brouillon depuis la fiche lead (Timeline)
   → Modifier si besoin → Envoyer

4. Réponse détectée dans Inbox
   → Lead reclassifié automatiquement (Intéressé / RDV demandé)
   → Notification dans Today → Agent propose de déplacer dans le pipeline
```

### Points de friction actuels à surveiller

- [ ] L'agent suggère-t-il les bons leads (score + inactivité + statut) ?
- [ ] Le reasoning est-il lisible en moins de 5 secondes ?
- [ ] Le brouillon est-il assez personnalisé pour ne pas avoir besoin d'être retouché ?
- [ ] La timeline lead reflète-t-elle l'action agentique (brouillon + envoi) ?

### Composants clés de ce flow

| Étape | Composant / Route |
|-------|------------------|
| Suggestions | `AgentFeed` (Today) + `agent_actions` table |
| Brouillon | `generate_email_draft` tool → `drafts` table |
| Envoi | `POST /api/send-email` |
| Réponse | `POST /api/cron/gmail-check-replies` |
| Reclassification | `POST /api/outreach/reply-classify` |
| Pipeline | `updateLeadStatus` → `agent: update_pipeline_stage` |

---

## Flow Héros 2 — Préparation de la semaine de prospection

**Persona :** Entrepreneur qui veut démarrer sa semaine avec un plan clair : quels leads cibler, quelles niches prioriser, quelle tournée terrain faire.

**Job :** Arriver lundi matin avec un plan d'action opérationnel — pas juste un rapport à lire.

### Parcours idéal

```
1. Lundi matin → Rapport hebdomadaire dans Today (ou Intelligence)
   → "Semaine du 30 juin : 5 opportunités prioritaires"
   → Agent a pré-rempli 5 tâches de relance pour les meilleurs leads
   → Agent propose une tournée terrain pour les 3 leads géolocalisés

2. Valider les tâches d'un clic dans Today → Tasks Card
   → Ordre de priorité suggéré par l'agent (score + probabilité de close)

3. Ouvrir Carte (Field) → Tournée déjà planifiée
   → Fiches de préparation générées (site web, notes, script terrain)

4. Soir : compte-rendu structuré après chaque visite
   → Statut mis à jour → agent mémorise les signaux terrain
```

### Points de friction actuels à surveiller

- [ ] Le rapport hebdomadaire déclenche-t-il des actions concrètes dans l'UI (tâches, drafts) ?
- [ ] La tournée terrain est-elle vraiment optimisée (distance, priorité, horaires) ?
- [ ] Les fiches de préparation sont-elles générées automatiquement avant la visite ?
- [ ] L'agent mémorise-t-il les patterns terrain dans `agent_memory` (secteurs, niches, horaires) ?

### Composants clés de ce flow

| Étape | Composant / Route |
|-------|------------------|
| Rapport | `POST /api/cron/weekly-report` → `POST /api/insights/weekly` |
| Tâches | `AgentFeed` → `create_task` tool → `TodayTasksCard` |
| Tournée | `plan_field_route` tool → `/field` |
| Préparation | `POST /api/generate-script` → fiche lead |
| Compte-rendu | `POST /api/agent/loop` déclenché post-visite |
| Mémoire | `update_agent_memory` → `agent_memory` (type: 'terrain_signal') |

---

## Grille de décision

Avant d'implémenter une feature, se poser ces questions :

```
Est-ce que ça accélère Flow 1 (leads tièdes) ?       → Oui → PRIORITÉ HAUTE
Est-ce que ça accélère Flow 2 (semaine de prospection) ? → Oui → PRIORITÉ HAUTE
Est-ce que ça enrichit la mémoire de l'agent ?        → Oui → PRIORITÉ MOYENNE
Est-ce que c'est de l'infrastructure dev ?             → FAIRE APRÈS
Aucun des deux ?                                       → Reporter
```

---

## Ce que l'agent doit exceller à mémoriser

Pour rendre le comportement AGI-like, `agent_memory` doit capturer :

```typescript
// Niches performantes
{ type: 'niche_summary', key: 'niche:boulangerie',
  content: 'Taux réponse 34%. Meilleur jour : mardi matin. Objection principale : "pas de budget".',
  metadata: { reply_rate: 0.34, best_day: 'tuesday', avg_score: 71 } }

// Résultat de campagnes
{ type: 'campaign_stat', key: 'sequence:cold_intro_v2',
  content: 'Séquence 3 étapes : 22% ouverture, 8% réponse, 2 closes sur 25 leads.',
  metadata: { open_rate: 0.22, reply_rate: 0.08, closes: 2, leads: 25 } }

// Apprentissages terrain
{ type: 'terrain_signal', key: 'city:montreal_plateau',
  content: 'Visites le mercredi AM plus efficaces. Éviter vendredi PM (fermé).',
  metadata: { best_slots: ['wednesday_morning'], avoid: ['friday_afternoon'] } }

// Décisions de l'agent
{ type: 'decision_log', key: 'sequence:stopped:spam_risk',
  content: 'Séquence arrêtée le 2026-06-29 : 3 leads déjà contactés détectés dans la liste.',
  metadata: { reason: 'duplicate_contacts', date: '2026-06-29' } }
```

---

*Dernière mise à jour : 2026-06-29 — v5.2.0*
