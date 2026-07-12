-- Outil de fusion de patients dupliqués (recommandation 5 de l'audit
-- "patient health space design"). Les guards de 20260705150000_patient_dedup_guards.sql
-- empêchent les NOUVEAUX doublons à la création (national_id, ou couple
-- assureur+n° d'adhérent actif) mais ne font rien pour les doublons déjà
-- présents en base (même personne vue dans deux cabinets avant/sans ces
-- guards). Cette migration ajoute uniquement la brique de fusion elle-même :
-- une fonction SQL appelée manuellement depuis le SQL Editor par un dev/admin
-- après avoir repéré un doublon (même national_id, ou même couple
-- insurer_id+member_no). Pas d'edge function ni d'UI pour l'instant — à
-- ajouter plus tard seulement si le volume de fusions le justifie.
--
-- Convention "fusion" pour ce schéma (jusqu'ici inexistante, patients.status
-- est un texte libre sans valeur de type "merged"/"deleted") : la fiche
-- perdante n'est jamais supprimée (patient_activation_codes a un
-- ON DELETE CASCADE vers patients, une suppression physique effacerait
-- silencieusement ses codes d'activation) — elle est gardée comme stub
-- redirigé via status='merged' + merged_into_patient_id.

alter table patients
  add column if not exists merged_into_patient_id uuid references patients(id);

create index if not exists patients_merged_into_idx
  on patients(merged_into_patient_id)
  where merged_into_patient_id is not null;

create or replace function merge_patients(
  p_survivor_id uuid,
  p_loser_id uuid,
  p_actor_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_survivor patients%rowtype;
  v_loser patients%rowtype;
  v_count int;
  v_summary jsonb := '{}'::jsonb;
begin
  if p_survivor_id is null or p_loser_id is null then
    raise exception 'merge_patients: p_survivor_id et p_loser_id sont requis';
  end if;

  if p_survivor_id = p_loser_id then
    raise exception 'merge_patients: survivor et loser identiques (%)', p_survivor_id;
  end if;

  -- Verrouille les deux lignes pour éviter une fusion concurrente incohérente.
  select * into v_survivor from patients where id = p_survivor_id for update;
  if not found then
    raise exception 'merge_patients: survivor introuvable (%)', p_survivor_id;
  end if;

  select * into v_loser from patients where id = p_loser_id for update;
  if not found then
    raise exception 'merge_patients: loser introuvable (%)', p_loser_id;
  end if;

  if v_survivor.status = 'merged' then
    raise exception 'merge_patients: survivor % est déjà fusionné vers %', p_survivor_id, v_survivor.merged_into_patient_id;
  end if;

  if v_loser.status = 'merged' then
    raise exception 'merge_patients: loser % est déjà fusionné vers %', p_loser_id, v_loser.merged_into_patient_id;
  end if;

  -- Un compte espace-patient (auth_user_id) est unique par ligne patients.
  -- Si les deux fiches ont chacune un compte distinct, c'est un vrai conflit
  -- (deux identifiants de connexion différents pour la même personne) qui
  -- ne peut pas être résolu silencieusement.
  if v_survivor.auth_user_id is not null
     and v_loser.auth_user_id is not null
     and v_survivor.auth_user_id <> v_loser.auth_user_id then
    raise exception 'merge_patients: survivor et loser ont chacun un auth_user_id distinct (% / %) — à résoudre manuellement avant fusion',
      v_survivor.auth_user_id, v_loser.auth_user_id;
  end if;

  if v_survivor.auth_user_id is null and v_loser.auth_user_id is not null then
    update patients set auth_user_id = v_loser.auth_user_id where id = p_survivor_id;
    update patients set auth_user_id = null where id = p_loser_id;
  end if;

  -- Réattribution simple : aucune de ces tables n'a de contrainte unique
  -- portant sur patient_id seul (vérifié via src/types/supabase.ts,
  -- isOneToOne: false sur chacune de ces FK), un bulk UPDATE suffit.
  update appointments set patient_id = p_survivor_id where patient_id = p_loser_id;
  get diagnostics v_count = row_count; v_summary := v_summary || jsonb_build_object('appointments', v_count);

  update biometric_captures set patient_id = p_survivor_id where patient_id = p_loser_id;
  get diagnostics v_count = row_count; v_summary := v_summary || jsonb_build_object('biometric_captures', v_count);

  update consultations set patient_id = p_survivor_id where patient_id = p_loser_id;
  get diagnostics v_count = row_count; v_summary := v_summary || jsonb_build_object('consultations', v_count);

  -- insurer_memberships : l'unique partiel de 20260705150000_patient_dedup_guards.sql
  -- porte sur (insurer_id, member_no) et pas sur patient_id, donc un bulk
  -- UPDATE ne peut pas violer cette contrainte.
  update insurer_memberships set patient_id = p_survivor_id where patient_id = p_loser_id;
  get diagnostics v_count = row_count; v_summary := v_summary || jsonb_build_object('insurer_memberships', v_count);

  update patient_auth set patient_id = p_survivor_id where patient_id = p_loser_id;
  get diagnostics v_count = row_count; v_summary := v_summary || jsonb_build_object('patient_auth', v_count);

  update patient_biometrics set patient_id = p_survivor_id where patient_id = p_loser_id;
  get diagnostics v_count = row_count; v_summary := v_summary || jsonb_build_object('patient_biometrics', v_count);

  update pharmacy_receipts set patient_id = p_survivor_id where patient_id = p_loser_id;
  get diagnostics v_count = row_count; v_summary := v_summary || jsonb_build_object('pharmacy_receipts', v_count);

  update prescriptions set patient_id = p_survivor_id where patient_id = p_loser_id;
  get diagnostics v_count = row_count; v_summary := v_summary || jsonb_build_object('prescriptions', v_count);

  update patient_activation_codes set patient_id = p_survivor_id where patient_id = p_loser_id;
  get diagnostics v_count = row_count; v_summary := v_summary || jsonb_build_object('patient_activation_codes', v_count);

  -- patient_clinic_links a une contrainte unique (patient_id, clinic_id) :
  -- un bulk UPDATE peut la violer si les deux fiches ont déjà été vues dans
  -- la même clinique. On fusionne les lignes (union, on ignore les doublons)
  -- puis on supprime les lignes du perdant.
  insert into patient_clinic_links (patient_id, clinic_id, rel)
  select p_survivor_id, clinic_id, rel
  from patient_clinic_links
  where patient_id = p_loser_id
  on conflict (patient_id, clinic_id) do nothing;

  delete from patient_clinic_links where patient_id = p_loser_id;
  get diagnostics v_count = row_count; v_summary := v_summary || jsonb_build_object('patient_clinic_links_moved', v_count);

  -- La fiche perdante n'est jamais supprimée physiquement (cf. commentaire
  -- en tête de fichier) : elle devient un stub redirigé vers le survivant.
  update patients
  set status = 'merged',
      merged_into_patient_id = p_survivor_id,
      updated_at = now()
  where id = p_loser_id;

  update patients set updated_at = now() where id = p_survivor_id;

  v_summary := v_summary || jsonb_build_object(
    'survivor_id', p_survivor_id,
    'loser_id', p_loser_id,
    'actor_email', p_actor_email,
    'merged_at', now()
  );

  return v_summary;
end;
$$;

comment on function merge_patients(uuid, uuid, text) is
  'Fusionne p_loser_id dans p_survivor_id : réattribue toutes les tables dépendantes, '
  'marque le perdant status=''merged'' avec merged_into_patient_id plutôt que de le '
  'supprimer. Appel manuel depuis le SQL Editor pour l''instant : '
  'select merge_patients(''<survivor-uuid>'', ''<loser-uuid>'', ''ton-email'');';
