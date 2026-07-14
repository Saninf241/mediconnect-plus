-- Tracabilite + lien vers le matching sur insurer_memberships.
--
-- Colonnes nullable (jamais NOT NULL) : le flux d'insertion doit rester
-- strictement best-effort. Une ligne inseree sans ces infos (ancien
-- code, script SQL manuel, futur import) reste valide -- rien ne doit
-- bloquer sur l'absence de tracabilite.
alter table insurer_memberships
  add column if not exists created_by_clerk_user_id text,
  add column if not exists created_by_role text,
  add column if not exists created_by_name text,
  add column if not exists created_by_email text,
  add column if not exists matched_directory_id uuid
    references insurer_member_directory(id);

create index if not exists insurer_memberships_matched_directory_idx
  on insurer_memberships(matched_directory_id);
