/*
  # Mise à jour des contraintes de la table clinics

  1. Modifications de la table
    - Mise à jour des données existantes avec des valeurs uniques
    - Ajout des contraintes NOT NULL
    - Ajout des contraintes d'unicité
  
  2. Sécurité
    - Mise à jour des politiques RLS pour la table clinics
*/

-- Mise à jour des données existantes avec des valeurs uniques
UPDATE clinics 
SET 
  code = CASE 
    WHEN code IS NULL OR code = '' 
    THEN 'CODE-' || id::text
    ELSE code 
  END,
  siret = CASE 
    WHEN siret IS NULL OR siret = '' OR siret = '00000000000000'
    THEN LPAD(FLOOR(RANDOM() * 100000000000000)::text, 14, '0')
    ELSE siret 
  END;

-- Ajout des valeurs par défaut
ALTER TABLE clinics
  ALTER COLUMN code SET DEFAULT '',
  ALTER COLUMN siret SET DEFAULT '';

-- Ajout des contraintes NOT NULL
ALTER TABLE clinics
  ALTER COLUMN code SET NOT NULL,
  ALTER COLUMN siret SET NOT NULL;

-- Ajout des contraintes d'unicité avec vérification
DO $$ 
BEGIN
  -- Ajout de la contrainte d'unicité pour code
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'clinics_code_unique'
  ) THEN
    -- Vérification des doublons avant d'ajouter la contrainte
    IF NOT EXISTS (
      SELECT code, COUNT(*)
      FROM clinics
      GROUP BY code
      HAVING COUNT(*) > 1
    ) THEN
      ALTER TABLE clinics ADD CONSTRAINT clinics_code_unique UNIQUE (code);
    END IF;
  END IF;

  -- Ajout de la contrainte d'unicité pour siret
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'clinics_siret_unique'
  ) THEN
    -- Vérification des doublons avant d'ajouter la contrainte
    IF NOT EXISTS (
      SELECT siret, COUNT(*)
      FROM clinics
      GROUP BY siret
      HAVING COUNT(*) > 1
    ) THEN
      ALTER TABLE clinics ADD CONSTRAINT clinics_siret_unique UNIQUE (siret);
    END IF;
  END IF;
END $$;

-- Mise à jour des politiques RLS
DROP POLICY IF EXISTS "Allow authenticated users to read clinics" ON clinics;
DROP POLICY IF EXISTS "Allow authenticated users to insert clinics" ON clinics;
DROP POLICY IF EXISTS "Allow authenticated users to update clinics" ON clinics;

-- Création des nouvelles politiques
CREATE POLICY "Enable read access for authenticated users"
  ON clinics
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert access for authenticated users"
  ON clinics
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users"
  ON clinics
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete access for authenticated users"
  ON clinics
  FOR DELETE
  TO authenticated
  USING (true);