-- Verrouille la déduplication des patients à la création : deux identifiants
-- forts (NIN, et n° d'adhérent actif chez un assureur donné) ne doivent
-- jamais pointer vers deux fiches "patients" différentes. Sans ça, une même
-- personne peut accumuler plusieurs dossiers (un par cabinet), ce qui casse
-- le suivi anti-fraude et l'espace patient unifié.
--
-- Ces contraintes sont le filet de sécurité en base ; la vérification
-- applicative (qui retrouve le patient existant AVANT de tenter une
-- création) vit dans NewPatientWizard.tsx (ensureDraftPatient).

-- Un NIN donné ne peut appartenir qu'à un seul patient.
create unique index if not exists patients_national_id_key
  on patients(national_id)
  where national_id is not null and national_id <> '';

-- Un couple (assureur, n° d'adhérent) ne peut être actif que sur une seule
-- fiche patient à la fois (un changement d'assureur/replan désactive
-- l'ancienne adhésion avant qu'une nouvelle puisse être créée).
create unique index if not exists insurer_memberships_active_member_key
  on insurer_memberships(insurer_id, member_no)
  where is_active = true and member_no is not null and member_no <> '';
