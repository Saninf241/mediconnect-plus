// Deno / Edge Runtime
// Crée un assureur (insurers) + ses premiers comptes (insurer_staff + Clerk).
// Sécurité : aucune RLS pour l'instant côté DB (décision assumée), donc le
// seul garde-fou est ici : on vérifie que l'appelant a bien
// publicMetadata.role === "developer" côté Clerk avant toute écriture.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyToken } from "https://esm.sh/@clerk/backend@1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CLERK_API = "https://api.clerk.com/v1";

type StaffInput = { name: string; email: string; role: string };

function randomPassword() {
  return crypto.randomUUID() + crypto.randomUUID();
}

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
    // verifyToken renvoie soit { payload }, soit le payload directement,
    // selon la version exacte que esm.sh resout pour "@clerk/backend@1".
    const payload = (verifyResult as any)?.payload ?? verifyResult;
    const callerId = payload.sub as string;

    // Seul garde-fou tant qu'il n'y a pas de RLS : vérifier le rôle developer.
    const caller = await clerkFetch(`/users/${callerId}`, { method: "GET" }, clerkSecret);
    if (caller?.public_metadata?.role !== "developer") {
      return new Response(
        JSON.stringify({ error: "Accès refusé : réservé aux développeurs" }),
        { status: 403, headers: cors }
      );
    }

    const body = await req.json();
    const { insurer, staff } = body as {
      insurer: { name: string; verification_level: string; slug: string };
      staff: StaffInput[];
    };

    if (!insurer?.name || !insurer?.slug) {
      return new Response(
        JSON.stringify({ error: "Champs assureur manquants" }),
        { status: 400, headers: cors }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: insurerRow, error: insurerErr } = await supabase
      .from("insurers")
      .insert({
        name: insurer.name,
        verification_level: insurer.verification_level ?? "N1",
        slug: insurer.slug,
      })
      .select("id")
      .single();

    if (insurerErr) throw insurerErr;
    const insurerId = insurerRow.id as string;

    const results: Array<{
      email: string;
      status: "ok" | "error";
      clerk_user_id?: string;
      error?: string;
    }> = [];

    for (const member of staff ?? []) {
      try {
        const [firstName, ...rest] = (member.name || "").trim().split(/\s+/);
        const newUser = await clerkFetch(
          "/users",
          {
            method: "POST",
            body: JSON.stringify({
              email_address: [member.email],
              password: randomPassword(),
              skip_password_checks: true,
              public_metadata: { role: "assurer" },
              ...(firstName ? { first_name: firstName } : {}),
              ...(rest.length ? { last_name: rest.join(" ") } : {}),
            }),
          },
          clerkSecret
        );

        const { error: staffErr } = await supabase.from("insurer_staff").insert({
          insurer_id: insurerId,
          clerk_user_id: newUser.id,
          email: member.email,
          role: member.role,
        });

        if (staffErr) throw staffErr;
        results.push({ email: member.email, status: "ok", clerk_user_id: newUser.id });
      } catch (e) {
        results.push({
          email: member.email,
          status: "error",
          error: String((e as Error).message ?? e),
        });
      }
    }

    return new Response(
      JSON.stringify({ insurer_id: insurerId, staff: results }),
      { headers: cors }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String((e as Error).message ?? e) }),
      { status: 400, headers: cors }
    );
  }
});
