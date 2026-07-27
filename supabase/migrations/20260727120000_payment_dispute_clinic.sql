-- Permet a un admin/secretaire/medecin de cabinet de signaler un montant
-- de remboursement assureur qu'il conteste (insurer_amount), avec un motif
-- et une resolution cote assureur. La discussion se fait via la messagerie
-- existante (table messages, deja lisible/inscriptible par les deux cotes
-- via consultation_id -- voir 20260712170000_rls_hardening_messages_*).
--
-- Colonnes plates sur consultations, meme convention que insurer_comment/
-- insurer_decision_at/insurer_decision_by_email deja en place.
alter table consultations
  add column if not exists payment_dispute_status text,
  add column if not exists payment_dispute_reason text,
  add column if not exists payment_disputed_by_staff_id uuid references clinic_staff(id),
  add column if not exists payment_disputed_at timestamptz,
  add column if not exists payment_dispute_resolved_by_staff_id uuid references insurer_staff(id),
  add column if not exists payment_dispute_resolved_at timestamptz;

alter table consultations
  drop constraint if exists consultations_payment_dispute_status_check;
alter table consultations
  add constraint consultations_payment_dispute_status_check
  check (payment_dispute_status is null or payment_dispute_status in ('open', 'resolved'));

-- Ecriture cote cabinet (clinic_staff_can_update_consultations, deja
-- scopee doctor/secretary/admin de la clinique) et cote assureur
-- (insurer_update_consultations, deja role-agnostique) couvrent deja ces
-- nouvelles colonnes sans policy dediee -- ce sont des policies au niveau
-- ligne, pas colonne.

-- Index partiel : generate-payment-batch doit exclure les consultations en
-- litige ouvert a chaque generation de lot.
create index if not exists idx_consultations_payment_dispute_open
  on consultations (insurer_id)
  where payment_dispute_status = 'open';
