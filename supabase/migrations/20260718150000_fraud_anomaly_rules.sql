-- Ajoute 4 nouvelles regles de detection cote assureur, priorisees par
-- l'utilisateur dans cet ordre : ecart de tarification anormal, lots de
-- paiement au montant moyen anormal, volume anormal par medecin, double
-- facturation meme clinique/meme jour.
--
-- Corrige au passage une regression introduite par la migration
-- 20260718110000 (fix recursion RLS) : consultations_anomalies_7d et
-- consultations_fingerprint_alerts_30d joignaient clinic_staff
-- directement pour le nom du medecin, ce qui reposait sur la policy
-- insurer_can_read_linked_doctor_staff supprimee pour casser la
-- recursion. Verifie en direct : le nom du medecin remontait `null` pour
-- un assureur depuis ce fix. Remplace par insurer_get_doctor_name(id),
-- deja utilisee par ConsultationDetailsPage.tsx, sure car appelee en
-- lecture simple (jamais imbriquee dans la resolution des policies de
-- consultations elle-meme).
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
-- Priorite 1 : ecart de tarification anormal. Une fois le pricing calcule
-- (compute_consultation_pricing), un ecart important entre le montant
-- declare et le montant recalcule depuis la grille tarifaire est un
-- signal direct de sur/sous-facturation.
r_pricing_deviation as (
  select
    'error'::text as type,
    'Écart de tarification anormal'::text as title,
    format(
      'Montant déclaré (%s FCFA) vs calculé (%s FCFA) — écart de %s FCFA',
      round(amount)::text, round(pricing_total)::text, round(amount_delta)::text
    ) as message,
    consultation_id, created_at, patient_id, patient_name, patient_is_assured,
    clinic_id, clinic_name, doctor_id, doctor_name, amount
  from c7
  where pricing_status = 'computed'
    and pricing_total is not null
    and pricing_total > 0
    and abs(coalesce(amount_delta, 0)) > greatest(pricing_total * 0.2, 5000)
),
-- Priorite 4 : double facturation possible, meme clinique meme jour (la
-- regle existante ne couvrait que le cross-etablissement).
visits_per_patient_clinic_day as (
  select patient_id, clinic_id, created_at::date as day, count(*) as visits_cnt
  from c7
  where patient_id is not null and clinic_id is not null
  group by patient_id, clinic_id, created_at::date
),
r_double_billing_same_clinic as (
  select
    'warning'::text as type,
    'Double facturation possible (même clinique, même jour)'::text as title,
    'Le patient a plusieurs consultations facturées le même jour dans la même clinique'::text as message,
    c7.consultation_id, c7.created_at, c7.patient_id, c7.patient_name, c7.patient_is_assured,
    c7.clinic_id, c7.clinic_name, c7.doctor_id, c7.doctor_name, c7.amount
  from c7
  join visits_per_patient_clinic_day v
    on v.patient_id = c7.patient_id and v.clinic_id = c7.clinic_id and v.day = c7.created_at::date
  where v.visits_cnt >= 2
),
-- Priorite 3 : volume anormal par medecin -- semaine courante comparee a
-- sa propre moyenne hebdomadaire sur les ~90 jours precedents (pas les 7
-- derniers, pour ne pas comparer une periode a elle-meme). Necessite au
-- moins ~3 consultations/semaine de moyenne pour etre statistiquement
-- significatif, et un ecart de x2.5 pour se declencher.
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
-- Priorite 2 : lot de paiement dont le montant moyen par consultation
-- s'ecarte fortement de la moyenne habituelle de la clinique concernee.
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

-- Meme correction (doctor_name via fonction plutot que jointure directe)
-- sur la vue fingerprint, sans nouvelle regle.
create or replace view consultations_fingerprint_alerts_30d
with (security_invoker = true) as
select
  c.id,
  c.created_at,
  c.amount,
  c.patient_id,
  p.name as patient_name,
  coalesce(p.is_assured, false) as patient_is_assured,
  c.doctor_id,
  insurer_get_doctor_name(c.id) as doctor_name,
  c.clinic_id,
  cl.name as clinic_name,
  c.fingerprint_missing,
  c.biometric_verified_at,
  c.biometric_operator_id,
  c.biometric_clinic_id
from consultations c
left join patients p on p.id = c.patient_id
left join clinics cl on cl.id = c.clinic_id
where c.created_at >= now() - interval '30 days'
  and coalesce(p.is_assured, false) = true
  and (c.fingerprint_missing = true or c.biometric_verified_at is null)
order by c.created_at desc;
