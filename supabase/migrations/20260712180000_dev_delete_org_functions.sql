-- Suppression en cascade d'un cabinet ou d'un assureur, reservee au
-- role developer via l'Edge Function dev-manage-orgs (service role +
-- verification Clerk publicMetadata.role === 'developer', meme pattern
-- que dev-create-clinic/dev-create-insurer).
--
-- SECURITY DEFINER + REVOKE de public/authenticated/anon : meme si
-- quelqu'un devine le nom de la fonction, il ne peut pas l'appeler via
-- l'API REST (RPC) sans la service role key, qui n'est jamais exposee
-- au front.
--
-- Fonctionne en transaction implicite (corps de fonction plpgsql) :
-- si une table dependante inconnue bloque une suppression via une
-- contrainte FK, toute l'operation echoue et s'annule proprement au
-- lieu de laisser des donnees orphelines partielles.

create or replace function public.dev_delete_clinic(p_clinic_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_ids uuid[];
begin
  select array_agg(p.id) into v_patient_ids
  from patients p
  where p.clinic_id = p_clinic_id;

  delete from support_ticket_messages
  where ticket_id in (select id from support_tickets where clinic_id = p_clinic_id);
  delete from support_tickets where clinic_id = p_clinic_id;

  delete from messages
  where consultation_id in (select id from consultations where clinic_id = p_clinic_id);
  delete from notifications
  where user_id in (select id from clinic_staff where clinic_id = p_clinic_id);

  if v_patient_ids is not null then
    delete from patient_activation_codes where patient_id = any(v_patient_ids);
    delete from patient_biometrics where patient_id = any(v_patient_ids);
  end if;

  delete from consultations where clinic_id = p_clinic_id;
  delete from patient_clinic_links where clinic_id = p_clinic_id;
  delete from clinic_admin_whitelist where clinic_id = p_clinic_id;
  delete from clinic_staff where clinic_id = p_clinic_id;

  -- patients dont ce cabinet etait le seul lien -> supprimes (nettoyage
  -- complet) ; ceux relies a d'autres cabinets via patient_clinic_links
  -- sont conserves.
  if v_patient_ids is not null then
    delete from patients
    where id = any(v_patient_ids)
      and not exists (select 1 from patient_clinic_links l where l.patient_id = patients.id);
  end if;

  delete from clinics where id = p_clinic_id;
end;
$$;

revoke all on function public.dev_delete_clinic(uuid) from public, authenticated, anon;

create or replace function public.dev_delete_insurer(p_insurer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from support_ticket_messages
  where ticket_id in (select id from support_tickets where insurer_id = p_insurer_id);
  delete from support_tickets where insurer_id = p_insurer_id;

  delete from messages
  where consultation_id in (select id from consultations where insurer_id = p_insurer_id);
  delete from notifications
  where user_id in (select id from insurer_staff where insurer_id = p_insurer_id);

  delete from insurer_memberships where insurer_id = p_insurer_id;

  -- Les consultations appartiennent au cabinet/medecin, pas a l'assureur :
  -- on retire juste le lien assureur plutot que de supprimer la
  -- consultation (donnee medicale reelle cote cabinet).
  update consultations
  set insurer_id = null, status = 'draft'
  where insurer_id = p_insurer_id;

  delete from insurer_staff where insurer_id = p_insurer_id;
  delete from insurers where id = p_insurer_id;
end;
$$;

revoke all on function public.dev_delete_insurer(uuid) from public, authenticated, anon;
