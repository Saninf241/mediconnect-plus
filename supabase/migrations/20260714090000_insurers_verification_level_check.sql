-- Contrainte sur insurers.verification_level.
--
-- La colonne existe deja et est deja utilisee comme "N1"/"N2"/"N3" partout
-- cote application (NewInsurerPage.tsx, ManageOrgsPage.tsx,
-- NewPatientWizard.tsx), mais rien en base n'empeche d'y inserer
-- n'importe quelle valeur (SQL Editor manuel, futur script, faute de
-- frappe dans une Edge Function). On ne peut pas interroger l'etat actuel
-- de la prod via CLI ici, donc avant d'ajouter la contrainte on neutralise
-- defensivement toute valeur qui ne serait pas N1/N2/N3 en la ramenant au
-- niveau le plus prudent (N3 = declaratif, accompagnement humain) plutot
-- que de bloquer la migration ou de deviner une valeur "correcte".
update insurers
set verification_level = 'N3'
where verification_level is null
   or verification_level not in ('N1', 'N2', 'N3');

alter table insurers
  alter column verification_level set not null;

alter table insurers
  drop constraint if exists insurers_verification_level_check;

alter table insurers
  add constraint insurers_verification_level_check
  check (verification_level in ('N1', 'N2', 'N3'));
