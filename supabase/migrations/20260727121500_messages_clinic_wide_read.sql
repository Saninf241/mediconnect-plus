-- La contestation de remboursement (migration 20260727120000) fait
-- discuter un admin de cabinet avec l'assureur via la messagerie
-- existante (table messages, reutilisee sans schema dedie). Mais
-- "messages_select_participants" (20260712170000) ne laisse lire les
-- messages d'une consultation qu'au clinic_staff qui EN EST le
-- doctor_id -- un admin qui conteste un remboursement sur une
-- consultation d'un AUTRE medecin de son cabinet ne pourrait jamais
-- relire son propre message (getMessages() renverrait toujours vide,
-- alors que l'insert, lui, passe deja via la policy tres permissive
-- "doctor_or_insurer_can_insert_messages"). Policy additive (permissive,
-- combinee en OR) : ne retire rien, elargit juste la lecture a tout le
-- staff du cabinet proprietaire de la consultation, meme convention que
-- clinic_staff_can_read_consultations (role in doctor/secretary/admin).
create policy "clinic_staff_can_read_clinic_messages"
on messages for select
to public
using (
  exists (
    select 1 from consultations c
    join clinic_staff cs on cs.clinic_id = c.clinic_id
    where c.id = messages.consultation_id
      and cs.clerk_user_id = (auth.jwt() ->> 'sub')
      and cs.role in ('doctor', 'secretary', 'admin')
  )
);
