-- v13.8 — Notifications d'erreurs applicatives cliquables.
--
-- Ajoute le stockage structuré (message complet, stack, contexte JSON) nécessaire
-- pour afficher le détail complet d'une erreur en plein écran depuis la cloche de
-- notifications, et une table anti-spam par signature d'erreur (une même erreur
-- répétée ne doit pas produire une notification par occurrence).
--
-- PRE-MIGRATION CHECK (exécuter séparément, vérifier > 0 avant de continuer)
-- SELECT COUNT(*) FROM notifications;
-- SELECT COUNT(*) FROM settings;
-- Si un compte = 0 → STOP, ne pas lancer la migration.

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS error_detail JSONB;

CREATE TABLE IF NOT EXISTS public.app_error_notifications (
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  error_signature   TEXT NOT NULL,
  last_notified_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, error_signature)
);

ALTER TABLE public.app_error_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "app_error_notifications self access" ON public.app_error_notifications;
CREATE POLICY "app_error_notifications self access" ON public.app_error_notifications FOR SELECT
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "app_error_notifications service write" ON public.app_error_notifications;
CREATE POLICY "app_error_notifications service write" ON public.app_error_notifications FOR ALL
  USING (true) WITH CHECK (true);
