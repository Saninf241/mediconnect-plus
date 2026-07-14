// Deno / Edge Runtime
// Espace admin de cabinet : retire un membre (medecin/secretaire/admin)
// de l'equipe de SON cabinet.
//
// Supprimer une ligne clinic_staff cote Supabase ne libere pas l'email
// cote Clerk : le compte (si l'invitation a ete acceptee) ou
// l'invitation (si encore en attente) existe toujours, et Clerk refuse
// de recreer une invitation pour un email deja pris ("That email address
// is taken"). Meme nettoyage que cleanupClerkStaff dans dev-manage-orgs.
//
// Le garde-fou verifie que l'appelant est bien admin de la ligne
// clinic_staff qui matche son propre clerk_user_id (ou email en repli)
// et que la ligne ciblee appartient a SON cabinet -> empeche un admin
// d'un cabinet de retirer un membre d'un autre cabinet.
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

async function cleanupClerkStaff(
  row: { clerk_user_id: string | null; email: string },
  clerkSecret: string
) {
  try {
    if (row.clerk_user_id) {
      await clerkFetch(`/users/${row.clerk_user_id}`, { method: "DELETE" }, clerkSecret);
      return;
    }

    const list = await clerkFetch(`/invitations?status=pending&limit=100`, { method: "GET" }, clerkSecret);
    const invitations = Array.isArray(list) ? list : list?.data ?? [];
    const match = invitations.find((inv: any) => inv.email_address === row.email);
    if (match) {
      await clerkFetch(`/invitations/${match.id}/revoke`, { method: "POST" }, clerkSecret);
    }
  } catch (e) {
    // Ne bloque pas la suppression pour un souci de nettoyage Clerk ;
    // juste visible dans les logs de la fonction.
    console.error("[admin-remove-clinic-member] clerk cleanup failed for", row.email, e);
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
    const callerEmail = (caller?.email_addresses ?? []).find(
      (e: any) => e.id === caller?.primary_email_address_id
    )?.email_address ?? caller?.email_addresses?.[0]?.email_address ?? null;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let callerStaff = await supabase
      .from("clinic_staff")
      .select("id, clinic_id, role")
      .eq("clerk_user_id", callerId)
      .maybeSingle();

    if (!callerStaff.data && callerEmail) {
      callerStaff = await supabase
        .from("clinic_staff")
        .select("id, clinic_id, role")
        .eq("email", callerEmail)
        .maybeSingle();
    }

    if (callerStaff.error) throw callerStaff.error;

    if (!callerStaff.data || callerStaff.data.role !== "admin" || !callerStaff.data.clinic_id) {
      return new Response(
        JSON.stringify({ error: "Accès refusé : réservé aux admins d'un cabinet" }),
        { status: 403, headers: cors }
      );
    }

    const clinicId = callerStaff.data.clinic_id as string;

    const body = await req.json();
    const staffId = String(body?.staff_id ?? "").trim();

    if (!staffId) {
      return new Response(
        JSON.stringify({ error: "Champ manquant : staff_id" }),
        { status: 400, headers: cors }
      );
    }

    const { data: target, error: targetErr } = await supabase
      .from("clinic_staff")
      .select("id, clinic_id, email, clerk_user_id")
      .eq("id", staffId)
      .maybeSingle();

    if (targetErr) throw targetErr;

    if (!target || target.clinic_id !== clinicId) {
      return new Response(
        JSON.stringify({ error: "Membre introuvable dans ce cabinet" }),
        { status: 404, headers: cors }
      );
    }

    if (target.id === callerStaff.data.id) {
      return new Response(
        JSON.stringify({ error: "Vous ne pouvez pas supprimer votre propre compte." }),
        { status: 400, headers: cors }
      );
    }

    await cleanupClerkStaff(
      { clerk_user_id: target.clerk_user_id, email: target.email ?? "" },
      clerkSecret
    );

    const { error: deleteErr } = await supabase.from("clinic_staff").delete().eq("id", staffId);
    if (deleteErr) throw deleteErr;

    return new Response(JSON.stringify({ ok: true }), { headers: cors });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String((e as Error).message ?? e) }),
      { status: 400, headers: cors }
    );
  }
});
