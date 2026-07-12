-- RLS hardening — step 2/2 (DESTRUCTIF).
--
-- NE PAS APPLIQUER avant d'avoir verifie en conditions reelles que l'app
-- fonctionne toujours avec les policies scopees ajoutees a l'etape 1
-- (20260712140000_rls_hardening_step1_add_scoped_policies.sql) :
--   - secretaire : creer/lire/modifier un patient de son cabinet
--   - medecin : creer/lire/modifier une consultation de son cabinet
--   - admin cabinet : gestion du staff (deja couvert par admin_whitelist_*)
--   - assureur : lire/mettre a jour une consultation liee a son dossier
--   - dev-create-clinic / dev-create-insurer (Edge Functions, service role,
--     non affectees par RLS de toute facon)
--
-- Cette migration supprime les policies grand-ouvertes qui rendaient les
-- policies scopees inutiles (OR permissif). Apres cette migration, un
-- compte sans ligne clinic_staff/insurer_staff correspondante (y compris
-- un compte "developer") n'a plus aucun acces a patients/consultations, et
-- la cle anon seule (sans JWT valide et sans appartenance) ne renvoie plus
-- rien.

-- clinic_staff
drop policy if exists "anyone can read clinic_staff" on clinic_staff;
drop policy if exists "authenticated can delete clinic_staff" on clinic_staff;
drop policy if exists "authenticated can insert clinic_staff" on clinic_staff;
drop policy if exists "authenticated can update clinic_staff" on clinic_staff;
drop policy if exists "p_select_clinic_staff_public" on clinic_staff;

-- consultations
drop policy if exists "allow doctor read" on consultations;
drop policy if exists "anyone can read consultations" on consultations;
drop policy if exists "authenticated can delete consultations" on consultations;
drop policy if exists "authenticated can insert consultations" on consultations;
drop policy if exists "authenticated can update consultations" on consultations;
drop policy if exists "public can insert consultations (mvp)" on consultations;
drop policy if exists "public can update consultations (mvp)" on consultations;

-- patients
drop policy if exists "Allow authenticated users to insert patients" on patients;
drop policy if exists "Allow authenticated users to read patients" on patients;
drop policy if exists "Allow authenticated users to update their patients" on patients;
drop policy if exists "dev_all_roles_can_read_patients" on patients;

-- Note : "Allow doctors to see their own consultations" (auth.uid() =
-- doctor_id) et "doctor_can_read_patient_if_consultation_links" ne sont
-- PAS supprimees ici : elles sont deja scopees (pas un trou de securite),
-- on les laisse en place par prudence. A verifier plus tard si elles sont
-- redondantes avec les nouvelles policies clinic_staff_*.

-- Note : aucune policy DELETE ne subsiste sur consultations apres cette
-- migration (suppression medicale = non self-service par defaut). Si un
-- flux de suppression existe reellement dans l'app, dis-le moi et
-- j'ajouterai une policy scopee (ex: admin cabinet uniquement) au lieu de
-- la laisser fermee.
