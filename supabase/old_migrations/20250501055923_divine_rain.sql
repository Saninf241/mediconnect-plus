/*
  # Add ACME Assurances to etablissements

  1. Changes
    - Add ACME Assurances as an assureur
    - Add unique constraint on nom to handle duplicates
    - Add email validation
*/

-- First add unique constraint on nom if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'etablissements_nom_key'
  ) THEN
    ALTER TABLE etablissements 
    ADD CONSTRAINT etablissements_nom_key UNIQUE (nom);
  END IF;
END $$;

-- Add email column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'etablissements' AND column_name = 'email'
  ) THEN
    ALTER TABLE etablissements 
    ADD COLUMN email text;

    -- Add email validation
    ALTER TABLE etablissements
    ADD CONSTRAINT valid_email 
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
  END IF;
END $$;

-- Now we can safely insert with ON CONFLICT
INSERT INTO etablissements (nom, type, email)
VALUES ('ACME Assurances', 'assureur', 'acme@mediconnect.com')
ON CONFLICT (nom) DO NOTHING;