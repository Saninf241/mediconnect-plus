-- patients.clinic_id devient une pure métadonnée ("clinique d'enregistrement
-- initial"), jamais un filtre d'accès aux consultations/remboursements — la
-- relation many-to-many réelle vit dans patient_clinic_links (voir
-- 20260705160000_patient_clinic_links_rework.sql).
comment on column patients.clinic_id is
  'Clinique d''enregistrement initial du patient (métadonnée historique). '
  'Ne JAMAIS l''utiliser comme filtre d''accès aux consultations/remboursements : '
  'utiliser patient_clinic_links pour savoir dans quelles cliniques ce patient a été vu.';

comment on table etablissements is
  'DEPRECATED : aucun usage applicatif détecté dans le repo. Ne pas y référencer '
  'de nouvelles FKs. Candidate à suppression après confirmation qu''aucun '
  'consommateur externe n''en dépend.';
