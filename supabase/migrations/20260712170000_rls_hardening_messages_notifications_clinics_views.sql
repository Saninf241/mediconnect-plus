-- RLS hardening -- messagerie medecin/assureur, notifications, clinics,
-- et les 2 vues de reporting assureur (anomalies / alertes empreinte).
--
-- 1) messages / notifications : les policies restantes utilisent
--    auth.uid() qui jette une erreur 22P02 avec un JWT Clerk (sub non-UUID)
--    -- meme bug deja corrige sur patients/consultations dans
--    20260712151000_rls_hardening_step2b_fix_authuid.sql. Elles etaient
--    masquees par les policies grand-ouvertes de "messages" qui viennent
--    d'etre supprimees -> a corriger avant de retester la messagerie.
-- 2) clinics : CRUD grand-ouvert a tout compte authentifie (y compris
--    DELETE), aucun usage cote front verifie (creation/modif se fait
--    uniquement via les Edge Functions dev-* en service role) -> supprime.
-- 3) consultations_anomalies_7d / consultations_fingerprint_alerts_30d :
--    vues possedees par postgres, comme les tables qu'elles interrogent,
--    sans FORCE ROW LEVEL SECURITY -> elles contournent completement la
--    RLS et exposent tous les cabinets/assures a n'importe quel assureur.
--    security_invoker force la RLS a s'appliquer avec les droits de
--    l'appelant. Consequence : il faut que patients/clinics/clinic_staff
--    aient une policy de lecture scopee pour l'assureur lie via
--    consultations, sinon les colonnes patient_name/clinic_name/
--    doctor_name reviendront simplement vides pour lui (LEFT JOIN).

-- ============================================================
-- messages
-- ============================================================

drop policy if exists "Doctor or insurer can insert messages" on messages;
create policy "doctor_or_insurer_can_insert_messages"
on messages for insert
to authenticated
with check (
  (sender_role = 'doctor' and sender_id in (
    select cs.id from clinic_staff cs where cs.clerk_user_id = (auth.jwt() ->> 'sub')
  ))
  or
  (sender_role = 'insurer' and sender_id in (
    select ist.id from insurer_staff ist where ist.clerk_user_id = (auth.jwt() ->> 'sub')
  ))
);

drop policy if exists "messages_insert_participants" on messages;
create policy "messages_insert_participants"
on messages for insert
to public
with check (
  exists (
    select 1 from consultations c
    where c.id = messages.consultation_id
      and (
        (messages.sender_role = 'doctor' and c.doctor_id = messages.sender_id and exists (
          select 1 from clinic_staff cs
          where cs.id = messages.sender_id and cs.clerk_user_id = (auth.jwt() ->> 'sub')
        ))
        or
        (messages.sender_role = 'insurer' and exists (
          select 1 from insurer_staff ist
          where ist.id = messages.sender_id
            and ist.clerk_user_id = (auth.jwt() ->> 'sub')
            and ist.insurer_id = c.insurer_id
        ))
      )
  )
);

drop policy if exists "messages_select_participants" on messages;
create policy "messages_select_participants"
on messages for select
to public
using (
  exists (
    select 1 from consultations c
    where c.id = messages.consultation_id
      and (
        c.doctor_id in (select cs.id from clinic_staff cs where cs.clerk_user_id = (auth.jwt() ->> 'sub'))
        or
        c.insurer_id in (select ist.insurer_id from insurer_staff ist where ist.clerk_user_id = (auth.jwt() ->> 'sub'))
      )
  )
);

-- ============================================================
-- notifications
-- ============================================================

drop policy if exists "notifications_select_via_staff" on notifications;
create policy "notifications_select_via_staff"
on notifications for select
to authenticated
using (
  exists (select 1 from insurer_staff s where s.id = notifications.user_id and s.clerk_user_id = (auth.jwt() ->> 'sub'))
  or exists (select 1 from clinic_staff cs where cs.id = notifications.user_id and cs.clerk_user_id = (auth.jwt() ->> 'sub'))
);

drop policy if exists "notifications_update_via_staff" on notifications;
create policy "notifications_update_via_staff"
on notifications for update
to authenticated
using (
  exists (select 1 from insurer_staff s where s.id = notifications.user_id and s.clerk_user_id = (auth.jwt() ->> 'sub'))
  or exists (select 1 from clinic_staff cs where cs.id = notifications.user_id and cs.clerk_user_id = (auth.jwt() ->> 'sub'))
)
with check (
  exists (select 1 from insurer_staff s where s.id = notifications.user_id and s.clerk_user_id = (auth.jwt() ->> 'sub'))
  or exists (select 1 from clinic_staff cs where cs.id = notifications.user_id and cs.clerk_user_id = (auth.jwt() ->> 'sub'))
);

-- Manquait : sendMessage() insere une notification pour l'autre
-- participant a chaque envoi, mais aucune policy INSERT n'existait ->
-- echouait silencieusement (erreur juste loguee en console). Le badge
-- "non lu" ne s'est probablement jamais declenche.
create policy "notifications_insert_by_staff"
on notifications for insert
to authenticated
with check (
  exists (select 1 from clinic_staff cs where cs.clerk_user_id = (auth.jwt() ->> 'sub'))
  or exists (select 1 from insurer_staff ist where ist.clerk_user_id = (auth.jwt() ->> 'sub'))
);

-- ============================================================
-- clinics
-- ============================================================

drop policy if exists "Allow full access during development" on clinics;
drop policy if exists "anyone can read clinics" on clinics;
drop policy if exists "authenticated can delete clinics" on clinics;
drop policy if exists "authenticated can insert clinics" on clinics;
drop policy if exists "authenticated can update clinics" on clinics;
-- member_can_read_own_clinic est conservee telle quelle.

-- Necessaire pour que consultations_fingerprint_alerts_30d /
-- consultations_anomalies_7d affichent le nom du cabinet a l'assureur
-- concerne une fois security_invoker active (voir plus bas).
create policy "insurer_can_read_linked_clinics"
on clinics for select
to authenticated
using (
  exists (
    select 1 from consultations c
    where c.clinic_id = clinics.id
      and is_insurer_member(c.insurer_id)
  )
);

-- ============================================================
-- patients / clinic_staff : lecture scopee pour l'assureur, necessaire
-- aux memes vues (patient_name, patient_is_assured, doctor_name).
-- ============================================================

create policy "insurer_can_read_linked_patients"
on patients for select
to authenticated
using (
  exists (
    select 1 from consultations c
    where c.patient_id = patients.id
      and is_insurer_member(c.insurer_id)
  )
);

create policy "insurer_can_read_linked_doctor_staff"
on clinic_staff for select
to authenticated
using (
  exists (
    select 1 from consultations c
    where c.doctor_id = clinic_staff.id
      and is_insurer_member(c.insurer_id)
  )
);

-- ============================================================
-- Vues : forcer la RLS des tables sous-jacentes a s'appliquer avec les
-- droits de l'appelant plutot que du proprietaire (postgres).
-- ============================================================

alter view consultations_anomalies_7d set (security_invoker = true);
alter view consultations_fingerprint_alerts_30d set (security_invoker = true);
