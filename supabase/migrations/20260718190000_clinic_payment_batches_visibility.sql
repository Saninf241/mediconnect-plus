-- Le cabinet n'avait aucune visibilite sur le workflow de remboursement
-- assureur construit cette session (payment_batches n'avait qu'une
-- policy pour l'assureur proprietaire). Le cabinet doit pouvoir voir ses
-- propres lots (montant, statut, date de paiement) -- c'est son argent.
drop policy if exists "clinic can read own payment batches" on payment_batches;
create policy "clinic can read own payment batches"
  on payment_batches for select
  using (is_clinic_member(clinic_id));
