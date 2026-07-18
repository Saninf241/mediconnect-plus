-- Ajuste 2 des 4 regles de detection ajoutees en 20260718150000, suite a
-- discussion sur le calibrage des seuils :
--
-- 1) Ecart de tarification : le plancher fixe de 5000 FCFA ecrasait le
--    pourcentage sur les petits actes (n'importe quel ecart de 5000 FCFA
--    sur un acte a 2000 FCFA se faisait flag). Passe a un seuil 100%
--    pourcentage (25%), sans plancher -- coherent quel que soit le
--    montant de l'acte.
-- 2) Double facturation meme clinique/meme jour : trop permissive, se
--    declenchait sur un simple suivi legitime le meme jour (consultation
--    du matin + resultats l'apres-midi). Exige desormais un ecart d'au
--    moins 3h entre les deux consultations consecutives du meme patient
--    dans la meme clinique (garde le "meme jour", evite le doublon avec
--    la regle "consultations rapprochees" deja existante qui couvre le
--    <15 min).
create or replace view consultations_anomalies_7d
with (security_invoker = true) as
with c7 as (
  select
    c.id as consultation_id,
    c.created_at,
    c.clinic_id,
    c.doctor_id,
    c.patient_id,
    c.amount,
    c.amount_delta,
    c.pricing_total,
    c.pricing_status,
    c.fingerprint_missing,
    c.biometric_verified_at,
    p.name as patient_name,
    coalesce(p.is_assured, false) as patient_is_assured,
    cl.name as clinic_name,
    insurer_get_doctor_name(c.id) as doctor_name
  from consultations c
  left join patients p on p.id = c.patient_id
  left join clinics cl on cl.id = c.clinic_id
  where c.created_at >= now() - interval '7 days'
),
r_missing_bio as (
  select
    'error'::text as type,
    'Empreinte manquante (assuré)'::text as title,
    'Biométrie manquante pour une prestation assurée'::text as message,
    consultation_id, created_at, patient_id, patient_name, patient_is_assured,
    clinic_id, clinic_name, doctor_id, doctor_name, amount
  from c7
  where patient_is_assured = true
    and (fingerprint_missing = true or biometric_verified_at is null)
),
visits_per_patient_day as (
  select patient_id, created_at::date as day, count(distinct clinic_id) as clinics_cnt
  from c7
  where patient_id is not null and clinic_id is not null
  group by patient_id, created_at::date
),
r_multi_clinic_same_day as (
  select
    'warning'::text as type,
    'Patient multi-établissements (même jour)'::text as title,
    'Le patient a consulté plusieurs établissements le même jour'::text as message,
    c7.consultation_id, c7.created_at, c7.patient_id, c7.patient_name, c7.patient_is_assured,
    c7.clinic_id, c7.clinic_name, c7.doctor_id, c7.doctor_name, c7.amount
  from c7
  join visits_per_patient_day v on v.patient_id = c7.patient_id and v.day = c7.created_at::date
  where v.clinics_cnt >= 2
),
r_rapid_succession as (
  select
    'warning'::text as type,
    'Consultations rapprochées'::text as title,
    'Deux consultations ont été enregistrées à moins de 15 minutes'::text as message,
    consultation_id, created_at, patient_id, patient_name, patient_is_assured,
    clinic_id, clinic_name, doctor_id, doctor_name, amount
  from (
    select c7.*, lag(created_at) over (partition by clinic_id order by created_at) as prev_created_at
    from c7
    where clinic_id is not null
  ) t
  where prev_created_at is not null
    and extract(epoch from (created_at - prev_created_at)) / 60.0 < 15
),
-- Priorite 1 : ecart de tarification anormal -- seuil 100% pourcentage,
-- sans plancher fixe (cf. commentaire migration).
r_pricing_deviation as (
  select
    'error'::text as type,
    'Écart de tarification anormal'::text as title,
    format(
      'Montant déclaré (%s FCFA) vs calculé (%s FCFA) — écart de %s%%',
      round(amount)::text,
      round(pricing_total)::text,
      round(abs(amount_delta) / pricing_total * 100)::text
    ) as message,
    consultation_id, created_at, patient_id, patient_name, patient_is_assured,
    clinic_id, clinic_name, doctor_id, doctor_name, amount
  from c7
  where pricing_status = 'computed'
    and pricing_total is not null
    and pricing_total > 0
    and abs(coalesce(amount_delta, 0)) > pricing_total * 0.25
),
-- Priorite 4 : double facturation possible, meme clinique meme jour, a au
-- moins 3h d'ecart (sinon deja couvert par r_rapid_succession).
visits_with_prev as (
  select c7.*, lag(created_at) over (partition by patient_id, clinic_id order by created_at) as prev_created_at
  from c7
  where patient_id is not null and clinic_id is not null
),
r_double_billing_same_clinic as (
  select
    'warning'::text as type,
    'Double facturation possible (même clinique, même jour)'::text as title,
    'Le patient a plusieurs consultations facturées le même jour dans la même clinique, à plus de 3h d''intervalle'::text as message,
    consultation_id, created_at, patient_id, patient_name, patient_is_assured,
    clinic_id, clinic_name, doctor_id, doctor_name, amount
  from visits_with_prev
  where prev_created_at is not null
    and created_at::date = prev_created_at::date
    and extract(epoch from (created_at - prev_created_at)) / 3600.0 >= 3
),
-- Priorite 3 : volume anormal par medecin (inchangee).
doctor_recent as (
  select doctor_id, count(*) as recent_count, sum(coalesce(amount, 0)) as recent_amount,
    min(id::text)::uuid as sample_consultation_id, max(clinic_id::text)::uuid as clinic_id
  from consultations
  where created_at >= now() - interval '7 days' and doctor_id is not null
  group by doctor_id
),
doctor_baseline as (
  select doctor_id, count(*)::numeric / 12.0 as avg_weekly_count
  from consultations
  where created_at >= now() - interval '97 days'
    and created_at < now() - interval '7 days'
    and doctor_id is not null
  group by doctor_id
),
r_doctor_volume as (
  select
    'warning'::text as type,
    'Volume de consultations anormal'::text as title,
    format(
      '%s consultations cette semaine contre une moyenne habituelle de %s/semaine',
      r.recent_count, round(b.avg_weekly_count, 1)
    ) as message,
    r.sample_consultation_id as consultation_id,
    now() as created_at,
    null::uuid as patient_id,
    null::text as patient_name,
    null::boolean as patient_is_assured,
    r.clinic_id,
    cl.name as clinic_name,
    r.doctor_id,
    insurer_get_doctor_name(r.sample_consultation_id) as doctor_name,
    r.recent_amount as amount
  from doctor_recent r
  join doctor_baseline b on b.doctor_id = r.doctor_id
  left join clinics cl on cl.id = r.clinic_id
  where b.avg_weekly_count >= 3
    and r.recent_count > b.avg_weekly_count * 2.5
),
-- Priorite 2 : lot de paiement anormal (inchangee).
clinic_baseline as (
  select clinic_id, avg(insurer_amount) as avg_amount_per_consultation
  from consultations
  where status = 'accepted' and insurer_amount is not null
  group by clinic_id
),
r_payment_batch as (
  select
    'warning'::text as type,
    'Lot de paiement au montant moyen anormal'::text as title,
    format(
      'Montant moyen par consultation du lot : %s FCFA (moyenne habituelle de cette clinique : %s FCFA)',
      round(pb.amount::numeric / nullif(pb.consultation_count, 0)),
      round(cb.avg_amount_per_consultation)
    ) as message,
    null::uuid as consultation_id,
    pb.created_at,
    null::uuid as patient_id,
    null::text as patient_name,
    null::boolean as patient_is_assured,
    pb.clinic_id,
    cl.name as clinic_name,
    null::uuid as doctor_id,
    null::text as doctor_name,
    pb.amount as amount
  from payment_batches pb
  join clinic_baseline cb on cb.clinic_id = pb.clinic_id
  left join clinics cl on cl.id = pb.clinic_id
  where pb.consultation_count > 0
    and (pb.amount::numeric / pb.consultation_count) > greatest(cb.avg_amount_per_consultation * 1.5, cb.avg_amount_per_consultation + 5000)
    and pb.created_at >= now() - interval '30 days'
)
select * from r_missing_bio
union all
select * from r_multi_clinic_same_day
union all
select * from r_rapid_succession
union all
select * from r_pricing_deviation
union all
select * from r_double_billing_same_clinic
union all
select * from r_doctor_volume
union all
select * from r_payment_batch
order by 5 desc;
