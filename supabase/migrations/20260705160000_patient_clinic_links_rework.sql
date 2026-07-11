-- Active patient_clinic_links comme vraie relation many-to-many
-- "ce patient a été vu dans ces cliniques". Jusqu'ici cette table existait
-- en base mais n'était ni lue ni écrite par le code applicatif, et sa FK
-- pointait vers etablissements (table morte, aucun usage applicatif) au
-- lieu de clinics (le modèle clinique réellement utilisé partout ailleurs).
--
-- IMPORTANT avant d'appliquer : vérifier le nom réel de la contrainte FK
-- existante sur patient_clinic_links.clinic_id, car cette table n'est pas
-- dans les migrations trackées et son nom a pu diverger du défaut Postgres :
--
--   select conname, conrelid::regclass, confrelid::regclass
--   from pg_constraint
--   where conrelid = 'patient_clinic_links'::regclass and contype = 'f';
--
-- Ajuster le nom ci-dessous si besoin avant de rejouer.
--
-- NOTE : rel est contrainte par un CHECK existant sur les valeurs
-- ('visit', 'home', 'referral') — confirmé via
--   select pg_get_constraintdef(oid) from pg_constraint
--   where conname = 'patient_clinic_links_rel_check';
-- On réutilise donc 'visit' (vu en clinique via une consultation) et
-- 'home' (clinique d'enregistrement initial) plutôt que d'inventer de
-- nouvelles valeurs.

-- Corrige la FK de patient_clinic_links.clinic_id vers clinics.
alter table patient_clinic_links
  drop constraint if exists patient_clinic_links_clinic_id_fkey;

alter table patient_clinic_links
  add constraint patient_clinic_links_clinic_id_fkey
  foreign key (clinic_id) references clinics(id);

-- Un seul lien par couple (patient, clinique) : permet des upserts idempotents.
create unique index if not exists patient_clinic_links_patient_clinic_key
  on patient_clinic_links(patient_id, clinic_id);

-- Alimente automatiquement patient_clinic_links dès qu'une consultation relie
-- un patient à une clinique — le signal le plus fiable de "patient vu ici",
-- indépendant de quel code (RPC opaque ou futur) a créé le patient.
create or replace function fn_link_patient_clinic_from_consultation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.patient_id is not null and new.clinic_id is not null then
    insert into patient_clinic_links (patient_id, clinic_id, rel)
    values (new.patient_id, new.clinic_id, 'visit')
    on conflict (patient_id, clinic_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_link_patient_clinic_on_consultation on consultations;
create trigger trg_link_patient_clinic_on_consultation
  after insert or update of patient_id, clinic_id on consultations
  for each row
  execute function fn_link_patient_clinic_from_consultation();

-- Alimente aussi dès la création du patient (couvre les fiches sans
-- consultation encore, ex. brouillon secrétaire).
create or replace function fn_link_patient_clinic_from_patient()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.clinic_id is not null then
    insert into patient_clinic_links (patient_id, clinic_id, rel)
    values (new.id, new.clinic_id, 'home')
    on conflict (patient_id, clinic_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_link_patient_clinic_on_patient_insert on patients;
create trigger trg_link_patient_clinic_on_patient_insert
  after insert on patients
  for each row
  execute function fn_link_patient_clinic_from_patient();

-- Backfill : peuple la table depuis l'historique existant.
insert into patient_clinic_links (patient_id, clinic_id, rel)
select distinct c.patient_id, c.clinic_id, 'visit'
from consultations c
where c.patient_id is not null and c.clinic_id is not null
on conflict (patient_id, clinic_id) do nothing;

insert into patient_clinic_links (patient_id, clinic_id, rel)
select p.id, p.clinic_id, 'home'
from patients p
where p.clinic_id is not null
on conflict (patient_id, clinic_id) do nothing;

-- Active RLS par défaut (comme les autres tables sensibles du schéma) ;
-- pas de policy pour l'instant, accès via service role / RPC uniquement.
alter table patient_clinic_links enable row level security;
