// Deno / Edge Runtime
// Ajoute un membre (médecin/secrétaire/admin) à la clinique de l'appelant,
// en envoyant une vraie invitation Clerk (même pattern que dev-create-clinic)
// au lieu de se contenter d'insérer une ligne clinic_staff sans compte.
//
// Sécurité : le clinic_id ciblé est toujours dérivé de l'appelant (jamais
// accepté depuis le corps de la requête) — un admin ne peut donc inviter que
// dans son propre cabinet. L'appelant doit avoir role === "admin" dans
// clinic_staff pour cette clinique.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyToken } from "https://esm.sh/@clerk/backend@1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CLERK_API = "https://api.clerk.com/v1";

type StaffRole = "doctor" | "secretary" | "admin";

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const clerkSecret = Deno.env.get("CLERK_SECRET_KEY")!;
    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace("Bearer ", "");

    const verifyResult = await verifyToken(token, { secretKey: clerkSecret });
    const payload = (verifyResult as any)?.payload ?? verifyResult;
    const callerId = payload.sub as string;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Résoudre la clinique + le rôle de l'appelant : d'abord par clerk_user_id,
    // puis par email (même repli que resolveAccessContext/useClinicId côté app).
    let callerStaff: { clinic_id: string; role: string } | null = null;

    const byId = await supabase
      .from("clinic_staff")
      .select("clinic_id, role")
      .eq("clerk_user_id", callerId)
      .maybeSingle();
    callerStaff = byId.data ?? null;

    if (!callerStaff) {
      const callerUser = await clerkFetch(`/users/${callerId}`, { method: "GET" }, clerkSecret);
      const callerEmail = callerUser?.email_addresses?.[0]?.email_address as string | undefined;

      if (callerEmail) {
        const byEmail = await supabase
          .from("clinic_staff")
          .select("clinic_id, role")
          .eq("email", callerEmail.toLowerCase())
          .maybeSingle();
        callerStaff = byEmail.data ?? null;
      }
    }

    if (!callerStaff || callerStaff.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Accès refusé : réservé aux admins du cabinet" }),
        { status: 403, headers: cors }
      );
    }

    const clinicId = callerStaff.clinic_id;

    const body = await req.json();
    const { name, email, role } = body as { name: string; email: string; role: StaffRole };

    if (!name?.trim() || !email?.trim() || !role) {
      return new Response(
        JSON.stringify({ error: "Champs manquants (name, email, role)" }),
        { status: 400, headers: cors }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const { data: existing } = await supabase
      .from("clinic_staff")
      .select("id")
      .eq("clinic_id", clinicId)
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: "Cet email existe déjà dans l’équipe." }),
        { status: 409, headers: cors }
      );
    }

    // Invitation Clerk : la personne reçoit un email, choisit elle-même son
    // mot de passe en acceptant — clerk_user_id reste vide jusque-là ;
    // l'app matche déjà les comptes par email en repli partout.
    await clerkFetch(
      "/invitations",
      {
        method: "POST",
        body: JSON.stringify({
          email_address: normalizedEmail,
          public_metadata: { role },
          notify: true,
        }),
      },
      clerkSecret
    );

    const { error: staffErr } = await supabase.from("clinic_staff").insert({
      clinic_id: clinicId,
      clerk_user_id: null,
      name: name.trim(),
      role,
      email: normalizedEmail,
      status: "active",
    });

    if (staffErr) throw staffErr;

    return new Response(JSON.stringify({ status: "ok" }), { headers: cors });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String((e as Error).message ?? e) }),
      { status: 400, headers: cors }
    );
  }
});
