-- Migration: Ajout du canal préféré (SMS, Cold Call, Instagram DM) sur la table leads
-- Date: 2026-08-04
--
-- PRE-MIGRATION CHECK (exécuter séparément, vérifier > 0 avant de continuer)
-- SELECT COUNT(*) FROM leads;

-- Pas de valeur par défaut non-NULL délibérément : ce champ est une préférence
-- réglée par un humain, pas une valeur calculée. Un DEFAULT non-NULL ferait
-- apparaître "Cold Call" comme choix pour 100% des leads existants, ce qui
-- n'est jamais arrivé et briserait tout l'intérêt de la colonne.
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS preferred_channel VARCHAR(32)
  CHECK (preferred_channel IS NULL OR preferred_channel IN ('sms', 'cold_call', 'instagram_dm'));

COMMENT ON COLUMN leads.preferred_channel IS 'Canal de prospection préféré, réglé manuellement: sms, cold_call, instagram_dm (NULL = non défini)';
