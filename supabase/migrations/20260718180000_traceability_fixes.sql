-- Trouve en auditant le point 2 (tracabilite) demande par l'utilisateur.
--
-- 1) Bug reel : propose-manual-pricing / review-manual-pricing selectionnaient
--    insurer_staff.name, qui n'existe pas (insurer_staff n'a que : id,
--    insurer_id, email, clerk_user_id, role, created_at -- contrairement a
--    clinic_staff qui a bien un name). Ces deux fonctions auraient
--    plante a chaque appel en production. Renomme les colonnes pour
--    refleter ce qu'on peut reellement stocker (email).
alter table consultation_manual_pricing rename column proposed_by_name to proposed_by_email;
alter table consultation_manual_pricing rename column approved_by_name to approved_by_email;

-- 2) Deux trous de tracabilite reels sur des actions qui engagent de
--    l'argent :
--    - accepter/rejeter une consultation ne notait que la date de
--      decision (insurer_decision_at), jamais QUI a decide.
--    - marquer un lot de paiement paye ne notait rien du tout sur qui
--      l'a fait (ni id ni email).
alter table consultations
  add column if not exists insurer_decision_by_staff_id uuid references insurer_staff(id),
  add column if not exists insurer_decision_by_email text;

alter table payment_batches
  add column if not exists paid_by_staff_id uuid references insurer_staff(id),
  add column if not exists paid_by_email text;
