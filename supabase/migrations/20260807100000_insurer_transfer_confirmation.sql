-- Jusqu'ici un admin assureur pouvait faire passer un lot directement de
-- "pending" a "paid" (mark-payment-batch-paid / initiate-payment-batch-payout),
-- ce qui marquait la clinique payee sans qu'aucun virement n'ait jamais
-- transite par Mediconnect+ -- l'assureur payait la clinique en direct.
--
-- Nouveau cycle voulu : l'assureur vire le montant du lot a Mediconnect+,
-- declare ce virement (nouvelle fonction declare-batch-transfer), et
-- seul un compte "developer" (Mediconnect+) confirme la reception reelle
-- des fonds avant de reverser/marquer paye le cabinet. Les actions qui
-- faisaient passer un lot a "paid" sont donc desormais reservees au role
-- developer et exigent que le lot soit deja "transfer_declared".
--
-- pending            = lot genere, en attente de virement assureur -> Mediconnect+.
-- transfer_declared  = assureur a declare avoir vire le montant, en attente
--                       de confirmation Mediconnect+.
-- paid               = Mediconnect+ a confirme la reception des fonds ET
--                       reverse/marque paye le cabinet.
alter table payment_batches
  add column if not exists insurer_transfer_reference text,
  add column if not exists insurer_transfer_declared_at timestamptz,
  add column if not exists insurer_transfer_declared_by_staff_id uuid references insurer_staff(id),
  add column if not exists funds_confirmed_at timestamptz,
  add column if not exists funds_confirmed_by_email text;

-- La contrainte de statut d'origine (si elle existe -- cette table a ete
-- creee avant l'usage systematique de migrations versionnees dans ce
-- projet, son nom de contrainte n'est donc pas garanti) ne connait pas
-- 'transfer_declared'. On la retrouve dynamiquement et on la remplace.
do $$
declare
  con record;
begin
  for con in
    select conname from pg_constraint
    where conrelid = 'public.payment_batches'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.payment_batches drop constraint %I', con.conname);
  end loop;
end $$;

alter table public.payment_batches
  add constraint payment_batches_status_check
  check (status in ('pending', 'transfer_declared', 'paid'));

create index if not exists payment_batches_status_idx on payment_batches(status);

comment on column payment_batches.status is
  'pending = lot genere, en attente de virement assureur vers Mediconnect+. transfer_declared = virement declare par l''assureur, en attente de confirmation Mediconnect+. paid = fonds confirmes recus par Mediconnect+ et reverses/marques payes au cabinet.';
