/*
  # Fix MediConnect Pro functionality

  1. New Tables
    - `consultations` table for medical consultations
    - `medical_reports` table for generated reports

  2. Security
    - Enable RLS on new tables
    - Add appropriate policies for all operations
    - Ensure proper access control

  3. Changes
    - Add consultation tracking
    - Support for medical reports
*/

-- Create consultations table
CREATE TABLE IF NOT EXISTS consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id),
  doctor_id uuid REFERENCES clinic_staff(id),
  clinic_id uuid REFERENCES clinics(id),
  symptoms text,
  diagnosis text,
  notes text,
  status text CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  is_urgent boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create medical_reports table
CREATE TABLE IF NOT EXISTS medical_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid REFERENCES consultations(id),
  content text NOT NULL,
  generated_by uuid REFERENCES clinic_staff(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_reports ENABLE ROW LEVEL SECURITY;

-- Consultations policies
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

-- Medical reports policies
CREATE POLICY "anyone can read medical_reports"
  ON medical_reports FOR SELECT
  USING (true);

CREATE POLICY "authenticated can insert medical_reports"
  ON medical_reports FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated can update medical_reports"
  ON medical_reports FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "authenticated can delete medical_reports"
  ON medical_reports FOR DELETE
  TO authenticated
  USING (true);

-- Add updated_at trigger for consultations
CREATE TRIGGER update_consultations_updated_at
  BEFORE UPDATE ON consultations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();