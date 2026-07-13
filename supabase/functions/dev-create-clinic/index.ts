// Deno / Edge Runtime
// Crée un cabinet (clinics) + ses premiers comptes (clinic_staff + Clerk).
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

type StaffRole = "doctor" | "secretary" | "admin";
type StaffInput = { name: string; email: string; role: StaffRole };

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
    const { clinic, staff } = body as {
      clinic: {
        name: string;
        type: "specialist_office" | "multi_specialist";
        address: string;
        phone?: string;
        siret: string;
        code: string;
        speciality?: string;
      };
      staff: StaffInput[];
    };

    if (!clinic?.name || !clinic?.type || !clinic?.address || !clinic?.siret || !clinic?.code) {
      return new Response(
        JSON.stringify({ error: "Champs cabinet manquants" }),
        { status: 400, headers: cors }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: clinicRow, error: clinicErr } = await supabase
      .from("clinics")
      .insert({
        name: clinic.name,
        type: clinic.type,
        address: clinic.address,
        phone: clinic.phone ?? null,
        siret: clinic.siret,
        code: clinic.code,
        speciality: clinic.speciality ?? null,
        active: true,
        theme: { primary: "#4F46E5", secondary: "#818CF8" },
      })
      .select("id")
      .single();

    if (clinicErr) throw clinicErr;
    const clinicId = clinicRow.id as string;

    const results: Array<{
      email: string;
      status: "ok" | "error";
      clerk_user_id?: string;
      error?: string;
    }> = [];

    for (const member of staff ?? []) {
      try {
        // Invitation Clerk : la personne recoit un email, choisit elle-meme
        // son mot de passe en acceptant. Avant ce correctif, le compte
        // etait cree directement avec un mot de passe aleatoire jamais
        // communique -> personne ne pouvait jamais se connecter.
        await clerkFetch(
          "/invitations",
          {
            method: "POST",
            body: JSON.stringify({
              email_address: member.email,
              public_metadata: { role: member.role },
              notify: true,
            }),
          },
          clerkSecret
        );

        // clerk_user_id reste vide tant que l'invitation n'est pas acceptee ;
        // l'app matche deja les comptes par email en repli partout
        // (resolveAccessContext, useClinicId, etc.), donc la connexion
        // fonctionnera des l'acceptation, meme avant tout backfill.
        const { error: staffErr } = await supabase.from("clinic_staff").insert({
          clinic_id: clinicId,
          clerk_user_id: null,
          name: member.name,
          role: member.role,
          email: member.email,
          status: "active",
        });

        if (staffErr) throw staffErr;
        results.push({ email: member.email, status: "ok" });
      } catch (e) {
        results.push({
          email: member.email,
          status: "error",
          error: String((e as Error).message ?? e),
        });
      }
    }

    return new Response(
      JSON.stringify({ clinic_id: clinicId, staff: results }),
      { headers: cors }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String((e as Error).message ?? e) }),
      { status: 400, headers: cors }
    );
  }
});
