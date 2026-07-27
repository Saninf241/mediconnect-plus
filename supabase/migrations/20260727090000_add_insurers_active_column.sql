-- clinics avait deja "active" (bool) mais insurers n'a aucun equivalent --
-- ajoute pour permettre une suspension temporaire symetrique a celle des
-- cabinets depuis l'espace developpeur, sans passer par une suppression
-- definitive.
alter table insurers add column if not exists active boolean not null default true;
