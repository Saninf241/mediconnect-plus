/*
  # Mise à jour du schéma pour la gestion du personnel des cliniques

  1. Modifications de la table clinics
    - Ajout de la colonne code
    - Ajout de la colonne siret
    - Ajout de la colonne speciality

  2. Nouvelle Table
    - `clinic_staff`
      - `id` (uuid, primary key)
      - `clinic_id` (uuid, référence vers clinics)
      - `name` (text)
      - `role` (text)
      - `speciality` (text, pour les médecins)
      - `license_number` (text, pour les médecins)
      - `email` (text)
      - `created_at` (timestamp)

  3. Sécurité
    - Enable RLS sur clinic_staff
    - Ajout des politiques de sécurité pour clinic_staff
*/

-- Ajout des colonnes à la table clinics
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinics' AND column_name = 'code') THEN
    ALTER TABLE clinics ADD COLUMN code text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinics' AND column_name = 'siret') THEN
    ALTER TABLE clinics ADD COLUMN siret text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinics' AND column_name = 'speciality') THEN
    ALTER TABLE clinics ADD COLUMN speciality text;
  END IF;
END $$;

-- Création de la table clinic_staff
CREATE TABLE IF NOT EXISTS clinic_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('doctor', 'admin', 'secretary')),
  speciality text,
  license_number text,
  email text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Activation de RLS
ALTER TABLE clinic_staff ENABLE ROW LEVEL SECURITY;

-- Politiques de sécurité pour clinic_staff
CREATE POLICY "Allow authenticated users to read clinic_staff"
  ON clinic_staff
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert clinic_staff"
  ON clinic_staff
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update clinic_staff"
  ON clinic_staff
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);