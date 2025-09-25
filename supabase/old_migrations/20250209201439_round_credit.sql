/*
  # Add exceptional biometric access for clinic staff

  1. Schema Changes
    - Add `exceptional_biometric_access` boolean column to clinic_staff table
  
  2. Data Updates
    - Set exceptional_biometric_access to true for all doctors in Cabinet Vision Plus
*/

-- Ajout de la colonne exceptional_biometric_access
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clinic_staff' AND column_name = 'exceptional_biometric_access'
  ) THEN
    ALTER TABLE clinic_staff 
    ADD COLUMN exceptional_biometric_access boolean DEFAULT false;
  END IF;
END $$;

-- Attribution de l'accès exceptionnel aux médecins du Cabinet Vision Plus
DO $$ 
DECLARE
  target_clinic_id uuid;
BEGIN
  -- Récupérer l'ID du Cabinet Vision Plus
  SELECT id INTO target_clinic_id 
  FROM clinics 
  WHERE name = 'Cabinet Vision Plus';

  -- Mettre à jour les médecins de la clinique
  IF target_clinic_id IS NOT NULL THEN
    UPDATE clinic_staff 
    SET exceptional_biometric_access = true
    WHERE clinic_id = target_clinic_id 
    AND role = 'doctor';
  END IF;
END $$;