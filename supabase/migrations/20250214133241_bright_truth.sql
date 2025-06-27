/*
  # Correction du schéma de la base de données

  1. Ajout des colonnes manquantes
    - Ajout de la colonne 'type' à la table consultations
    - Ajout de la colonne 'medical_reports' à la table consultations
  
  2. Modifications
    - Mise à jour des contraintes de type pour la colonne 'type'
    - Ajout d'index pour améliorer les performances
*/

-- Ajout de la colonne type à la table consultations
ALTER TABLE consultations 
ADD COLUMN IF NOT EXISTS type text CHECK (type IN ('routine', 'urgence', 'suivi', 'chirurgie', 'examen'));

-- Ajout de la colonne medical_reports à la table consultations
ALTER TABLE consultations 
ADD COLUMN IF NOT EXISTS medical_reports jsonb;

-- Ajout d'index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_consultations_type ON consultations(type);
CREATE INDEX IF NOT EXISTS idx_consultations_medical_reports ON consultations USING gin(medical_reports);

-- Mise à jour des politiques RLS
DROP POLICY IF EXISTS "anyone can read consultations" ON consultations;
DROP POLICY IF EXISTS "authenticated can insert consultations" ON consultations;
DROP POLICY IF EXISTS "authenticated can update consultations" ON consultations;
DROP POLICY IF EXISTS "authenticated can delete consultations" ON consultations;

CREATE POLICY "anyone can read consultations"
  ON consultations FOR SELECT
  USING (true);

CREATE POLICY "authenticated can insert consultations"
  ON consultations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated can update consultations"
  ON consultations FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "authenticated can delete consultations"
  ON consultations FOR DELETE
  TO authenticated
  USING (true);