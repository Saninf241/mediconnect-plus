-- Garde-fous supplementaires sur la verification des coordonnees de
-- paiement (cf. discussion : que se passe-t-il si le developpeur lui-meme
-- est malveillant/compromis, ou si la base est modifiee en direct hors du
-- workflow de l'appli ?). Deux ajouts, ni l'un ni l'autre ne bloque quoi
-- que ce soit -- ils rendent la fraude detectable plutot que silencieuse :
--
-- 1) submitted_by_email : necessaire pour notifier le cabinet par email a
--    chaque changement de statut (verifie/rejete), pour qu'un changement
--    fait hors workflow (ex: UPDATE SQL direct puis verification bidon)
--    declenche quand meme un email auquel le cabinet ne s'attendrait pas.
-- 2) verified_snapshot : copie figee des champs bancaires au moment exact
--    de la verification. Si ces champs sont modifies apres coup sans
--    repasser par clinic-submit-payment-info (qui remettrait status a
--    'pending'), la vue clinic_payment_info_drift le detecte.
alter table clinic_payment_info
  add column if not exists submitted_by_email text,
  add column if not exists verified_snapshot jsonb;

create or replace view clinic_payment_info_drift as
select
  id,
  clinic_id,
  status,
  verified_at,
  verified_snapshot,
  jsonb_build_object(
    'payment_method', payment_method,
    'bank_name', bank_name,
    'account_number', account_number,
    'account_holder_name', account_holder_name,
    'mobile_money_provider', mobile_money_provider,
    'mobile_money_number', mobile_money_number
  ) as current_values
from clinic_payment_info
where status = 'verified'
  and verified_snapshot is not null
  and verified_snapshot <> jsonb_build_object(
    'payment_method', payment_method,
    'bank_name', bank_name,
    'account_number', account_number,
    'account_holder_name', account_holder_name,
    'mobile_money_provider', mobile_money_provider,
    'mobile_money_number', mobile_money_number
  );

comment on view clinic_payment_info_drift is
  'Lignes marquees "verified" dont les champs bancaires actuels ne correspondent plus a ce qui a ete vu au moment de la verification -- signe que la ligne a ete modifiee hors du workflow normal (clinic-submit-payment-info remet toujours status a pending). Devrait toujours etre vide en fonctionnement normal.';
