-- PRE-MIGRATION CHECK (exécuter séparément, vérifier > 0 avant de continuer)
-- SELECT COUNT(*) FROM leads;
-- SELECT COUNT(*) FROM workspaces;

-- ============================================================
-- v14.6 — Assignation "Toute l'équipe" cassée
-- ============================================================
-- assigned_to est une colonne uuid : écrire le sentinel UI '__team__' dedans
-- (utilisé par le bouton "Toute l'équipe" du menu d'assignation de leads)
-- levait systématiquement une erreur Postgres "invalid input syntax for
-- type uuid", que le front affichait à tort comme "Vérifiez vos droits
-- d'accès à l'espace de travail". On isole ce cas dans une colonne dédiée.
-- ============================================================

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS assigned_to_team boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_leads_assigned_to_team ON public.leads (assigned_to_team) WHERE assigned_to_team = true;
