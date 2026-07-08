-- PRE-MIGRATION CHECK (exécuter séparément, vérifier > 0 avant de continuer)
-- SELECT COUNT(*) FROM leads;
-- SELECT COUNT(*) FROM team_members;
-- SELECT COUNT(*) FROM workspaces;
-- Si un compte = 0 → STOP, ne pas lancer la migration (sauf base neuve/dev)

-- v13.13 — Autopilot par programme de croissance (PRD v12, Sprint 3) :
-- un programme (campaign avec goal_type) peut être basculé en Autopilot avec
-- un plafond d'envoi quotidien et une cible de RDV hebdomadaire, et se
-- suspend automatiquement si le taux de réponses négatives dépasse un seuil
-- (voir app/api/cron/autopilot-guardrail/route.ts).

ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS autopilot_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS autopilot_daily_email_cap INTEGER;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS autopilot_weekly_meeting_cap INTEGER;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS autopilot_paused_reason TEXT;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS autopilot_paused_at TIMESTAMPTZ;

COMMENT ON COLUMN public.campaigns.autopilot_enabled IS 'Programme piloté en autonomie (plafonds + garde-fous appliqués aux crons d''envoi)';
COMMENT ON COLUMN public.campaigns.autopilot_daily_email_cap IS 'Plafond d''emails/jour tous canaux confondus pour les leads de ce programme (NULL = pas de plafond)';
COMMENT ON COLUMN public.campaigns.autopilot_weekly_meeting_cap IS 'Cible informative de RDV/semaine, affichée dans le rapport Autopilot';
COMMENT ON COLUMN public.campaigns.autopilot_paused_reason IS 'Raison de la suspension automatique par le garde-fou (NULL si jamais suspendu automatiquement)';
COMMENT ON COLUMN public.campaigns.autopilot_paused_at IS 'Horodatage de la dernière suspension automatique par le garde-fou';
