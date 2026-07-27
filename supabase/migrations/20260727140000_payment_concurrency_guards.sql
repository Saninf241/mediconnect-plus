-- Durcissement concurrence : rien n'empechait aujourd'hui deux agents (ou
-- un agent + un admin, ou deux clics rapproches) d'agir en meme temps sur
-- le meme lot/consultation. generate-payment-batch lit puis ecrit sans
-- verrou -- deux appels concurrents pour la meme clinique pouvaient
-- regrouper la MEME consultation dans deux lots differents (double
-- comptage du remboursement). mark-payment-batch-paid et
-- initiate-payment-batch-payout lisaient batch.status puis l'ecrivaient
-- sans condition atomique -- deux clics concurrents pouvaient tous les
-- deux passer le lot a "paid" (et, une fois un vrai prestataire branche,
-- declencher DEUX transferts reels pour le meme lot).

-- 1) Une consultation ne peut jamais appartenir qu'a un seul lot, point.
--    Verifie sans doublon existant avant application.
alter table batch_items
  add constraint batch_items_consultation_id_unique unique (consultation_id);

-- 2) Un lot ne peut avoir qu'un seul paiement "actif" (en cours ou reussi)
--    a la fois -- sert de verrou atomique pour initiate-payment-batch-payout
--    (l'INSERT echoue si un autre appel a deja cree la ligne active, avant
--    meme d'appeler un prestataire).
create unique index if not exists idx_payment_batch_payouts_active_per_batch
  on payment_batch_payouts (batch_id)
  where status in ('initiated', 'success');
