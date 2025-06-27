/*
  # Ajout des tables pour l'historique détaillé des consultations

  1. Nouvelles Tables
    - `consultation_examinations`: Table de jonction pour les examens prescrits
      - `id` (uuid, primary key)
      - `consultation_id` (uuid, foreign key)
      - `name` (text)
      - `category` (text)
      - `status` (text)
      - `results` (text)
      - `created_at` (timestamptz)
    
    - `consultation_medications`: Table de jonction pour les médicaments prescrits
      - `id` (uuid, primary key)
      - `consultation_id` (uuid, foreign key)
      - `name` (text)
      - `dosage` (text)
      - `form` (text)
      - `duration` (text)
      - `instructions` (text)
      - `created_at` (timestamptz)

  2. Sécurité
    - Enable RLS sur les nouvelles tables
    - Ajout des politiques de sécurité pour l'accès authentifié
*/

-- Table pour les examens prescrits lors des consultations
CREATE TABLE IF NOT EXISTS consultation_examinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid REFERENCES consultations(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  results text,
  created_at timestamptz DEFAULT now()
);

-- Table pour les médicaments prescrits lors des consultations
CREATE TABLE IF NOT EXISTS consultation_medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid REFERENCES consultations(id) ON DELETE CASCADE,
  name text NOT NULL,
  dosage text NOT NULL,
  form text NOT NULL,
  duration text,
  instructions text,
  created_at timestamptz DEFAULT now()
);

-- Activation de RLS
ALTER TABLE consultation_examinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_medications ENABLE ROW LEVEL SECURITY;

-- Politiques pour consultation_examinations
CREATE POLICY "anyone can read consultation_examinations"
  ON consultation_examinations FOR SELECT
  USING (true);

CREATE POLICY "authenticated can insert consultation_examinations"
  ON consultation_examinations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated can update consultation_examinations"
  ON consultation_examinations FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "authenticated can delete consultation_examinations"
  ON consultation_examinations FOR DELETE
  TO authenticated
  USING (true);

-- Politiques pour consultation_medications
CREATE POLICY "anyone can read consultation_medications"
  ON consultation_medications FOR SELECT
  USING (true);

CREATE POLICY "authenticated can insert consultation_medications"
  ON consultation_medications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated can update consultation_medications"
  ON consultation_medications FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "authenticated can delete consultation_medications"
  ON consultation_medications FOR DELETE
  TO authenticated
  USING (true);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_consultation_examinations_consultation 
  ON consultation_examinations(consultation_id);

CREATE INDEX IF NOT EXISTS idx_consultation_medications_consultation 
  ON consultation_medications(consultation_id);