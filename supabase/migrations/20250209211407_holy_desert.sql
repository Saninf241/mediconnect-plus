/*
  # Ajout de la table des rendez-vous

  1. Nouvelle Table
    - `appointments`
      - `id` (uuid, clé primaire)
      - `patient_id` (uuid, référence vers patients)
      - `doctor_id` (uuid, référence vers clinic_staff)
      - `clinic_id` (uuid, référence vers clinics)
      - `date` (date)
      - `scheduled_time` (time)
      - `actual_start_time` (time, nullable)
      - `service` (text)
      - `type` (text)
      - `requires_hospitalization` (boolean)
      - `hospitalization_duration` (integer)
      - `status` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Sécurité
    - Activation de RLS
    - Politiques pour lecture/écriture authentifiée
*/

-- Création de la table appointments
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id),
  doctor_id uuid REFERENCES clinic_staff(id),
  clinic_id uuid REFERENCES clinics(id),
  date date NOT NULL,
  scheduled_time time NOT NULL,
  actual_start_time time,
  service text,
  type text NOT NULL CHECK (type IN ('consultation', 'suivi', 'urgence', 'chirurgie', 'examen')),
  requires_hospitalization boolean DEFAULT false,
  hospitalization_duration integer,
  status text NOT NULL CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ajout de la contrainte pour hospitalization_duration
ALTER TABLE appointments 
  ADD CONSTRAINT check_hospitalization_duration 
  CHECK (
    (requires_hospitalization = false AND hospitalization_duration IS NULL) OR
    (requires_hospitalization = true AND hospitalization_duration > 0)
  );

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Activation de RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Politiques RLS
CREATE POLICY "anyone can read appointments"
  ON appointments FOR SELECT
  USING (true);

CREATE POLICY "authenticated can insert appointments"
  ON appointments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated can update appointments"
  ON appointments FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "authenticated can delete appointments"
  ON appointments FOR DELETE
  TO authenticated
  USING (true);

-- Index pour améliorer les performances des requêtes fréquentes
CREATE INDEX idx_appointments_date ON appointments(date);
CREATE INDEX idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_clinic_id ON appointments(clinic_id);
CREATE INDEX idx_appointments_status ON appointments(status);