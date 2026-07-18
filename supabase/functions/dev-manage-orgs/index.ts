// Deno / Edge Runtime
// Espace developpeur : lister et supprimer des cabinets/assureurs de
// test. Comme dev-create-clinic/dev-create-insurer, aucune policy RLS
// pour le role developer -> cette route utilise la service role key et
// verifie elle-meme que l'appelant a bien publicMetadata.role ===
// "developer" cote Clerk.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyToken } from "https://esm.sh/@clerk/backend@1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CLERK_API = "https://api.clerk.com/v1";

async function clerkFetch(path: string, init: RequestInit, secretKey: string) {
  const res = await fetch(`${CLERK_API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secretKey}`,
      ...(init.headers || {}),
    },
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.errors?.[0]?.message || `Clerk API error (${res.status})`);
  }
  return body;
}

type Action =
  | { action: "list_clinics" }
  | { action: "list_insurers" }
  | { action: "delete_clinic"; clinic_id: string }
  | { action: "delete_insurer"; insurer_id: string }
  | { action: "list_conventions" }
  | { action: "add_convention"; clinic_id: string; insurer_id: string }
  | { action: "remove_convention"; id: string }
  | { action: "update_insurer_verification_level"; insurer_id: string; verification_level: string }
  | {
      action: "list_directory_members";
      insurer_id: string;
    }
  | {
      action: "add_directory_member";
      insurer_id: string;
      full_name: string;
      national_id?: string | null;
      member_no?: string | null;
      plan_code?: string | null;
    }
  | { action: "list_pending_payment_info" }
  | { action: "verify_clinic_payment_info"; id: string }
  | { action: "reject_clinic_payment_info"; id: string; reason: string };

