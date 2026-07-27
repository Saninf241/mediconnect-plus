-- Prepare le terrain pour un vrai declenchement de paiement (mobile money)
-- depuis l'appli, en plus du "Marquer paye" manuel existant. Aucun
-- prestataire reel n'est branche a ce stade (pas de compte marchand,
-- pas de cles API) -- seul un provider "simulated" existe pour l'instant,
-- mais le schema est pense pour brancher pawaPay/CinetPay plus tard sans
-- migration supplementaire (juste un nouveau `provider` + adapter cote
-- edge function).
create table if not exists payment_batch_payouts (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references payment_batches(id),
  provider text not null,
  destination_type text not null check (destination_type in ('mobile_money', 'bank_transfer')),
  -- Snapshot masque (jamais le numero/compte complet) -- juste de quoi
  -- afficher "Airtel Money •••1234" sans reexposer la donnee sensible
  -- une fois le paiement initie.
  destination_snapshot jsonb,
  status text not null default 'initiated' check (status in ('initiated', 'success', 'failed')),
  provider_reference text,
  failure_reason text,
  initiated_by_staff_id uuid references insurer_staff(id),
  initiated_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table payment_batch_payouts enable row level security;

create policy "insurer_can_read_own_batch_payouts"
on payment_batch_payouts for select
to authenticated
using (
  exists (
    select 1 from payment_batches pb
    where pb.id = payment_batch_payouts.batch_id
      and is_insurer_member(pb.insurer_id)
  )
);

-- L'assureur ne peut voir les coordonnees de paiement d'un cabinet que si
-- elles sont verifiees (jamais pending/rejected -- meme logique de
-- confiance que verify_clinic_payment_info) ET qu'il a une relation reelle
-- avec ce cabinet (au moins une consultation), pas n'importe quel cabinet
-- de la plateforme.
create policy "insurer_can_read_verified_payment_info"
on clinic_payment_info for select
to authenticated
using (
  status = 'verified'
  and exists (
    select 1 from consultations c
    where c.clinic_id = clinic_payment_info.clinic_id
      and is_insurer_member(c.insurer_id)
  )
);
