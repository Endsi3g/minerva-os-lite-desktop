-- v13.6: Add maps_url to lead_validations and ensure address / notes columns exist on leads
-- Safe to run multiple times (idempotent)

-- 1. Update lead_validations table
ALTER TABLE public.lead_validations ADD COLUMN IF NOT EXISTS maps_url TEXT;
COMMENT ON COLUMN public.lead_validations.maps_url IS 'Lien Google Maps de l''établissement pour le lead en boîte de validation';

-- 2. Ensure address / notes columns exist on leads (fallback safety checks)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS notes TEXT;
