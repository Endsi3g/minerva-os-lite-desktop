-- v4 fix: Create lead_shares table if missing
-- Columns must match the API routes (create-share + share-preview)

CREATE TABLE IF NOT EXISTS public.lead_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  share_token TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.lead_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User can manage own lead shares" ON public.lead_shares;
CREATE POLICY "User can manage own lead shares"
  ON public.lead_shares FOR ALL
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Public can read lead shares" ON public.lead_shares;
CREATE POLICY "Public can read lead shares"
  ON public.lead_shares FOR SELECT
  USING (expires_at > NOW());
