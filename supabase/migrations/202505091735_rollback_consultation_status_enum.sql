-- Étape 1 : Revenir au type TEXT pour la colonne status
ALTER TABLE consultations
ALTER COLUMN status TYPE text
USING status::text;

-- Étape 2 : Supprimer le type ENUM
DO $$ BEGIN
  DROP TYPE IF EXISTS consultation_status;
EXCEPTION
  WHEN dependent_objects_still_exist THEN
    RAISE NOTICE 'Type consultation_status non supprimé car encore utilisé.';
END $$;
