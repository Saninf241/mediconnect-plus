-- Resserre consultation_medications, table pre-existante (pas creee par nos
-- migrations, donc absente du repo jusqu'ici) dont la seule policy SELECT
-- ("anyone can read consultation_medications", qual = true) permet a
-- n'importe quel role authentifie de lire toutes les lignes, sans filtre
-- clinique/medecin/patient. Sans lien avec le chantier pharmacie en cours
-- (cf. 20260806120000_pharmacy_dispense.sql) : la pharmacie ne lit jamais
-- cette table (elle passe par consultations.medications + la RPC
-- pharmacy_lookup_by_code), et l'espace patient la lit via l'Edge Function
-- patient-portal-data qui utilise la service role key (hors RLS). Verifie
-- avant cette migration : aucune page front (patient/medecin/pharmacie) ne
-- requete consultation_medications avec la cle anon/authenticated.
--
-- Meme patron que clinic_staff_can_read_consultations (consultations) et
-- pharmacy_deliveries_read_clinic (pharmacy_deliveries) : jointure sur
-- consultation_medications.consultation_id -> consultations, puis memes
-- fonctions is_clinic_member / doctor_can_read_consultation.

drop policy if exists "anyone can read consultation_medications" on consultation_medications;

create policy "clinic_staff_can_read_consultation_medications"
on consultation_medications for select
to public
using (
  exists (
    select 1 from consultations c
    where c.id = consultation_medications.consultation_id
      and (
        is_clinic_member(c.clinic_id, array['secretary', 'admin'])
        or public.doctor_can_read_consultation(c.doctor_id)
      )
  )
);
