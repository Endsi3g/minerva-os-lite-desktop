-- v12.0 — Bucket Supabase Storage pour les pièces jointes (fichiers) de la
-- messagerie d'équipe. Le bucket voice-messages existe déjà (créé séparément) ;
-- celui-ci couvre les fichiers arbitraires (pas seulement audio/image).
--
-- PRE-MIGRATION CHECK (exécuté séparément avant d'appliquer)
-- SELECT COUNT(*) FROM leads;
-- SELECT COUNT(*) FROM team_members;
-- SELECT COUNT(*) FROM workspaces;
-- Si un compte = 0 → STOP, ne pas lancer la migration.

INSERT INTO storage.buckets (id, name, public)
VALUES ('message-files', 'message-files', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "message_files_read" ON storage.objects;
CREATE POLICY "message_files_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'message-files');

DROP POLICY IF EXISTS "message_files_write" ON storage.objects;
CREATE POLICY "message_files_write" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'message-files' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "voice_messages_read" ON storage.objects;
CREATE POLICY "voice_messages_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'voice-messages');

DROP POLICY IF EXISTS "voice_messages_write" ON storage.objects;
CREATE POLICY "voice_messages_write" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'voice-messages' AND auth.role() = 'authenticated');
