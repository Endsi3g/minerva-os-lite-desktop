-- v4 fix: Create lead_shares table if missing
-- This table was defined in v296 migration but may not have been applied.

CREATE TABLE IF NOT EXISTS public.lead_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.lead_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User can manage own lead shares" ON public.lead_shares;
CREATE POLICY "User can manage own lead shares"
  ON public.lead_shares FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public can read lead shares" ON public.lead_shares;
CREATE POLICY "Public can read lead shares"
  ON public.lead_shares FOR SELECT
  USING (expires_at > NOW());
