-- Créer le type ENUM si il n’existe pas déjà (idempotent)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consultation_status') THEN
        CREATE TYPE consultation_status AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'paid');
    END IF;
END $$;

-- Supprimer tous les 'submitted' (sécurité)
UPDATE consultations
SET status = 'sent'
WHERE status = 'submitted';

-- Normaliser les valeurs existantes
UPDATE consultations
SET status = CASE
    WHEN status ILIKE 'completed' THEN 'paid'
    WHEN status ILIKE 'pending' THEN 'sent'
    WHEN status IS NULL OR status = '' THEN 'draft'
    ELSE status
END;

-- Modifier la colonne pour utiliser l'ENUM
ALTER TABLE consultations
ALTER COLUMN status TYPE consultation_status
USING status::text::consultation_status;
