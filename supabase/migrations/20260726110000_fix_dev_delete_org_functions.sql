-- dev_delete_clinic et dev_delete_insurer ont ete ecrits avant l'ajout de
-- plusieurs tables/colonnes en NO ACTION (payment_batches, batch_items,
-- clinic_insurer_networks, consultation_manual_pricing, insurer_tariffs,
-- insurer_act_code_map, insurer_diagnosis_code_map, consultations.
-- insurer_agent_id/insurer_decision_by_staff_id, payments,
-- consultation_history, consultation_codes, medical_reports). Verifie
-- empiriquement : les deux organisations reelles de cette base avaient
-- des lignes dans TOUTES ces tables -- les deux fonctions echouaient avec
-- une violation de contrainte FK des qu'on essayait de les supprimer.
--
-- Un second probleme, plus subtil, a ete trouve en testant en transaction
-- annulee : un patient garde parce que lie a un AUTRE cabinet (via
-- patient_clinic_links) pouvait quand meme avoir patients.clinic_id
-- pointant encore vers le cabinet qu'on supprime (ce champ suit le
-- "cabinet d'origine", independamment des liens ajoutes ensuite) --
-- bloquait aussi la suppression (patients.clinic_id -> clinics, RESTRICT).
--
-- Verifie via BEGIN/SELECT dev_delete_*(...)/ROLLBACK sur les 2 vrais
-- cabinets et les 4 vrais assureurs de cette base avant d'etre applique
-- (aucune donnee reelle modifiee).

create or replace function public.dev_delete_clinic(p_clinic_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_patient_ids uuid[];
  v_consultation_ids uuid[];
begin
  select array_agg(p.id) into v_patient_ids
  from patients p
  where p.clinic_id = p_clinic_id;

  select array_agg(c.id) into v_consultation_ids
  from consultations c
  where c.clinic_id = p_clinic_id;

  delete from support_ticket_messages
  where ticket_id in (select id from support_tickets where clinic_id = p_clinic_id);
  delete from support_tickets where clinic_id = p_clinic_id;

  if v_consultation_ids is not null then
    delete from messages where consultation_id = any(v_consultation_ids);
    delete from batch_items where consultation_id = any(v_consultation_ids);
    delete from consultation_codes where consultation_id = any(v_consultation_ids);
    delete from consultation_history where consultation_id = any(v_consultation_ids);
    delete from medical_reports where consultation_id = any(v_consultation_ids);
    delete from payments where consultation_id = any(v_consultation_ids);
  end if;

  delete from payments where clinic_id = p_clinic_id;
  delete from payment_batches where clinic_id = p_clinic_id;
  delete from clinic_insurer_networks where clinic_id = p_clinic_id;

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

  if v_patient_ids is not null then
    -- patients dont ce cabinet etait le seul lien -> supprimes.
    delete from patients
    where id = any(v_patient_ids)
      and not exists (select 1 from patient_clinic_links l where l.patient_id = patients.id);

    -- patients gardes (lies a un autre cabinet) mais dont clinic_id
    -- pointe encore vers celui qu'on supprime -> reassigne vers un de
    -- leurs autres cabinets lies (sinon delete clinics echoue, RESTRICT).
    update patients p
    set clinic_id = (
      select l.clinic_id from patient_clinic_links l
      where l.patient_id = p.id and l.clinic_id <> p_clinic_id
      limit 1
    )
    where p.id = any(v_patient_ids) and p.clinic_id = p_clinic_id;
  end if;

  delete from clinics where id = p_clinic_id;
end;
$$;

create or replace function public.dev_delete_insurer(p_insurer_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
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
  delete from insurer_member_directory where insurer_id = p_insurer_id;
  delete from insurer_act_code_map where insurer_id = p_insurer_id;
  delete from insurer_diagnosis_code_map where insurer_id = p_insurer_id;
  delete from insurer_tariffs where insurer_id = p_insurer_id;
  delete from clinic_insurer_networks where insurer_id = p_insurer_id;
  delete from consultation_manual_pricing where insurer_id = p_insurer_id;

  delete from batch_items
  where batch_id in (select id from payment_batches where insurer_id = p_insurer_id);
  delete from payment_batches where insurer_id = p_insurer_id;

  -- Les consultations appartiennent au cabinet/medecin, pas a l'assureur :
  -- on retire juste le lien assureur plutot que de supprimer la
  -- consultation (donnee medicale reelle cote cabinet). Neutralise aussi
  -- les references directes a un agent de cet assureur, sinon la
  -- suppression d'insurer_staff plus bas echoue (FK NO ACTION).
  update consultations
  set insurer_id = null, status = 'draft'
  where insurer_id = p_insurer_id;

  update consultations
  set insurer_agent_id = null
  where insurer_agent_id in (select id from insurer_staff where insurer_id = p_insurer_id);

  update consultations
  set insurer_decision_by_staff_id = null
  where insurer_decision_by_staff_id in (select id from insurer_staff where insurer_id = p_insurer_id);

  update consultation_manual_pricing
  set approved_by_staff_id = null
  where approved_by_staff_id in (select id from insurer_staff where insurer_id = p_insurer_id);

  update consultation_manual_pricing
  set proposed_by_staff_id = null
  where proposed_by_staff_id in (select id from insurer_staff where insurer_id = p_insurer_id);

  update payment_batches
  set paid_by_staff_id = null
  where paid_by_staff_id in (select id from insurer_staff where insurer_id = p_insurer_id);

  update payment_batches
  set created_by_staff_id = null
  where created_by_staff_id in (select id from insurer_staff where insurer_id = p_insurer_id);

  delete from insurer_staff where insurer_id = p_insurer_id;
  delete from insurers where id = p_insurer_id;
end;
$$;
