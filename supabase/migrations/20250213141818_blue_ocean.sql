/*
  # Patient Authentication System

  1. New Tables
    - `patient_auth`
      - `id` (uuid, primary key)
      - `patient_id` (uuid, references patients)
      - `email` (text, unique)
      - `password_hash` (text)
      - `reset_token` (text)
      - `reset_token_expires` (timestamptz)
      - `last_login` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `patient_auth` table
    - Add policies for secure access
*/

-- Create patient_auth table
CREATE TABLE IF NOT EXISTS patient_auth (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  reset_token text,
  reset_token_expires timestamptz,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Enable RLS
ALTER TABLE patient_auth ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Patients can view their own auth data"
  ON patient_auth
  FOR SELECT
  TO authenticated
  USING (auth.uid() = patient_id);

CREATE POLICY "Patients can update their own auth data"
  ON patient_auth
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

-- Create indexes
CREATE INDEX idx_patient_auth_email ON patient_auth(email);
CREATE INDEX idx_patient_auth_patient_id ON patient_auth(patient_id);

-- Create trigger for updated_at
CREATE TRIGGER update_patient_auth_updated_at
  BEFORE UPDATE ON patient_auth
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();