/*
  # Ajout d'un administrateur au Cabinet Vision Plus

  1. Modifications
    - Ajout d'un membre du personnel avec le rôle administrateur
  
  2. Sécurité
    - Utilise les politiques RLS existantes
*/

DO $$ 
DECLARE
  clinic_id uuid;
BEGIN
  -- Récupérer l'ID de la clinique
  SELECT id INTO clinic_id FROM clinics WHERE name = 'Cabinet Vision Plus';

  -- Insérer l'administrateur
  INSERT INTO clinic_staff (clinic_id, name, role, email)
  VALUES (
    clinic_id,
    'Jean Dupont',
    'admin',
    'admin@vision-plus.fr'
  );
END $$;