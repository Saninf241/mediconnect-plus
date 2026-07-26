-- Permet aux patients de soumettre des tickets support (jusqu'ici reserve
-- au staff clinique/assureur via Clerk). Les patients utilisent Supabase
-- Auth natif (telephone+OTP), pas Clerk -- created_by_clerk_user_id ne
-- peut donc pas etre renseigne pour eux. On assouplit la contrainte et on
-- ajoute une reference explicite vers patients pour la tracabilite/le
-- futur affichage "mes tickets" cote patient.
alter table support_tickets
  alter column created_by_clerk_user_id drop not null;

alter table support_tickets
  add column if not exists created_by_patient_id uuid references patients(id);

create index if not exists support_tickets_patient_idx
  on support_tickets(created_by_patient_id)
  where created_by_patient_id is not null;

-- Ces deux contraintes bloquaient un insert cote patient tel quel :
-- created_by_role n'autorisait pas 'patient', et owner_check exigeait
-- clinic_id OU insurer_id (un ticket patient n'a ni l'un ni l'autre).
alter table support_tickets drop constraint support_tickets_created_by_role_check;
alter table support_tickets add constraint support_tickets_created_by_role_check
  check (created_by_role = ANY (ARRAY['doctor','secretary','admin','assureur','patient']));

alter table support_tickets drop constraint support_tickets_owner_check;
alter table support_tickets add constraint support_tickets_owner_check
  check (clinic_id is not null or insurer_id is not null or created_by_patient_id is not null);
