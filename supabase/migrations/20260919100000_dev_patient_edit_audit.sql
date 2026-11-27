-- Filet de secours espace developpeur : correction d'une fiche patient
-- quand aucun staff actif ne peut le faire depuis le cabinet (cabinet
-- ferme, staff parti). Le secretariat a deja un modal d'edition
-- (SecretaryPatientsPage.tsx) mais il est scope par clinic_id + RLS -- ca
-- ne marche que s'il existe encore un compte staff actif sur ce cabinet.
--
-- Cette table ne sert qu'a la tracabilite : contrairement a
-- merge_patients() (20260712130000) dont l'actor_email ne finit que dans
-- le JSON de reponse ephemere, chaque edition dev est ici persistee
-- (acteur, champ, ancienne/nouvelle valeur, motif). Ecrite uniquement par
-- l'edge function dev-manage-patients via service_role (meme garde-fou que
-- le reste des routes dev-* : verification manuelle de
-- publicMetadata.role === "developer" cote Clerk, pas de policy RLS pour
-- un role "developer" qui n'existe pas dans ce schema).
create table if not exists dev_patient_edits (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id),
  actor_email text,
  field text not null,
  old_value text,
  new_value text,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists dev_patient_edits_patient_id_idx
  on dev_patient_edits(patient_id);

alter table dev_patient_edits enable row level security;
-- Aucune policy : ni les patients, ni le staff clinique/assureur n'ont a
-- voir cette table. Seule la service_role (edge function) y ecrit/lit.
