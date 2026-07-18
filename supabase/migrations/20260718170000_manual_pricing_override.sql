-- Surcharge manuelle du montant assureur, quand le calcul automatique
-- (compute_consultation_pricing) est bloque (acte non tarifable, tarif
-- manquant) ou que l'agent estime le calcul errone (acte perime, etc.).
-- Non bloquant par design : une proposition en attente n'empeche rien
-- d'autre d'avancer, elle donne juste une voie de sortie a un dossier
-- sinon coince. Necessite toujours une validation de l'admin de
-- l'assureur avant de devenir le montant actif -- jamais auto-approuvee,
-- meme par celui qui l'a proposee.
create table if not exists consultation_manual_pricing (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null unique references consultations(id) on delete cascade,
  insurer_id uuid not null references insurers(id),

  proposed_amount numeric not null,
  justification text,

  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),

  proposed_by_staff_id uuid references insurer_staff(id),
  proposed_by_name text,
  proposed_at timestamptz not null default now(),

  approved_by_staff_id uuid references insurer_staff(id),
  approved_by_name text,
  approved_at timestamptz,
  rejection_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists consultation_manual_pricing_insurer_idx on consultation_manual_pricing(insurer_id);
create index if not exists consultation_manual_pricing_status_idx on consultation_manual_pricing(status);

alter table consultation_manual_pricing enable row level security;

-- Lecture seule cote client (agent + admin de l'assureur) ; toutes les
-- ecritures passent par des edge functions (service_role) pour garantir
-- que seul un admin peut faire passer une proposition a "approved", et
-- que l'approbation ecrit consultations.insurer_amount de facon
-- coherente avec le reste du workflow de remboursement.
drop policy if exists "insurer staff can read own manual pricing" on consultation_manual_pricing;
create policy "insurer staff can read own manual pricing"
  on consultation_manual_pricing for select
  using (is_insurer_member(insurer_id));
