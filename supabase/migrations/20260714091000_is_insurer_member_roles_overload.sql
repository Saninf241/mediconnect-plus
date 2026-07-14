-- Etend is_insurer_member() avec un parametre p_roles, miroir de
-- is_clinic_member(p_clinic_id, p_roles) -- mais PAS de la meme facon.
--
-- is_clinic_member a eu 2 arguments des sa toute premiere migration
-- (20260712141000) : il n'existe aucune ancienne version 1-arg a
-- preserver. is_insurer_member, elle, existe deja en production en
-- version 1-arg (20260712160000_support_tickets.sql) et est referencee
-- par des policies VIVANTES : support_tickets, support_ticket_messages
-- (meme migration) et les policies de lecture clinics/patients/
-- clinic_staff (20260712170000_rls_hardening_messages_notifications_clinics_views.sql).
-- Un `drop function` suivi d'un recreate en 2 arguments echouerait
-- ("cannot drop function ... other objects depend on it") ou, en
-- CASCADE, supprimerait ces policies de prod.
--
-- On ajoute donc un SECOND OVERLOAD (2 arguments) plutot que de
-- remplacer l'existant : Postgres distingue les fonctions par
-- (nom, types d'arguments), donc les deux versions coexistent sans
-- conflit -- A CONDITION que le 2e parametre n'ait PAS de valeur par
-- defaut. Avec un `default null`, un appel a 1 seul argument devient
-- ambigu (Postgres hesite entre l'ancienne fonction 1-arg et la nouvelle
-- 2-arg completee par sa valeur par defaut) et echoue avec "is not
-- unique" -- casse alors TOUTES les policies existantes qui appellent
-- is_insurer_member(x) a 1 argument (support_tickets, messages,
-- notifications, clinics, patients). D'ou l'absence de valeur par
-- defaut ici : le nouveau code (RLS de insurer_member_directory) doit
-- toujours appeler la version a 2 arguments explicitement.
create or replace function public.is_insurer_member(
  p_insurer_id uuid,
  p_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from insurer_staff s
    where s.insurer_id = p_insurer_id
      and (p_roles is null or s.role = any(p_roles))
      and (
        s.clerk_user_id = (auth.jwt() ->> 'sub')
        or lower(s.email) = lower(auth.jwt() ->> 'email')
      )
  );
$$;
