-- Conventions cabinet <-> assureur : sans ca, n'importe quel cabinet
-- pouvait declarer un patient assure chez n'importe quel assureur de la
-- plateforme (le formulaire secretaire chargeait TOUS les assureurs sans
-- filtre). Gestion reservee au developpeur pour l'instant (comme
-- clinics/insurers), via dev-manage-orgs -- pas de policy INSERT/UPDATE/
-- DELETE pour le personnel de cabinet.

create table if not exists clinic_insurer_conventions (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  insurer_id uuid not null references insurers(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (clinic_id, insurer_id)
);

create index if not exists clinic_insurer_conventions_clinic_idx on clinic_insurer_conventions(clinic_id);
create index if not exists clinic_insurer_conventions_insurer_idx on clinic_insurer_conventions(insurer_id);

alter table clinic_insurer_conventions enable row level security;

-- Le personnel du cabinet doit pouvoir lire UNIQUEMENT les conventions de
-- son propre cabinet, pour peupler la liste d'assureurs proposee a la
-- creation d'un patient assure.
create policy "clinic_staff_can_read_own_conventions"
on clinic_insurer_conventions for select
to public
using (is_clinic_member(clinic_id));
