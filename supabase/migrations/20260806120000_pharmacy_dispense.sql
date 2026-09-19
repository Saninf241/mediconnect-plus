-- Réception d'ordonnances en pharmacie : code de retrait sur les
-- consultations validées, liaison optionnelle à une pharmacie, délivrance
-- (éventuellement partielle) tracée via RPC, et fermeture des tables
-- pharmacie qui étaient jusqu'ici grand ouvertes (RLS désactivé).

-- 1. Colonnes consultations -------------------------------------------------
alter table consultations
  add column if not exists dispense_code text,
  add column if not exists pharmacy_id uuid references pharmacies(id);

create unique index if not exists consultations_dispense_code_key
  on consultations (dispense_code)
  where dispense_code is not null;

-- 2. Génération auto du code au passage en 'validated' ----------------------
create or replace function set_dispense_code()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'validated' and new.dispense_code is null then
    new.dispense_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_dispense_code on consultations;
create trigger trg_set_dispense_code
  before insert or update of status on consultations
  for each row
  execute function set_dispense_code();

-- backfill des consultations déjà validées avant cette migration
update consultations
set dispense_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
where status = 'validated' and dispense_code is null;

-- 3. Délivrance partielle ----------------------------------------------------
alter table pharmacy_deliveries
  add column if not exists delivered_items text[] not null default '{}';

-- 4. Fonctions d'appartenance pharmacie (même patron que is_clinic_member /
--    is_insurer_member déjà en place) --------------------------------------
create or replace function is_pharmacy_member(p_pharmacy_id uuid, p_roles text[] default null)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from pharmacy_staff ps
    where ps.pharmacy_id = p_pharmacy_id
      and (p_roles is null or ps.role = any(p_roles))
      and (
        ps.user_id = (auth.jwt() ->> 'sub')
        or lower(ps.email) = lower(auth.jwt() ->> 'email')
      )
  );
$$;

create or replace function current_pharmacy_staff()
returns pharmacy_staff
language sql
stable security definer
set search_path to 'public'
as $$
  select ps.*
  from pharmacy_staff ps
  where ps.user_id = (auth.jwt() ->> 'sub')
     or lower(ps.email) = lower(auth.jwt() ->> 'email')
  limit 1;
$$;

-- 5. RLS : pharmacies (lecture seule, nécessaire pour le sélecteur côté
--    médecin et l'affichage du nom de pharmacie) ---------------------------
alter table pharmacies enable row level security;
drop policy if exists pharmacies_read on pharmacies;
create policy pharmacies_read
  on pharmacies for select
  using (true);

-- 6. RLS : pharmacy_deliveries ----------------------------------------------
-- Pas de policy INSERT directe : l'écriture passe uniquement par la RPC
-- security definer pharmacy_record_delivery ci-dessous (transaction atomique,
-- code déjà vérifié).
alter table pharmacy_deliveries enable row level security;

drop policy if exists pharmacy_deliveries_read_pharmacy on pharmacy_deliveries;
create policy pharmacy_deliveries_read_pharmacy
  on pharmacy_deliveries for select
  using (is_pharmacy_member(pharmacy_id));

drop policy if exists pharmacy_deliveries_read_clinic on pharmacy_deliveries;
create policy pharmacy_deliveries_read_clinic
  on pharmacy_deliveries for select
  using (
    exists (
      select 1 from consultations c
      where c.id = pharmacy_deliveries.consultation_id
        and (
          doctor_can_read_consultation(c.doctor_id)
          or is_clinic_member(c.clinic_id, array['secretary', 'admin'])
        )
    )
  );

-- 7. RLS : pharmacy_receipts --------------------------------------------------
-- Table non alimentée par le code applicatif aujourd'hui : on ferme l'accès
-- direct plutôt que de la laisser grande ouverte. La lecture patient passe
-- par la fonction Edge patient-portal-data (service role, hors RLS).
alter table pharmacy_receipts enable row level security;

-- 8. RLS : consultations, lecture par la pharmacie pré-assignée -------------
drop policy if exists pharmacy_can_read_consultations on consultations;
create policy pharmacy_can_read_consultations
  on consultations for select
  using (
    status = 'validated'
    and pharmacy_id is not null
    and is_pharmacy_member(pharmacy_id)
  );

-- 9. RPC : recherche d'une ordonnance par code de retrait --------------------
-- Flux principal : n'importe quel pharmacien du réseau peut retrouver une
-- ordonnance avec le code imprimé/scanné, sans que la consultation lui ait
-- été explicitement assignée. Aucune recherche partielle possible (égalité
-- stricte), donc pas d'énumération.
create or replace function pharmacy_lookup_by_code(p_code text)
returns table (
  consultation_id uuid,
  created_at timestamptz,
  patient_name text,
  doctor_name text,
  clinic_name text,
  medications text[],
  already_delivered boolean,
  delivered_items text[]
)
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_staff pharmacy_staff;
begin
  select * into v_staff from current_pharmacy_staff();
  if v_staff.id is null then
    raise exception 'Accès pharmacien requis';
  end if;

  return query
  select
    c.id,
    c.created_at,
    p.name,
    cs.name,
    cl.name,
    coalesce(c.medications, '{}'),
    exists (select 1 from pharmacy_deliveries d where d.consultation_id = c.id),
    coalesce(
      (select d.delivered_items from pharmacy_deliveries d
       where d.consultation_id = c.id
       order by d.delivered_at desc limit 1),
      '{}'
    )
  from consultations c
  left join patients p on p.id = c.patient_id
  left join clinic_staff cs on cs.id = c.doctor_id
  left join clinics cl on cl.id = c.clinic_id
  where c.dispense_code = upper(trim(p_code))
    and c.status = 'validated';
end;
$$;

revoke all on function pharmacy_lookup_by_code(text) from public;
grant execute on function pharmacy_lookup_by_code(text) to authenticated;

-- 10. RPC : enregistrement atomique de la délivrance -------------------------
create or replace function pharmacy_record_delivery(
  p_consultation_id uuid,
  p_delivered_items text[],
  p_comment text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_staff pharmacy_staff;
  v_status text;
  v_already boolean;
  v_delivery_id uuid;
begin
  select * into v_staff from current_pharmacy_staff();
  if v_staff.id is null then
    raise exception 'Accès pharmacien requis';
  end if;

  select status into v_status from consultations where id = p_consultation_id;
  if v_status is distinct from 'validated' then
    raise exception 'Ordonnance introuvable ou non validée';
  end if;

  select exists(select 1 from pharmacy_deliveries where consultation_id = p_consultation_id)
    into v_already;
  if v_already then
    raise exception 'Cette ordonnance a déjà été délivrée';
  end if;

  insert into pharmacy_deliveries (consultation_id, pharmacy_id, pharmacist_id, delivered_items, comment)
  values (p_consultation_id, v_staff.pharmacy_id, v_staff.id::text, coalesce(p_delivered_items, '{}'), p_comment)
  returning id into v_delivery_id;

  return v_delivery_id;
end;
$$;

revoke all on function pharmacy_record_delivery(uuid, text[], text) from public;
grant execute on function pharmacy_record_delivery(uuid, text[], text) to authenticated;
