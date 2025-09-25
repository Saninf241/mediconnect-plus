/*
  # Ajout des cliniques et spécialistes

  1. Nouvelles Tables
    - `clinics`
      - `id` (uuid, primary key)
      - `name` (text)
      - `type` (text) - 'clinic' ou 'specialist_office'
      - `address` (text)
      - `phone` (text)
      - `created_at` (timestamp)
    - `specialists`
      - `id` (uuid, primary key)
      - `clinic_id` (uuid, foreign key)
      - `name` (text)
      - `speciality` (text)
      - `license_number` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create clinics table
CREATE TABLE IF NOT EXISTS clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('clinic', 'specialist_office')),
  address text NOT NULL,
  phone text,
  theme jsonb DEFAULT '{"primary": "#4F46E5", "secondary": "#818CF8"}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create specialists table
CREATE TABLE IF NOT EXISTS specialists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  speciality text NOT NULL,
  license_number text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE specialists ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Allow authenticated users to read clinics"
  ON clinics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to read specialists"
  ON specialists FOR SELECT
  TO authenticated
  USING (true);

-- Insert sample data
INSERT INTO clinics (id, name, type, address, phone, theme) VALUES
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Centre Médical Saint-Louis', 'clinic', '15 Avenue des Champs-Élysées, Paris', '+33 1 23 45 67 89', '{"primary": "#4F46E5", "secondary": "#818CF8"}'::jsonb),
  ('550e8400-e29b-41d4-a716-446655440000', 'Cabinet du Dr. Martin - Ophtalmologie', 'specialist_office', '28 Rue du Commerce, Lyon', '+33 4 56 78 90 12', '{"primary": "#059669", "secondary": "#34D399"}'::jsonb);

-- Insert specialists
INSERT INTO specialists (clinic_id, name, speciality, license_number) VALUES
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Dr. Sophie Dubois', 'Cardiologie', 'CARD-2025-001'),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Dr. Jean Moreau', 'Pédiatrie', 'PED-2025-002'),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Dr. Marie Laurent', 'Dermatologie', 'DERM-2025-003'),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Dr. Pierre Leroy', 'Rhumatologie', 'RHUM-2025-004'),
  ('550e8400-e29b-41d4-a716-446655440000', 'Dr. Claire Martin', 'Ophtalmologie', 'OPHT-2025-005'),
  ('550e8400-e29b-41d4-a716-446655440000', 'Dr. Thomas Bernard', 'Ophtalmologie', 'OPHT-2025-006');