-- Espace tickets support : secretaire/admin/medecin/assureur -> developpeur.
--
-- Design coherent avec le reste du schema Clerk+Supabase de ce projet :
--   - clinic_staff / insurer_staff lisent/creent/modifient uniquement les
--     tickets de LEUR cabinet/assureur (RLS scopee via is_clinic_member /
--     is_insurer_member, meme pattern que patients/consultations).
--   - le role "developer" n'a AUCUNE policy sur ces tables. Comme pour
--     dev-create-clinic/dev-create-insurer, l'espace developpeur accede a
--     TOUS les tickets exclusivement via une Edge Function (service role
--     key + verification Clerk publicMetadata.role === 'developer'), pas
--     via un JWT/claim cote client. Ca evite d'avoir a faire confiance a
--     un claim de role dans la policy RLS et ca garde un seul point
--     d'entree audite pour l'acces "tous cabinets confondus".

create table if not exists support_tickets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  created_by_clerk_user_id text not null,
  created_by_role text not null check (created_by_role in ('doctor', 'secretary', 'admin', 'assureur')),
  created_by_name text,
  created_by_email text,
  callback_phone text,

  clinic_id uuid references clinics(id),
  insurer_id uuid references insurers(id),

  subject text not null,
  message text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  resolved_at timestamptz,

  constraint support_tickets_owner_check check (clinic_id is not null or insurer_id is not null)
);

create index if not exists support_tickets_clinic_idx on support_tickets(clinic_id);
create index if not exists support_tickets_insurer_idx on support_tickets(insurer_id);
create index if not exists support_tickets_status_idx on support_tickets(status);

create table if not exists support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references support_tickets(id) on delete cascade,
  created_at timestamptz not null default now(),

  author_clerk_user_id text not null,
  author_role text not null, -- 'doctor' | 'secretary' | 'admin' | 'assureur' | 'developer'
  author_name text,
  body text not null
);

create index if not exists support_ticket_messages_ticket_idx on support_ticket_messages(ticket_id);

create or replace function public.touch_support_ticket()
returns trigger
language plpgsql
as $$
begin
  update support_tickets set updated_at = now() where id = new.ticket_id;
  return new;
end;
$$;

drop trigger if exists support_ticket_messages_touch on support_ticket_messages;
create trigger support_ticket_messages_touch
after insert on support_ticket_messages
for each row execute function public.touch_support_ticket();

alter table support_tickets enable row level security;
alter table support_ticket_messages enable row level security;

-- Meme pattern que is_clinic_member() (20260712141000) mais pour insurer_staff.
create or replace function public.is_insurer_member(p_insurer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from insurer_staff s
    where s.insurer_id = p_insurer_id
      and (
        s.clerk_user_id = (auth.jwt() ->> 'sub')
        or lower(s.email) = lower(auth.jwt() ->> 'email')
      )
  );
$$;

create policy "org_can_read_own_tickets"
on support_tickets for select
to public
using (
  (clinic_id is not null and is_clinic_member(clinic_id))
  or (insurer_id is not null and is_insurer_member(insurer_id))
);

create policy "org_can_create_own_tickets"
on support_tickets for insert
to public
with check (
  (clinic_id is not null and is_clinic_member(clinic_id))
  or (insurer_id is not null and is_insurer_member(insurer_id))
);

create policy "org_can_update_own_tickets"
on support_tickets for update
to public
using (
  (clinic_id is not null and is_clinic_member(clinic_id))
  or (insurer_id is not null and is_insurer_member(insurer_id))
)
with check (
  (clinic_id is not null and is_clinic_member(clinic_id))
  or (insurer_id is not null and is_insurer_member(insurer_id))
);

create policy "org_can_read_own_ticket_messages"
on support_ticket_messages for select
to public
using (
  exists (
    select 1 from support_tickets t
    where t.id = support_ticket_messages.ticket_id
      and (
        (t.clinic_id is not null and is_clinic_member(t.clinic_id))
        or (t.insurer_id is not null and is_insurer_member(t.insurer_id))
      )
  )
);

create policy "org_can_add_own_ticket_messages"
on support_ticket_messages for insert
to public
with check (
  exists (
    select 1 from support_tickets t
    where t.id = support_ticket_messages.ticket_id
      and (
        (t.clinic_id is not null and is_clinic_member(t.clinic_id))
        or (t.insurer_id is not null and is_insurer_member(t.insurer_id))
      )
  )
);
