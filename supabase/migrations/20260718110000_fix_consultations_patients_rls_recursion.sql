-- Corrige une recursion RLS reelle (Postgres 42P17 "infinite recursion
-- detected in policy for relation consultations"), rencontree en pratique
-- en cliquant "Calculer" (compute_consultation_pricing) sur une
-- consultation cote assureur.
--
-- Cause : malgre le commentaire de 20260714190000 affirmant que SECURITY
-- DEFINER suffit a eviter la recursion, ce n'est pas le cas ici -- Postgres
-- detecte la recursion de facon structurelle des qu'une policy sur une
-- relation X necessite de re-evaluer une policy sur X (directement ou via
-- une fonction), independamment du fait que le proprietaire de la fonction
-- (postgres, qui a bien rolbypassrls=true) bypasserait effectivement RLS a
-- l'execution -- ce n'est pas un probleme de privileges mais une limite
-- structurelle du planner PostgreSQL. doctor_can_read_consultation(id)
-- re-requetait consultations en interne (jointure sur c.doctor_id) alors
-- qu'elle est appelee depuis la policy SELECT de consultations elle-meme
-- -> cycle. doctor_can_read_patient avait le meme probleme sur patients
-- (created_by).
--
-- Fix : au lieu de re-interroger la table protegee pour retrouver une
-- valeur deja connue de l'appelant, on la fait passer en parametre depuis
-- la policy (colonne de la ligne en cours d'evaluation). Plus aucune des
-- deux fonctions ne touche la table dont elle garde l'acces.
--
-- Ordre important : on droppe d'abord les policies qui dependent des
-- anciennes signatures de fonction, sinon DROP FUNCTION echoue.

drop policy if exists "clinic_staff_can_read_consultations" on consultations;
drop policy if exists "clinic_staff_can_read_patients" on patients;

drop function if exists public.doctor_can_read_consultation(uuid);
drop function if exists public.doctor_can_read_patient(uuid);

create or replace function public.doctor_can_read_consultation(p_doctor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from clinic_staff cs
    where cs.id = p_doctor_id
      and cs.role = 'doctor'
      and (
        cs.clerk_user_id = (auth.jwt() ->> 'sub')
        or lower(cs.email) = lower(auth.jwt() ->> 'email')
      )
  );
$$;

create or replace function public.doctor_can_read_patient(p_patient_id uuid, p_created_by uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from clinic_staff cs
    where cs.role = 'doctor'
      and (
        cs.clerk_user_id = (auth.jwt() ->> 'sub')
        or lower(cs.email) = lower(auth.jwt() ->> 'email')
      )
      and (
        cs.id = p_created_by
        or exists (
          select 1
          from consultations c
          where c.patient_id = p_patient_id
            and c.doctor_id = cs.id
        )
      )
  );
$$;

create policy "clinic_staff_can_read_patients"
on patients for select
to public
using (
  is_clinic_member(patients.clinic_id, array['secretary', 'admin'])
  or public.doctor_can_read_patient(patients.id, patients.created_by)
);

create policy "clinic_staff_can_read_consultations"
on consultations for select
to public
using (
  is_clinic_member(consultations.clinic_id, array['secretary', 'admin'])
  or public.doctor_can_read_consultation(consultations.doctor_id)
);

-- Deuxieme source de la meme recursion, plus grave car declenchee par
-- N'IMPORTE QUELLE mise a jour de consultations (pas seulement cote
-- assureur) : "insurer_can_read_linked_doctor_staff" sur clinic_staff
-- interroge consultations en interne. Une lecture/jointure simple
-- (consultations + clinic_staff dans une seule requete SELECT) n'est pas
-- affectee (teste et confirme), mais des qu'un UPDATE sur consultations
-- passe par is_clinic_member(...) (clinic_staff_can_update_consultations,
-- appelee pour TOUT UPDATE, medecin/secretaire/admin/assureur), Postgres
-- doit re-evaluer les policies de clinic_staff, qui re-interrogent
-- consultations -> cycle. Teste : ni SECURITY DEFINER, ni
-- SET row_security = off, ni LANGUAGE plpgsql ne suffisent a eviter ce
-- 42P17 -- la seule solution fiable est de supprimer la reference croisee.
--
-- Remplacee par une fonction dediee (insurer_get_doctor_name), appelee en
-- RPC autonome depuis le front (jamais imbriquee dans la resolution des
-- policies de consultations elle-meme) -- cote cliniques/patients cette
-- policy n'etait utilisee que par ConsultationDetailsPage.tsx (assureur)
-- pour afficher le nom du medecin.
drop policy if exists "insurer_can_read_linked_doctor_staff" on clinic_staff;

create or replace function public.insurer_get_doctor_name(p_consultation_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select cs.name
  from consultations c
  join clinic_staff cs on cs.id = c.doctor_id
  where c.id = p_consultation_id
    and is_insurer_member(c.insurer_id);
$$;
