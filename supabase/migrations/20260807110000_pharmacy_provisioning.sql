-- Provisioning des comptes pharmacien : même patron que clinic_staff /
-- insurer_staff (invitation Clerk envoyée depuis dev-manage-orgs, backfill
-- du user_id par le webhook clerk-webhook-user-created au moment de
-- l'acceptation), + fonction de suppression complète pour que le
-- développeur puisse nettoyer une pharmacie de test comme il le fait déjà
-- pour un cabinet/assureur (dev_delete_clinic / dev_delete_insurer).

-- "status" permet de désactiver l'accès applicatif d'un pharmacien sans
-- perdre l'historique (même besoin que clinic_staff.status), au cas où une
-- suppression franche se heurterait un jour à un historique réel.
alter table pharmacy_staff
  add column if not exists status text not null default 'active';

-- user_id était NOT NULL, ce qui est incompatible avec le flux d'invitation
-- (clinic_staff.clerk_user_id / insurer_staff.clerk_user_id) : la ligne est
-- créée dès l'envoi de l'invitation, avant que la personne ait un compte
-- Clerk, puis remplie par clerk-webhook-user-created à l'acceptation.
alter table pharmacy_staff
  alter column user_id drop not null;

create or replace function dev_delete_pharmacy(p_pharmacy_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  -- Les consultations ne sont pas supprimées (donnée médicale réelle côté
  -- cabinet) : on retire juste l'association facultative à cette pharmacie,
  -- même logique que dev_delete_insurer qui détache plutôt que supprime.
  update consultations set pharmacy_id = null where pharmacy_id = p_pharmacy_id;

  delete from pharmacy_deliveries where pharmacy_id = p_pharmacy_id;
  delete from pharmacy_staff where pharmacy_id = p_pharmacy_id;
  delete from pharmacies where id = p_pharmacy_id;
end;
$$;
