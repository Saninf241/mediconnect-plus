-- Les rendez-vous (secretaire) et les consultations (medecin) etaient
-- totalement deconnectes : aucune colonne ne les reliait, donc une
-- secretaire qui pointe un patient "Venu" et un medecin qui termine sa
-- consultation sont deux actions independantes qui ne se recoupent jamais.
-- Ajoute un lien optionnel, rempli cote frontend (NewConsultationPage) au
-- moment ou une consultation est enregistree pour un patient qui a un
-- rendez-vous du jour encore ouvert (planned/waiting) -- la consultation
-- referme alors automatiquement le rendez-vous (status='done').
alter table consultations
  add column if not exists appointment_id uuid references appointments(id) on delete set null;

create index if not exists consultations_appointment_id_idx on consultations(appointment_id);
