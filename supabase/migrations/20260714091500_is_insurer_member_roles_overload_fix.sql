-- Correctif de 20260714091000 : la fonction is_insurer_member(uuid, text[])
-- a ete creee avec `p_roles text[] default null`. Avec un parametre par
-- defaut, un appel a 1 seul argument (is_insurer_member(x), utilise
-- partout ailleurs : support_tickets, messages, notifications, clinics,
-- patients) devient ambigu entre l'ancienne fonction 1-arg et celle-ci
-- completee par sa valeur par defaut -> erreur "function is_insurer_member
-- (uuid) is not unique". On retire le default : un appel a 1 argument ne
-- peut alors plus matcher cette fonction a 2 parametres, l'ambiguite
-- disparait, et tout le reste du code (qui appelle toujours explicitement
-- 1 ou 2 arguments) continue de fonctionner sans changement.
--
-- Postgres refuse un `create or replace` qui retirerait une valeur par
-- defaut existante ("cannot remove parameter defaults from existing
-- function") -- il faut d'abord DROP explicitement cette surcharge avant
-- de la recreer. Sans risque : rien ne depend encore de cette version
-- 2-arg (la table insurer_member_directory qui l'utilise n'est pas
-- encore creee a ce stade), donc aucun DROP CASCADE necessaire.
drop function if exists public.is_insurer_member(uuid, text[]);

create function public.is_insurer_member(
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