// Supprimer une ligne clinic_staff/insurer_staff cote Supabase ne libere
// pas l'email cote Clerk : le compte (si l'invitation a ete acceptee) ou
// l'invitation (si encore en attente) existe toujours, et Clerk refuse
// de recreer une invitation pour un email deja pris ("That email address
// is taken"). On nettoie donc Clerk avant de supprimer en base.
async function cleanupClerkStaff(
  rows: { clerk_user_id: string | null; email: string }[],
  clerkSecret: string
) {
  for (const row of rows) {
    try {
      if (row.clerk_user_id) {
        await clerkFetch(`/users/${row.clerk_user_id}`, { method: "DELETE" }, clerkSecret);
        continue;
      }

      // Pas encore accepte : chercher l'invitation en attente pour cet
      // email et la revoquer.
      const list = await clerkFetch(`/invitations?status=pending&limit=100`, { method: "GET" }, clerkSecret);
      const invitations = Array.isArray(list) ? list : list?.data ?? [];
      const match = invitations.find((inv: any) => inv.email_address === row.email);
      if (match) {
        await clerkFetch(`/invitations/${match.id}/revoke`, { method: "POST" }, clerkSecret);
      }
    } catch (e) {
      // Ne bloque pas la suppression pour un souci de nettoyage Clerk ;
      // juste visible dans les logs de la fonction.
      console.error("[dev-manage-orgs] clerk cleanup failed for", row.email, e);
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const clerkSecret = Deno.env.get("CLERK_SECRET_KEY")!;
    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace("Bearer ", "");

    const verifyResult = await verifyToken(token, { secretKey: clerkSecret });
    const payload = (verifyResult as any)?.payload ?? verifyResult;
    const callerId = payload.sub as string;

    const caller = await clerkFetch(`/users/${callerId}`, { method: "GET" }, clerkSecret);
    if (caller?.public_metadata?.role !== "developer") {
      return new Response(
        JSON.stringify({ error: "Accès refusé : réservé aux développeurs" }),
        { status: 403, headers: cors }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const input = (await req.json()) as Action;

    if (input.action === "list_clinics") {
      const { data, error } = await supabase
        .from("clinics")
        .select("id, name, type, active, created_at, clinic_staff(count), consultations:consultations(count)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ clinics: data }), { headers: cors });
    }

    if (input.action === "list_insurers") {
      const { data, error } = await supabase
        .from("insurers")
        .select("id, name, verification_level, insurer_staff(count)")
        .order("name", { ascending: true });
      if (error) throw error;
      return new Response(JSON.stringify({ insurers: data }), { headers: cors });
    }

    if (input.action === "delete_clinic") {
      const { data: staffRows } = await supabase
        .from("clinic_staff")
        .select("clerk_user_id, email")
        .eq("clinic_id", input.clinic_id);

      await cleanupClerkStaff(staffRows ?? [], clerkSecret);

      const { error } = await supabase.rpc("dev_delete_clinic", { p_clinic_id: input.clinic_id });
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), { headers: cors });
    }

    if (input.action === "delete_insurer") {
      const { data: staffRows } = await supabase
        .from("insurer_staff")
        .select("clerk_user_id, email")
        .eq("insurer_id", input.insurer_id);

      await cleanupClerkStaff(staffRows ?? [], clerkSecret);

      const { error } = await supabase.rpc("dev_delete_insurer", { p_insurer_id: input.insurer_id });
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), { headers: cors });
    }

    if (input.action === "list_conventions") {
      const { data, error } = await supabase
        .from("clinic_insurer_conventions")
        .select("id, active, created_at, clinics:clinic_id(id, name), insurers:insurer_id(id, name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ conventions: data }), { headers: cors });
    }

    if (input.action === "add_convention") {
      const { error } = await supabase
        .from("clinic_insurer_conventions")
        .upsert(
          { clinic_id: input.clinic_id, insurer_id: input.insurer_id, active: true },
          { onConflict: "clinic_id,insurer_id" }
        );
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), { headers: cors });
    }

    if (input.action === "remove_convention") {
      const { error } = await supabase.from("clinic_insurer_conventions").delete().eq("id", input.id);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), { headers: cors });
    }

    if (input.action === "update_insurer_verification_level") {
      if (!["N1", "N2", "N3"].includes(input.verification_level)) {
        return new Response(JSON.stringify({ error: "Niveau invalide" }), { status: 400, headers: cors });
      }
      const { error } = await supabase
        .from("insurers")
        .update({ verification_level: input.verification_level })
        .eq("id", input.insurer_id);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), { headers: cors });
    }

    if (input.action === "list_directory_members") {
      const { data, error } = await supabase
        .from("insurer_member_directory")
        .select("id, full_name, national_id, member_no, plan_code, is_active, created_at, created_by_name, created_by_role")
        .eq("insurer_id", input.insurer_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ members: data }), { headers: cors });
    }

    if (input.action === "add_directory_member") {
      // Chemin "accompagnement N3" : un assureur sans compte staff
      // operationnel n'a aucun moyen de peupler lui-meme sa base
      // d'adherents -- le developpeur le fait pour son compte ici, via
      // service_role (bypass RLS, qui n'autorise que insurer_staff
      // admin). created_by_role='developer' documente explicitement
      // cette provenance (cf CHECK sur insurer_member_directory).
      if (!input.full_name?.trim() || (!input.member_no?.trim() && !input.national_id?.trim())) {
        return new Response(
          JSON.stringify({ error: "Nom complet et (n° adhérent ou NIN) requis" }),
          { status: 400, headers: cors }
        );
      }
      const callerName = caller?.first_name
        ? `${caller.first_name} ${caller.last_name ?? ""}`.trim()
        : null;
      const callerEmail =
        (caller?.email_addresses ?? []).find((e: any) => e.id === caller?.primary_email_address_id)
          ?.email_address ?? caller?.email_addresses?.[0]?.email_address ?? null;

      const { error } = await supabase.from("insurer_member_directory").insert({
        insurer_id: input.insurer_id,
        full_name: input.full_name.trim(),
        national_id: input.national_id?.trim() || null,
        member_no: input.member_no?.trim() || null,
        plan_code: input.plan_code?.trim() || null,
        created_by_clerk_user_id: callerId,
        created_by_role: "developer",
        created_by_name: callerName,
        created_by_email: callerEmail,
      });
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), { headers: cors });
    }

    if (input.action === "list_pending_payment_info") {
      const { data, error } = await supabase
        .from("clinic_payment_info")
        .select(
          "id, clinic_id, payment_method, bank_name, account_number, account_holder_name, mobile_money_provider, mobile_money_number, status, submitted_by_name, submitted_by_role, submitted_at, rejection_reason, clinics:clinic_id(name)"
        )
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ payment_info: data }), { headers: cors });
    }

    if (input.action === "verify_clinic_payment_info") {
      const callerEmail =
        (caller?.email_addresses ?? []).find((e: any) => e.id === caller?.primary_email_address_id)
          ?.email_address ?? caller?.email_addresses?.[0]?.email_address ?? null;

      const { error } = await supabase
        .from("clinic_payment_info")
        .update({
          status: "verified",
          verified_by_email: callerEmail,
          verified_at: new Date().toISOString(),
          rejection_reason: null,
        })
        .eq("id", input.id);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), { headers: cors });
    }

    if (input.action === "reject_clinic_payment_info") {
      if (!input.reason?.trim()) {
        return new Response(JSON.stringify({ error: "Motif de rejet requis" }), { status: 400, headers: cors });
      }
      const { error } = await supabase
        .from("clinic_payment_info")
        .update({
          status: "rejected",
          rejection_reason: input.reason.trim(),
          verified_by_email: null,
          verified_at: null,
        })
        .eq("id", input.id);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), { headers: cors });
    }

    return new Response(JSON.stringify({ error: "Action inconnue" }), { status: 400, headers: cors });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String((e as Error).message ?? e) }),
      { status: 400, headers: cors }
    );
  }
});
