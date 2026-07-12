-- RLS hardening — step 1b (correctif de l'etape 1).
--
-- L'etape 1 (20260712140000) a introduit "clinic_staff_can_read_same_clinic",
-- une policy sur clinic_staff qui fait une sous-requete SELECT sur
-- clinic_staff lui-meme. Postgres re-applique alors les policies de
-- clinic_staff pour resoudre cette sous-requete -> boucle infinie
-- (erreur 42P17 "infinite recursion detected in policy for relation
-- clinic_staff"), qui a aussi casse les policies clinic_staff_can_*
-- sur patients/consultations puisqu'elles font elles aussi
-- "select ... from clinic_staff cs ...".
--
-- Correctif standard Supabase : une fonction SECURITY DEFINER. Une telle
-- fonction s'execute avec les droits de son proprietaire (le role qui l'a
-- creee, ici "postgres" via le SQL Editor), qui est aussi proprietaire de
-- clinic_staff -> il contourne RLS pour cette requete interne, donc plus
-- de recursion.

drop policy if exists "clinic_staff_can_read_same_clinic" on clinic_staff;
drop policy if exists "clinic_staff_can_insert_patients" on patients;
drop policy if exists "clinic_staff_can_update_patients" on patients;
drop policy if exists "clinic_staff_can_read_consultations" on consultations;
drop policy if exists "clinic_staff_can_insert_consultations" on consultations;
drop policy if exists "clinic_staff_can_update_consultations" on consultations;

create or replace function public.is_clinic_member(p_clinic_id uuid, p_roles text[] default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from clinic_staff cs
    where cs.clinic_id = p_clinic_id
      and (p_roles is null or cs.role = any(p_roles))
      and (
        cs.clerk_user_id = (auth.uid())::text
        or cs.clerk_user_id = (auth.jwt() ->> 'sub')
        or lower(cs.email) = lower(auth.jwt() ->> 'email')
      )
  );
$$;

create policy "clinic_staff_can_read_same_clinic"
on clinic_staff for select
to public
using (is_clinic_member(clinic_id));

create policy "clinic_staff_can_insert_patients"
on patients for insert
to public
with check (is_clinic_member(clinic_id, array['doctor', 'secretary', 'admin']));

create policy "clinic_staff_can_update_patients"
on patients for update
to public
using (is_clinic_member(clinic_id, array['doctor', 'secretary', 'admin']))
with check (is_clinic_member(clinic_id, array['doctor', 'secretary', 'admin']));

create policy "clinic_staff_can_read_consultations"
on consultations for select
to public
using (is_clinic_member(clinic_id, array['doctor', 'secretary', 'admin']));

create policy "clinic_staff_can_insert_consultations"
on consultations for insert
to public
with check (is_clinic_member(clinic_id, array['doctor', 'secretary', 'admin']));

create policy "clinic_staff_can_update_consultations"
on consultations for update
to public
using (is_clinic_member(clinic_id, array['doctor', 'secretary', 'admin']))
with check (is_clinic_member(clinic_id, array['doctor', 'secretary', 'admin']));
