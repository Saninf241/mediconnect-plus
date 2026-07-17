-- Lots de paiement (remboursement assureur -> clinique) scopes par assureur.
--
-- payment_batches existait deja mais sans lien vers l'assureur (une clinique
-- peut avoir des consultations de plusieurs assureurs -- un lot ne doit
-- jamais melanger deux assureurs). Colonnes nullable : les lots crees avant
-- cette migration (aucun en pratique, RLS bloquait tout acces jusqu'ici)
-- restent valides sans backfill.
alter table payment_batches
  add column if not exists insurer_id uuid references insurers(id),
  add column if not exists period_start date,
  add column if not exists period_end date,
  add column if not exists consultation_count integer,
  add column if not exists created_by_staff_id uuid references insurer_staff(id);

create index if not exists payment_batches_insurer_idx on payment_batches(insurer_id);

alter table payment_batches enable row level security;
alter table batch_items enable row level security;

-- RLS activee sur les deux tables mais sans aucune policy jusqu'ici (donc
-- tout acces via le client authentifie etait silencieusement bloque). On
-- ajoute uniquement des policies de lecture, scopees par assureur via
-- is_insurer_member() (meme fonction que le reste de l'espace assureur) --
-- toutes les ecritures (generation de lot, marquage paye) passent par les
-- edge functions avec la cle service_role, qui contourne RLS et applique
-- ses propres verifications d'autorisation cote serveur.
drop policy if exists "insurer staff can read own payment batches" on payment_batches;
create policy "insurer staff can read own payment batches"
  on payment_batches for select
  using (is_insurer_member(insurer_id));

drop policy if exists "insurer staff can read own batch items" on batch_items;
create policy "insurer staff can read own batch items"
  on batch_items for select
  using (
    exists (
      select 1 from payment_batches pb
      where pb.id = batch_items.batch_id
        and is_insurer_member(pb.insurer_id)
    )
  );
