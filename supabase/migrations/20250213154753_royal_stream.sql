/*
  # Mise à jour des tables pour la gestion des assurances

  1. Modifications de la table patients
    - Ajout des champs pour la gestion des assurances
    - Ajout des contraintes de validation
    - Ajout des index pour les performances

  2. Modifications de la table consultations
    - Ajout des champs pour la facturation
    - Ajout des champs pour les codes CIM et CCAM
    - Ajout des contraintes et index
*/

-- Mise à jour de la table patients
ALTER TABLE patients
ADD COLUMN insurance_provider text CHECK (insurance_provider IN ('CNAMGS', 'Ascoma', 'Gras Savoye', null)),
ADD COLUMN insurance_type text CHECK (insurance_type IN ('insured', 'dependent', null)),
ADD COLUMN insurance_expiry date,
ADD COLUMN insurance_status text CHECK (insurance_status IN ('active', 'expired', 'suspended', null));

-- Mise à jour de la table consultations
ALTER TABLE consultations
ADD COLUMN insurance_coverage jsonb,
ADD COLUMN billing_details jsonb,
ADD COLUMN icd_codes text[],
ADD COLUMN ccam_codes text[],
ADD COLUMN ticket_type text CHECK (ticket_type IN ('full', 'full_ald', 'exempt', null)),
ADD COLUMN third_party_accident boolean DEFAULT false,
ADD COLUMN accident_date date;

-- Ajout des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_patients_insurance ON patients(insurance_provider) WHERE insurance_provider IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_patients_insurance_status ON patients(insurance_status) WHERE insurance_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_consultations_ticket ON consultations(ticket_type) WHERE ticket_type IS NOT NULL;

-- Mise à jour des contraintes pour la cohérence des données
ALTER TABLE consultations
ADD CONSTRAINT check_accident_date 
CHECK (
  (third_party_accident = false AND accident_date IS NULL) OR
  (third_party_accident = true AND accident_date IS NOT NULL)
);

-- Ajout de la table pour les codes médicaux standards
CREATE TABLE IF NOT EXISTS medical_standard_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_type text NOT NULL CHECK (code_type IN ('ICD-10', 'CCAM')),
  code text NOT NULL,
  description text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (code_type, code)
);

-- Activation de RLS pour la nouvelle table
ALTER TABLE medical_standard_codes ENABLE ROW LEVEL SECURITY;

-- Ajout des politiques RLS pour medical_standard_codes
CREATE POLICY "Anyone can read medical codes"
  ON medical_standard_codes
  FOR SELECT
  USING (true);

-- Insertion de quelques codes d'exemple
INSERT INTO medical_standard_codes (code_type, code, description) VALUES
  ('ICD-10', 'E11', 'Diabète de type 2'),
  ('ICD-10', 'I10', 'Hypertension essentielle'),
  ('ICD-10', 'J45', 'Asthme'),
  ('CCAM', 'QZRB001', 'Séance d''acupuncture'),
  ('CCAM', 'BGQP002', 'Électrocardiographie sur au moins 12 dérivations'),
  ('CCAM', 'YYYY010', 'Traitement de première intention d''une lésion dentaire')
ON CONFLICT (code_type, code) DO NOTHING;