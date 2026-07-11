-- patient_clinic_links a RLS activé sans policy (accès verrouillé par
-- défaut, cf. 20260705160000_patient_clinic_links_rework.sql). Les fonctions
-- trigger qui y écrivent s'exécutaient jusqu'ici avec les droits de
-- l'appelant (le rôle "authenticated" utilisé par l'app), qui n'a aucun
-- droit dessus : l'insert dans le trigger échouait avec une violation RLS,
-- ce qui faisait échouer la création de la consultation/patient elle-même.
--
-- SECURITY DEFINER fait tourner ces fonctions avec les droits de leur
-- propriétaire (qui contourne RLS), et search_path est figé pour éviter
-- tout détournement sur une fonction à privilèges élevés.
alter function fn_link_patient_clinic_from_consultation() security definer;
alter function fn_link_patient_clinic_from_consultation() set search_path = public, pg_temp;

alter function fn_link_patient_clinic_from_patient() security definer;
alter function fn_link_patient_clinic_from_patient() set search_path = public, pg_temp;
