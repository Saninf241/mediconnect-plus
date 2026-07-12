-- RLS hardening — insurer_memberships.
--
-- pg_policies montre une seule policy sur cette table :
-- insurer_memberships_rw_authenticated, ALL, {authenticated}, USING true,
-- WITH CHECK true. N'importe quel compte connecte (peu importe le cabinet
-- ou l'assureur) peut lire/creer/modifier/supprimer n'importe quelle
-- ligne de couverture d'assurance de n'importe quel patient. Cette table
-- decide si une consultation part en statut "sent" -> donnee sensible et
-- financiere actuellement grande ouverte.
--
-- Aucun code applicatif n'ecrit encore dans cette table aujourd'hui (seule
-- lecture dans NewConsultationPage.tsx) ; l'ajout manuel actuel se fait
-- via Supabase Studio (role postgres, qui contourne RLS). Ce resserrement
-- ne casse donc rien de l'existant.
--
-- Cible : staff du cabinet du patient (creation/mise a jour de la
-- declaration d'assurance) OU staff de l'assureur concerne (verification).
-- L'automatisation de la verification (conventions, dates de couverture,
-- accompagnement des assureurs non digitalises) reste a construire dans
-- une session dediee -- ceci ne fait que fermer l'acces public.

drop policy if exists "insurer_memberships_rw_authenticated" on insurer_memberships;

create policy "clinic_or_insurer_staff_can_manage_memberships"
on insurer_memberships for all
to public
using (
  exists (
    select 1 from patients p
    where p.id = insurer_memberships.patient_id
      and is_clinic_member(p.clinic_id, array['doctor', 'secretary', 'admin'])
  )
  or exists (
    select 1 from insurer_staff s
    where s.insurer_id = insurer_memberships.insurer_id
      and (
        s.clerk_user_id = (auth.jwt() ->> 'sub')
        or lower(s.email) = lower(auth.jwt() ->> 'email')
      )
  )
)
with check (
  exists (
    select 1 from patients p
    where p.id = insurer_memberships.patient_id
      and is_clinic_member(p.clinic_id, array['doctor', 'secretary', 'admin'])
  )
  or exists (
    select 1 from insurer_staff s
    where s.insurer_id = insurer_memberships.insurer_id
      and (
        s.clerk_user_id = (auth.jwt() ->> 'sub')
        or lower(s.email) = lower(auth.jwt() ->> 'email')
      )
  )
);
