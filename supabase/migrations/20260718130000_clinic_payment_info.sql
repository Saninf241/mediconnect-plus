-- Coordonnees de paiement d'un cabinet (RIB / mobile money), avec
-- verification obligatoire avant de devenir la destination active des
-- virements (voir generate-payment-batch / phase remboursement).
--
-- Design (valide avec l'utilisateur) :
-- - Seul un admin (cabinet multi-specialiste) ou un medecin (cabinet
--   specialiste solo, qui n'a pas de role admin distinct) peut soumettre
--   ou modifier ces informations. La secretaire n'y a jamais acces.
-- - Toute soumission/modification part au statut 'pending' -- jamais
--   'verified' directement, meme en re-soumettant : une modification
--   invalide la verification precedente.
-- - Verification = action manuelle du developpeur/support Mediconnect+
--   (meme modele que dev-manage-orgs pour les cas sensibles). Une
--   confirmation par email au cabinet est une amelioration possible plus
--   tard, pas construite ici.
-- - Toutes les ecritures passent par des edge functions (service_role) :
--   aucune policy RLS d'ecriture cote client, seulement une policy de
--   lecture pour que le cabinet voie l'etat de sa propre soumission.
create table if not exists clinic_payment_info (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null unique references clinics(id) on delete cascade,

  payment_method text not null check (payment_method in ('bank_transfer', 'mobile_money')),
  bank_name text,
  account_number text,
  account_holder_name text,
  mobile_money_provider text,
  mobile_money_number text,

  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),

  submitted_by_clerk_user_id text,
  submitted_by_role text,
  submitted_by_name text,
  submitted_at timestamptz not null default now(),

  verified_by_email text,
  verified_at timestamptz,
  rejection_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clinic_payment_info_status_idx on clinic_payment_info(status);

alter table clinic_payment_info enable row level security;

drop policy if exists "clinic can read own payment info" on clinic_payment_info;
create policy "clinic can read own payment info"
  on clinic_payment_info for select
  using (is_clinic_member(clinic_id, array['admin', 'doctor']));
