/*
  # Liaison de l'empreinte biométrique au compte développeur

  1. Modifications
    - Ajout de l'ID biométrique BIO123 au membre du personnel nkopierre3@gmail.com
    
  2. Sécurité
    - Mise à jour sécurisée avec vérification de l'existence de l'utilisateur
*/

DO $$ 
DECLARE
  staff_id uuid;
BEGIN
  -- Récupérer l'ID du membre du personnel
  SELECT id INTO staff_id 
  FROM clinic_staff 
  WHERE email = 'nkopierre3@gmail.com';

  -- Mettre à jour l'ID biométrique s'il existe
  IF staff_id IS NOT NULL THEN
    UPDATE clinic_staff 
    SET biometric_id = 'BIO123'
    WHERE id = staff_id;
  END IF;
END $$;