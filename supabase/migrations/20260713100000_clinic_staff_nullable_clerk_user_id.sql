-- Aligne clinic_staff sur le comportement deja nullable de
-- insurer_staff.clerk_user_id : depuis le passage aux invitations Clerk
-- (dev-create-clinic), clerk_user_id est insere a null tant que
-- l'invitation n'est pas acceptee. Si la colonne est NOT NULL, cet
-- insert echoue silencieusement (capture par le try/catch par membre) et
-- aucune ligne clinic_staff n'est jamais creee -> personne ne peut se
-- connecter malgre l'invitation acceptee.
--
-- Idempotent : ne fait rien si la colonne est deja nullable.
alter table clinic_staff alter column clerk_user_id drop not null;
