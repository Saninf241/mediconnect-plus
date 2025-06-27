/*
  # Create etablissements table

  1. New Table
    - `etablissements`
      - `id` (uuid, primary key)
      - `nom` (text)
      - `type` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

CREATE TABLE IF NOT EXISTS etablissements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  type text NOT NULL CHECK (type IN ('assureur', 'clinique')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE etablissements ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "anyone can read etablissements"
  ON etablissements FOR SELECT
  USING (true);

CREATE POLICY "authenticated can insert etablissements"
  ON etablissements FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated can update etablissements"
  ON etablissements FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "authenticated can delete etablissements"
  ON etablissements FOR DELETE
  TO authenticated
  USING (true);

-- Add index for type column
CREATE INDEX idx_etablissements_type ON etablissements(type);