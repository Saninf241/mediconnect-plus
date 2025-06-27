/*
  # Add assurer role support

  1. Changes
    - Add "assurer" as valid role in clinic_staff table
    - Update existing role check constraint
*/

ALTER TABLE clinic_staff 
DROP CONSTRAINT IF EXISTS clinic_staff_role_check;

ALTER TABLE clinic_staff 
ADD CONSTRAINT clinic_staff_role_check 
CHECK (role IN ('doctor', 'admin', 'secretary', 'assurer'));