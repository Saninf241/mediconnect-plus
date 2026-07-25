-- Un medecin dont la consultation est bloquee en tarification manuelle
-- (compute_consultation_pricing echoue ou l'assureur conteste) n'avait
-- aucune visibilite sur consultation_manual_pricing : seule une policy
-- pour l'assureur proprietaire existait (20260718170000). Le medecin doit
-- pouvoir voir le montant propose et la justification pour comprendre
-- pourquoi sa consultation est en attente -- lecture seule, l'approbation
-- reste reservee a l'assureur via les edge functions existantes.
-- doctor_can_read_consultation(p_doctor_id) prend un id de MEDECIN (pas de
-- consultation) depuis la refonte anti-recursion du 2026-07-18 -- on lui
-- passe donc consultations.doctor_id, pas consultations.id.
drop policy if exists "doctor can read own consultation manual pricing" on consultation_manual_pricing;
create policy "doctor can read own consultation manual pricing"
  on consultation_manual_pricing for select
  using (
    exists (
      select 1
      from consultations c
      where c.id = consultation_manual_pricing.consultation_id
        and doctor_can_read_consultation(c.doctor_id)
    )
  );
