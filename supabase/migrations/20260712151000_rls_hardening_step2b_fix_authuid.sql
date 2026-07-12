-- RLS hardening — step 2b (correctif urgent post step 2).
--
-- auth.uid() est definie par Supabase comme un cast ::uuid du claim JWT
-- "sub". Avec Clerk, "sub" vaut par ex. "user_33SxT6kNix6rgU9wMfAsK0nul9d",
-- qui n'est pas un UUID -> auth.uid() leve 22P02 des qu'elle est appelee.
--
-- Ce bug existait deja (is_clinic_member(), clinic_staff_can_read_patients,
-- et deux vieilles policies "auth.uid() = doctor_id") mais Postgres
-- simplifie "qual OR true" en "true" au moment de planifier -> tant que
-- les policies grand-ouvertes de step 2 existaient, auth.uid() n'etait
-- jamais reellement execute. Leur suppression a rendu le bug actif ->
-- connexion totalement cassee.
--
-- Correctif : ne plus jamais appeler auth.uid() sur ces tables, utiliser
-- uniquement auth.jwt() ->> 'sub' (text, aucun cast, ne peut pas planter).

-- 1. is_clinic_member() : retire la branche auth.uid().
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
        cs.clerk_user_id = (auth.jwt() ->> 'sub')
        or lower(cs.email) = lower(auth.jwt() ->> 'email')
      )
  );
$$;

-- 2. clinic_staff_can_read_patients (policy preexistante, pas creee par
-- les migrations precedentes) : meme correctif, on la recree sans
-- auth.uid().
drop policy if exists "clinic_staff_can_read_patients" on patients;
create policy "clinic_staff_can_read_patients"
on patients for select
to public
using (is_clinic_member(patients.clinic_id, array['doctor', 'secretary', 'admin']));

-- 3. Policies mortes basees sur auth.uid() = doctor_id : meme corrigees,
-- elles resteraient fausses car consultations.doctor_id / patients lies
-- referencent clinic_staff.id (uuid interne), pas le sub Clerk que
-- retournerait auth.uid() si elle marchait. Elles sont de toute facon
-- redondantes avec clerk_doctor_can_update_consultations et
-- clinic_staff_can_read_consultations / clinic_staff_can_read_patients
-- (deja corrigees ci-dessus). On les supprime plutot que de les rafistoler.
drop policy if exists "Allow doctors to see their own consultations" on consultations;
drop policy if exists "doctor_can_read_patient_if_consultation_links" on patients;
