-- Base d'adherents declaree par l'assureur (insurer_member_directory).
--
-- Pour les assureurs N2 (base consultable mais uniquement via action
-- humaine, ex portail web) et N3 (aucune base numerique), Mediconnect+ ne
-- peut pas verifier une adhesion en temps reel automatise. Cette table
-- permet a un agent assureur (staff admin, cf policy plus bas) -- ou au
-- developpeur pour un assureur N3 sans compte staff operationnel, via
-- dev-manage-orgs en service_role -- de declarer les adherents verifies
-- cote assureur (portail, fichier recu, etc.), pour que le cabinet
-- beneficie ensuite d'un matching best-effort au moment de la
-- declaration d'un patient assure (cf edge function
-- match-insurer-directory). Ca ne remplace jamais une vraie integration
-- N1 -- c'est un pont temporaire pendant la digitalisation progressive.
--
-- Design volontairement minimal : pas de table d'historique separee,
-- uniquement created_by_*/updated_by_* facon support_tickets
-- (20260712160000). L'anti-fraude vient de deux choses : (1) la RLS
-- n'autorise l'ecriture directe qu'au staff ADMIN de CET assureur sur CET
-- assureur (pas d'agent, pas d'autre assureur) ; (2) chaque ligne
-- affiche qui l'a creee/modifiee et quand, visible dans l'UI assureur.
create table if not exists insurer_member_directory (
  id uuid primary key default gen_random_uuid(),
  insurer_id uuid not null references insurers(id) on delete cascade,

  full_name text not null,
  national_id text,
  member_no text,
  plan_code text,
  is_active boolean not null default true,
  notes text,

  created_at timestamptz not null default now(),
  created_by_clerk_user_id text not null,
  -- 'developer' couvre le cas d'un assureur N3 sans staff operationnel,
  -- ou l'ajout se fait pour son compte via dev-manage-orgs (service_role,
  -- bypass RLS -- ce check reste le seul garde-fou pour cette valeur).
  created_by_role text not null check (created_by_role in ('admin', 'developer')),
  created_by_name text,
  created_by_email text,

  updated_at timestamptz not null default now(),
  updated_by_clerk_user_id text,
  updated_by_role text,
  updated_by_name text,
  updated_by_email text,

  -- Une ligne doit porter au moins un identifiant exploitable pour le
  -- matching (sinon elle ne sert a rien pour la fonctionnalite).
  constraint insurer_member_directory_identifier_check
    check (member_no is not null or national_id is not null)
);

-- Le matching se fait par (insurer_id, member_no) ou (insurer_id,
-- national_id) -- index dedies pour que l'edge function reste rapide
-- meme avec une base d'adherents volumineuse.
create index if not exists insurer_member_directory_insurer_idx
  on insurer_member_directory(insurer_id);
create index if not exists insurer_member_directory_national_id_idx
  on insurer_member_directory(insurer_id, national_id) where national_id is not null;

-- Evite qu'un meme assureur declare deux fois le meme n d'adherent
-- (erreur de saisie la plus probable pour un agent qui ressaisit a la
-- main depuis un portail externe).
create unique index if not exists insurer_member_directory_unique_member_no
  on insurer_member_directory(insurer_id, member_no) where member_no is not null;

alter table insurer_member_directory enable row level security;

-- Lecture : tout le staff de l'assureur concerne (admin ET agent) --
-- utile pour qu'un agent voie ce que l'admin a declare, meme s'il ne
-- peut pas l'editer lui-meme.
create policy "insurer_staff_can_read_own_directory"
on insurer_member_directory for select
to public
using (is_insurer_member(insurer_id));

-- Ecriture : reservee aux admins de l'assureur concerne. Les agents ne
-- peuvent pas ajouter/modifier de donnees de couverture -- ca reduit la
-- surface de fraude (un agent compromis ou malveillant ne peut pas
-- injecter un faux adherent pour faire passer une consultation).
create policy "insurer_admin_can_manage_own_directory"
on insurer_member_directory for all
to public
using (is_insurer_member(insurer_id, array['admin']))
with check (is_insurer_member(insurer_id, array['admin']));

-- Volontairement AUCUNE policy pour clinic_staff : le matching cote
-- cabinet passe exclusivement par l'edge function service-role
-- match-insurer-directory, qui ne renvoie jamais qu'un resultat oui/non
-- + plan_code -- jamais la liste brute des adherents (ca exposerait les
-- volumes/identites de la base assureur au cabinet, un vrai probleme de
-- confidentialite/business).
