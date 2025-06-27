/*
  # Fix RLS policies for clinics table

  1. Security Changes
    - Drop existing policies
    - Create new policies with proper permissions
    - Enable RLS if not already enabled
*/

-- Ensure RLS is enabled
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON clinics;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON clinics;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON clinics;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON clinics;
DROP POLICY IF EXISTS "Allow authenticated users to read clinics" ON clinics;
DROP POLICY IF EXISTS "Allow authenticated users to insert clinics" ON clinics;
DROP POLICY IF EXISTS "Allow authenticated users to update clinics" ON clinics;

-- Create new policies with proper permissions
CREATE POLICY "clinics_select_policy"
  ON clinics
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "clinics_insert_policy"
  ON clinics
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "clinics_update_policy"
  ON clinics
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "clinics_delete_policy"
  ON clinics
  FOR DELETE
  TO authenticated
  USING (true);