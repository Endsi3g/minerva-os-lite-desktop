-- PRE-MIGRATION CHECK (exécuter séparément, vérifier > 0 avant de continuer)
-- SELECT COUNT(*) FROM settings;       -- noter le nombre
-- SELECT COUNT(*) FROM workspaces;     -- noter le nombre
-- Si un compte = 0 → STOP, ne pas lancer la migration

-- v4.7 — Agency profile columns + social links on leads + library-assets bucket instructions
-- Toutes les opérations sont idempotentes (IF NOT EXISTS / OR REPLACE).

-- ── 1. Settings: agency profile columns ──────────────────────────────────────
ALTER TABLE settings ADD COLUMN IF NOT EXISTS agency_website       text;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS agency_logo_url      text;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS agency_brand_colors  text;      -- JSON array string
ALTER TABLE settings ADD COLUMN IF NOT EXISTS ai_agency_prompt     text;

-- ── 2. Workspaces: logo_base64 + accent_color (may already exist from v4.6) ─
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS logo_base64    text;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS accent_color   text DEFAULT '#059669';

-- ── 3. Leads: social links JSON column ───────────────────────────────────────
ALTER TABLE leads ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}'::jsonb;

-- ── 4. Documents: folder_name column (may already exist) ─────────────────────
ALTER TABLE documents ADD COLUMN IF NOT EXISTS folder_name text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_shared   boolean DEFAULT false;

-- ── 5. Services table (if not exists) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS services (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL,
  name         text NOT NULL,
  description  text DEFAULT '',
  price        numeric,
  type         text DEFAULT 'digital',
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE(workspace_id, name)
);

-- Migrate existing text workspace_id to uuid if needed (safe if no invalid data)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'services'
      AND column_name = 'workspace_id'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE services ALTER COLUMN workspace_id TYPE uuid USING workspace_id::uuid;
  END IF;
END $$;

-- RLS on services (canonical pattern — uuid throughout, no casts)
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "services_workspace_access" ON services;
CREATE POLICY "services_workspace_access" ON services FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION ALL
      SELECT workspace_id FROM team_members WHERE member_user_id = auth.uid()
    )
  );

-- ── 6. Drafts: subject + draft_type columns ──────────────────────────────────
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS subject    text;
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS draft_type text DEFAULT 'email';

-- ── NOTE: Supabase Storage bucket ────────────────────────────────────────────
-- Create the bucket manually in Supabase Dashboard → Storage → Buckets:
--   Name: library-assets
--   Public: YES (required for public image URLs)
-- Then add this policy in Dashboard → Storage → Policies:
--   Bucket: library-assets
--   Policy name: "Users can manage their own assets"
--   For: ALL operations
--   USING expression: auth.uid()::text = (storage.foldername(name))[1]
