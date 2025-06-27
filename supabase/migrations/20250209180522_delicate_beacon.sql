/*
  # Ajout d'un nouvel établissement ophtalmologique
  
  1. Nouvel établissement
    - Cabinet d'ophtalmologie avec informations complètes
  
  2. Personnel
    - Un ophtalmologue
    - Une secrétaire médicale
*/

-- Insérer le nouvel établissement
INSERT INTO clinics (name, type, code, address, siret, speciality, phone)
VALUES (
  'Cabinet Vision Plus',
  'specialist_office',
  'VISION-2025',
  '15 Avenue des Lumières, 75008 Paris',
  '12345678901234',
  'Ophtalmologie',
  '01 23 45 67 89'
);

-- Récupérer l'ID de la clinique
DO $$ 
DECLARE
  clinic_id uuid;
BEGIN
  SELECT id INTO clinic_id FROM clinics WHERE name = 'Cabinet Vision Plus';

  -- Insérer l'ophtalmologue
  INSERT INTO clinic_staff (clinic_id, name, role, speciality, license_number, email)
  VALUES (
    clinic_id,
    'Dr. Marie Lambert',
    'doctor',
    'Ophtalmologie',
    'OPHT-2025-789',
    'dr.lambert@vision-plus.fr'
  );

  -- Insérer la secrétaire
  INSERT INTO clinic_staff (clinic_id, name, role, email)
  VALUES (
    clinic_id,
    'Sophie Martin',
    'secretary',
    'secretariat@vision-plus.fr'
  );
END $$;