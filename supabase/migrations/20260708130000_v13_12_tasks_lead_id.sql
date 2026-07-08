-- PRE-MIGRATION CHECK (exécuter séparément, vérifier > 0 avant de continuer)
-- SELECT COUNT(*) FROM leads;
-- SELECT COUNT(*) FROM team_members;
-- SELECT COUNT(*) FROM workspaces;
-- Si un compte = 0 → STOP, ne pas lancer la migration (sauf base neuve/dev)

-- v13.12 — Programmes de croissance, Phase 6 : lien vers l'agenda. Une tâche
-- de catégorie 'Meeting' créée depuis la réservation d'un RDV (agenda-root.tsx
-- handleBook) n'était rattachée à son lead que par du texte concaténé dans le
-- titre (aucune FK) — impossible de retrouver fiablement "les RDV d'un lead"
-- ou "les RDV d'un programme de croissance". Ajoute une vraie FK.

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_lead_id ON public.tasks(lead_id);

COMMENT ON COLUMN public.tasks.lead_id IS 'Lead rattaché à cette tâche/RDV (optionnel) — utilisé pour afficher les RDV d''un programme de croissance';
