-- RLS hardening — step 1/2 (ADDITIF, ne supprime rien).
--
-- Contexte : pg_policies montre que patients/consultations/clinic_staff ont
-- RLS activee mais avec des policies grand-ouvertes en parallele des
-- policies scopees (ex: "anyone can read consultations" USING true,
-- "dev_all_roles_can_read_patients" USING true, "authenticated can update
-- consultations" USING true). En Postgres, les policies PERMISSIVE se
-- combinent en OU : une seule policy large rend inutiles toutes les autres,
-- meme correctement scopees. Resultat actuel : n'importe qui possedant la
-- cle anon (visible cote front) peut lire/modifier patients et
-- consultations sans etre lie a un cabinet.
--
-- Cette migration ajoute les policies scopees manquantes pour que
-- secretaire/medecin/admin/assureur gardent un acces complet une fois que
-- l'etape 2 supprimera les policies larges. Les Edge Functions (service
-- role key) ne sont pas affectees par RLS, donc les flux de creation
-- (dev-create-clinic, dev-create-insurer) continuent de fonctionner tels
-- quels.
--
-- Condition d'appartenance reutilisee partout ci-dessous : le compte
-- appelant doit correspondre a une ligne clinic_staff (ou insurer_staff)
-- du meme cabinet/assureur que la ligne visee. On matche a la fois sur
-- auth.uid() et auth.jwt()->>'sub' car les deux formes coexistent deja
-- dans le schema existant (clinic_staff_can_read_patients utilise
-- auth.uid(), clerk_doctor_can_update_consultations utilise
-- auth.jwt()->>'sub') et on ne sait pas encore laquelle est effectivement
-- peuplee en prod pour chaque session -> on couvre les deux pour ne rien
-- casser.

-- ============================================================
-- patients : creation / modification par le staff du cabinet
-- ============================================================

create policy "clinic_staff_can_insert_patients"
on patients for insert
to public
with check (
  exists (
    select 1 from clinic_staff cs
    where cs.clinic_id = patients.clinic_id
      and cs.role in ('doctor', 'secretary', 'admin')
      and (
        cs.clerk_user_id = (auth.uid())::text
        or cs.clerk_user_id = (auth.jwt() ->> 'sub')
        or lower(cs.email) = lower(auth.jwt() ->> 'email')
      )
  )
);

create policy "clinic_staff_can_update_patients"
on patients for update
to public
using (
  exists (
    select 1 from clinic_staff cs
    where cs.clinic_id = patients.clinic_id
      and cs.role in ('doctor', 'secretary', 'admin')
      and (
        cs.clerk_user_id = (auth.uid())::text
        or cs.clerk_user_id = (auth.jwt() ->> 'sub')
        or lower(cs.email) = lower(auth.jwt() ->> 'email')
      )
  )
)
with check (
  exists (
    select 1 from clinic_staff cs
    where cs.clinic_id = patients.clinic_id
      and cs.role in ('doctor', 'secretary', 'admin')
      and (
        cs.clerk_user_id = (auth.uid())::text
        or cs.clerk_user_id = (auth.jwt() ->> 'sub')
        or lower(cs.email) = lower(auth.jwt() ->> 'email')
      )
  )
);

-- ============================================================
-- consultations : lecture / creation / modification par le staff
-- du cabinet concerne (en plus de clerk_doctor_can_update_consultations
-- qui reste specifique au medecin proprietaire)
-- ============================================================

create policy "clinic_staff_can_read_consultations"
on consultations for select
to public
using (
  exists (
    select 1 from clinic_staff cs
    where cs.clinic_id = consultations.clinic_id
      and cs.role in ('doctor', 'secretary', 'admin')
      and (
        cs.clerk_user_id = (auth.uid())::text
        or cs.clerk_user_id = (auth.jwt() ->> 'sub')
        or lower(cs.email) = lower(auth.jwt() ->> 'email')
      )
  )
);

create policy "clinic_staff_can_insert_consultations"
on consultations for insert
to public
with check (
  exists (
    select 1 from clinic_staff cs
    where cs.clinic_id = consultations.clinic_id
      and cs.role in ('doctor', 'secretary', 'admin')
      and (
        cs.clerk_user_id = (auth.uid())::text
        or cs.clerk_user_id = (auth.jwt() ->> 'sub')
        or lower(cs.email) = lower(auth.jwt() ->> 'email')
      )
  )
);

create policy "clinic_staff_can_update_consultations"
on consultations for update
to public
using (
  exists (
    select 1 from clinic_staff cs
    where cs.clinic_id = consultations.clinic_id
      and cs.role in ('doctor', 'secretary', 'admin')
      and (
        cs.clerk_user_id = (auth.uid())::text
        or cs.clerk_user_id = (auth.jwt() ->> 'sub')
        or lower(cs.email) = lower(auth.jwt() ->> 'email')
      )
  )
)
with check (
  exists (
    select 1 from clinic_staff cs
    where cs.clinic_id = consultations.clinic_id
      and cs.role in ('doctor', 'secretary', 'admin')
      and (
        cs.clerk_user_id = (auth.uid())::text
        or cs.clerk_user_id = (auth.jwt() ->> 'sub')
        or lower(cs.email) = lower(auth.jwt() ->> 'email')
      )
  )
);

-- ============================================================
-- clinic_staff : un membre du cabinet peut voir ses collegues du
-- meme cabinet (annuaire / planning), en plus de admin_whitelist_*
-- (gestion complete reservee a l'admin whitelist) et staff_can_read_self.
-- ============================================================

create policy "clinic_staff_can_read_same_clinic"
on clinic_staff for select
to public
using (
  exists (
    select 1 from clinic_staff me
    where me.clinic_id = clinic_staff.clinic_id
      and (
        me.clerk_user_id = (auth.uid())::text
        or me.clerk_user_id = (auth.jwt() ->> 'sub')
        or lower(me.email) = lower(auth.jwt() ->> 'email')
      )
  )
);
