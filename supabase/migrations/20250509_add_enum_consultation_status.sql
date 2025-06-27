-- ================================================================
-- Migration finale : nettoyage et mise en place ENUM consultation_status
-- ================================================================

-- Étape 1 : Créer le type ENUM s’il n’existe pas (idempotent)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'consultation_status'
    ) THEN
        CREATE TYPE consultation_status AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'paid');
    END IF;
END $$;

-- Étape 2 : Corriger les anciennes valeurs si jamais elles sont restées
UPDATE consultations
SET status = 'sent'
WHERE status::text IN ('submitted', 'completed', 'pending');

-- Étape 3 : Normaliser les valeurs restantes
UPDATE consultations
SET status = CASE
    WHEN status::text ILIKE 'completed' THEN 'paid'
    WHEN status::text ILIKE 'pending' THEN 'sent'
    WHEN status IS NULL OR status = '' THEN 'draft'
    ELSE status
END;

-- Étape 4 : Convertir la colonne en ENUM
ALTER TABLE consultations
ALTER COLUMN status TYPE consultation_status
USING status::text::consultation_status;

-- (Optionnel) Étape 5 : Vérification manuelle (à commenter après usage)
-- SELECT DISTINCT status FROM consultations;
