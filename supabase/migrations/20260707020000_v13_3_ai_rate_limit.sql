-- v13.3 — Corrige une course de concurrence dans les notifications d'échec IA
-- (plusieurs appels simultanés en échec passaient tous le contrôle anti-spam
-- avant qu'aucun n'ait le temps de l'enregistrer, produisant plusieurs
-- notifications "Échec IA" identiques pour un seul événement) et ajoute un
-- vrai rate limiting sur les appels IA avec sa propre notification dédiée.
--
-- PRE-MIGRATION CHECK (exécuter séparément, vérifier > 0 avant de continuer)
-- SELECT COUNT(*) FROM settings;
-- Si = 0 → STOP, ne pas lancer la migration.

CREATE TABLE IF NOT EXISTS public.ai_rate_limit_notifications (
  user_id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_notified_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ai_rate_limit_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_rate_limit_notifications self access" ON public.ai_rate_limit_notifications;
CREATE POLICY "ai_rate_limit_notifications self access" ON public.ai_rate_limit_notifications FOR SELECT
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "ai_rate_limit_notifications service write" ON public.ai_rate_limit_notifications;
CREATE POLICY "ai_rate_limit_notifications service write" ON public.ai_rate_limit_notifications FOR ALL
  USING (true) WITH CHECK (true);
