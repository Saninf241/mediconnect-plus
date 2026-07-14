-- Partitionnement par médecin : dans un cabinet multi-spécialiste, un médecin
-- ne doit voir que ses propres patients/consultations. Secrétaire et admin
-- gardent la vue complète du cabinet (rôle d'accueil/pilotage transversal).
--
-- Contexte : la policy "clinic_staff_can_read_patients" (voir
-- 20260712151000_rls_hardening_step2b_fix_authuid.sql) autorise aujourd'hui
-- TOUT clinic_staff (doctor/secretary/admin) du cabinet à lire TOUS les
-- patients, via is_clinic_member(patients.clinic_id, [...]). Idem pour
-- "clinic_staff_can_read_consultations". Une policy équivalente à ce qu'on
-- fait ici (doctor_can_read_patient_if_consultation_links) a déjà existé et
-- a été supprimée dans 20260712151000 car elle comparait auth.uid() (uuid)
-- à l'identifiant Clerk (pas un uuid) et plantait systématiquement. On
-- reprend ici le pattern déjà correct de is_clinic_member() : auth.jwt() ->>
-- 'sub' (texte, jamais de cast qui plante).
--
-- Sécurité contre la récursion RLS : ces deux fonctions sont security
-- definer (comme is_clinic_member), donc les sous-requêtes sur
-- consultations/clinic_staff/patients qu'elles contiennent s'exécutent sans
-- redéclencher les policies RLS de ces tables — cf. l'historique de
-- 20260712141000_rls_hardening_step1b_fix_recursion.sql sur ce même risque.

create or replace function public.doctor_can_read_patient(p_patient_id uuid)
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
        exists (
          select 1
          from consultations c
          where c.patient_id = p_patient_id
            and c.doctor_id = cs.id
        )
        or exists (
          select 1
          from patients p
          where p.id = p_patient_id
            and p.created_by = cs.id
        )
      )
  );
$$;

create or replace function public.doctor_can_read_consultation(p_consultation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from clinic_staff cs
    join consultations c on c.doctor_id = cs.id
    where c.id = p_consultation_id
      and cs.role = 'doctor'
      and (
        cs.clerk_user_id = (auth.jwt() ->> 'sub')
        or lower(cs.email) = lower(auth.jwt() ->> 'email')
      )
  );
$$;

-- Patients : secrétaire/admin gardent la vue complète, médecin restreint à
-- ses patients (consultation existante OU patient qu'il a lui-même créé).
drop policy if exists "clinic_staff_can_read_patients" on patients;
create policy "clinic_staff_can_read_patients"
on patients for select
to public
using (
  is_clinic_member(patients.clinic_id, array['secretary', 'admin'])
  or public.doctor_can_read_patient(patients.id)
);

-- Consultations : même principe, pour éviter qu'un médecin puisse encore
-- ouvrir le détail d'une consultation d'un collègue en devinant l'URL même
-- après que la liste "Mes patients" soit correctement restreinte.
drop policy if exists "clinic_staff_can_read_consultations" on consultations;
create policy "clinic_staff_can_read_consultations"
on consultations for select
to public
using (
  is_clinic_member(consultations.clinic_id, array['secretary', 'admin'])
  or public.doctor_can_read_consultation(consultations.id)
);

-- Volontairement inchangé : les policies INSERT/UPDATE sur patients et
-- consultations restent ouvertes à tout le personnel du cabinet (création/
-- édition), seule la LECTURE est restreinte par médecin ici.
