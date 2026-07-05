-- Espace patient : liaison entre une fiche "patients" (créée en clinique) et un
-- compte Supabase Auth (téléphone + OTP) appartenant au patient lui-même.
--
-- Un patient ne peut activer son espace qu'en connaissant à la fois le
-- numéro de téléphone enregistré sur sa fiche ET un code remis par la
-- clinique (évite qu'un proche partageant le même téléphone n'accède au
-- dossier de quelqu'un d'autre).
--
-- Cette table n'est manipulée que par les edge functions (service role) :
-- RLS activé, aucune policy publique, donc ni anon ni authenticated n'y
-- ont accès direct.
create table if not exists patient_activation_codes (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  phone text not null,
  code text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists patient_activation_codes_patient_id_idx
  on patient_activation_codes(patient_id);

create index if not exists patient_activation_codes_lookup_idx
  on patient_activation_codes(phone, code)
  where used_at is null;

alter table patient_activation_codes enable row level security;

-- Un patient ne peut être lié qu'à un seul compte Supabase Auth.
create unique index if not exists patients_auth_user_id_key
  on patients(auth_user_id)
  where auth_user_id is not null;
