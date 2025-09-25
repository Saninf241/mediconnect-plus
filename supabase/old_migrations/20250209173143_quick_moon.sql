/*
  # Fix RLS policies for all tables

  1. Security Changes
    - Drop and recreate all RLS policies for clinics table
    - Drop and recreate all RLS policies for clinic_staff table
    - Enable RLS on both tables
    - Set proper security policies for all operations

  2. Changes
    - Simplified policy structure
    - Clear policy names
    - Consistent policy patterns across tables
*/

-- Reset and fix clinics table policies
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clinics_select_policy" ON clinics;
DROP POLICY IF EXISTS "clinics_insert_policy" ON clinics;
DROP POLICY IF EXISTS "clinics_update_policy" ON clinics;
DROP POLICY IF EXISTS "clinics_delete_policy" ON clinics;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON clinics;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON clinics;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON clinics;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON clinics;
DROP POLICY IF EXISTS "Allow authenticated users to read clinics" ON clinics;
DROP POLICY IF EXISTS "Allow authenticated users to insert clinics" ON clinics;
DROP POLICY IF EXISTS "Allow authenticated users to update clinics" ON clinics;

CREATE POLICY "anyone can read clinics"
  ON clinics FOR SELECT
  USING (true);

CREATE POLICY "authenticated can insert clinics"
  ON clinics FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated can update clinics"
  ON clinics FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "authenticated can delete clinics"
  ON clinics FOR DELETE
  TO authenticated
  USING (true);

-- Reset and fix clinic_staff table policies
ALTER TABLE clinic_staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read clinic_staff" ON clinic_staff;
DROP POLICY IF EXISTS "Allow authenticated users to insert clinic_staff" ON clinic_staff;
DROP POLICY IF EXISTS "Allow authenticated users to update clinic_staff" ON clinic_staff;

CREATE POLICY "anyone can read clinic_staff"
  ON clinic_staff FOR SELECT
  USING (true);

CREATE POLICY "authenticated can insert clinic_staff"
  ON clinic_staff FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated can update clinic_staff"
  ON clinic_staff FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "authenticated can delete clinic_staff"
  ON clinic_staff FOR DELETE
  TO authenticated
  USING (true);