// Deno / Edge Runtime
// Espace developpeur : rechercher des patients (candidats doublons) et
// fusionner deux fiches via merge_patients() (supabase/migrations/
// 20260712130000_merge_patients.sql, reparee le meme jour que cet outil --
// jusqu'ici accessible uniquement depuis l'editeur SQL). Meme garde-fou que
// les autres routes dev-* : aucune policy RLS pour le role developer,
// verification manuelle de publicMetadata.role === "developer" cote Clerk.
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

// Recherche insensible aux accents/casse (cf. feedback_accent_insensitive_search :
// le francais gabonais casse un simple .toLowerCase() sur des noms accentues).
// Le volume de patients est faible (outil dev, pas une recherche publique),
// donc filtrer cote application apres un fetch large est acceptable.
function fold(v: string | null | undefined): string {
  return (v ?? "")
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .toLowerCase();
}

type Action =
  | { action: "search_patients"; query: string }
  | { action: "merge_patients"; survivor_id: string; loser_id: string };

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
    const callerEmail =
      (caller?.email_addresses ?? []).find((e: any) => e.id === caller?.primary_email_address_id)
        ?.email_address ?? caller?.email_addresses?.[0]?.email_address ?? null;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const input = (await req.json()) as Action;

    if (input.action === "search_patients") {
      const q = fold(input.query);
      if (q.length < 2) {
        return new Response(JSON.stringify({ patients: [] }), { headers: cors });
      }

      const { data, error } = await supabase
        .from("patients")
        .select("id, name, phone, national_id, is_assured, status, merged_into_patient_id, clinic_id, clinics:clinic_id(name)")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;

      const matches = (data ?? []).filter(
        (p: any) => fold(p.name).includes(q) || fold(p.phone).includes(q) || fold(p.national_id).includes(q)
      );

      return new Response(JSON.stringify({ patients: matches.slice(0, 50) }), {
        headers: { "Content-Type": "application/json", ...cors },
      });
    }

    if (input.action === "merge_patients") {
      if (!input.survivor_id || !input.loser_id) {
        return new Response(
          JSON.stringify({ error: "survivor_id et loser_id requis" }),
          { status: 400, headers: cors }
        );
      }
      if (input.survivor_id === input.loser_id) {
        return new Response(
          JSON.stringify({ error: "survivor et loser doivent être différents" }),
          { status: 400, headers: cors }
        );
      }

      const { data, error } = await supabase.rpc("merge_patients", {
        p_survivor_id: input.survivor_id,
        p_loser_id: input.loser_id,
        p_actor_email: callerEmail,
      });
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: cors });
      }

      return new Response(JSON.stringify({ ok: true, summary: data }), {
        headers: { "Content-Type": "application/json", ...cors },
      });
    }

    return new Response(JSON.stringify({ error: "Action inconnue" }), { status: 400, headers: cors });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String((e as Error).message ?? e) }),
      { status: 400, headers: cors }
    );
  }
});
