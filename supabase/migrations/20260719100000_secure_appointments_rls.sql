-- La table public.appointments existait sans RLS (flag Supabase advisor:
-- "public, but RLS has not been enabled" + "exposed via API ... sensitive column patient_id").
-- Elle est vide à ce jour : on peut donc sécuriser clinic_id sans risque de migration de données.

alter table public.appointments
  alter column clinic_id set not null;

alter table public.appointments enable row level security;

create policy "clinic_staff_can_read_appointments"
  on public.appointments
  for select
  to public
  using (is_clinic_member(clinic_id, array['doctor', 'secretary', 'admin']));

create policy "clinic_staff_can_insert_appointments"
  on public.appointments
  for insert
  to public
  with check (is_clinic_member(clinic_id, array['doctor', 'secretary', 'admin']));

create policy "clinic_staff_can_update_appointments"
  on public.appointments
  for update
  to public
  using (is_clinic_member(clinic_id, array['doctor', 'secretary', 'admin']))
  with check (is_clinic_member(clinic_id, array['doctor', 'secretary', 'admin']));
