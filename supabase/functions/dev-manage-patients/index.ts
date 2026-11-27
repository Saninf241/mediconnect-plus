// Deno / Edge Runtime
// Espace developpeur : rechercher des patients (candidats doublons),
// fusionner deux fiches via merge_patients() (supabase/migrations/
// 20260712130000_merge_patients.sql, reparee le meme jour que cet outil --
// jusqu'ici accessible uniquement depuis l'editeur SQL), et corriger une
// fiche (update_patient) quand aucun staff actif du cabinet ne peut le
// faire (cabinet ferme, staff parti) -- filet de secours, chaque edition
// est journalisee dans dev_patient_edits (20260919100000). Meme garde-fou
// que les autres routes dev-* : aucune policy RLS pour le role developer,
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
  | { action: "merge_patients"; survivor_id: string; loser_id: string }
  | {
      action: "update_patient";
      patient_id: string;
      updates: {
        name?: string;
        phone?: string | null;
        date_of_birth?: string;
        national_id?: string | null;
      };
      reason?: string;
    };

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
        .select(
          "id, name, phone, national_id, date_of_birth, is_assured, fingerprint_enrolled, status, merged_into_patient_id, clinic_id, clinics:clinic_id(name)"
        )
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

    if (input.action === "update_patient") {
      if (!input.patient_id || !input.updates) {
        return new Response(
          JSON.stringify({ error: "patient_id et updates requis" }),
          { status: 400, headers: cors }
        );
      }

      const { data: current, error: fetchError } = await supabase
        .from("patients")
        .select("id, name, phone, national_id, date_of_birth, is_assured, fingerprint_enrolled, status")
        .eq("id", input.patient_id)
        .maybeSingle();
      if (fetchError) throw fetchError;
      if (!current) {
        return new Response(JSON.stringify({ error: "Patient introuvable" }), { status: 404, headers: cors });
      }
      if (current.status === "merged") {
        return new Response(
          JSON.stringify({ error: "Cette fiche est fusionnée : modifiez le dossier conservé, pas le doublon." }),
          { status: 400, headers: cors }
        );
      }

      const nameLocked = !!current.is_assured || !!current.fingerprint_enrolled;
      const reason = (input.reason ?? "").trim();
      const { updates } = input;

      if (updates.name !== undefined && updates.name.trim() !== current.name && nameLocked && !reason) {
        return new Response(
          JSON.stringify({
            error:
              "Patient assuré ou identifié par empreinte : un motif est requis pour changer le nom (protection anti-fraude).",
          }),
          { status: 400, headers: cors }
        );
      }

      if (updates.date_of_birth !== undefined && !updates.date_of_birth) {
        return new Response(JSON.stringify({ error: "La date de naissance ne peut pas être vide" }), {
          status: 400,
          headers: cors,
        });
      }

      const patch: Record<string, unknown> = {};
      const changes: { field: string; old_value: string | null; new_value: string | null }[] = [];

      const consider = (field: "name" | "phone" | "date_of_birth" | "national_id", raw: unknown) => {
        if (raw === undefined) return;
        const newValue = typeof raw === "string" ? raw.trim() || null : raw;
        const oldValue = (current as any)[field] ?? null;
        if (newValue === oldValue) return;
        patch[field] = newValue;
        changes.push({ field, old_value: oldValue, new_value: newValue as string | null });
      };

      consider("name", updates.name);
      consider("phone", updates.phone);
      consider("date_of_birth", updates.date_of_birth);
      consider("national_id", updates.national_id);

      if (changes.length === 0) {
        return new Response(JSON.stringify({ ok: true, changed: [] }), { headers: cors });
      }

      const { error: updateError } = await supabase.from("patients").update(patch).eq("id", input.patient_id);
      if (updateError) {
        const message =
          updateError.code === "23505"
            ? "Ce NIN est déjà utilisé par un autre patient."
            : updateError.message;
        return new Response(JSON.stringify({ error: message }), { status: 400, headers: cors });
      }

      const auditRows = changes.map((c) => ({
        patient_id: input.patient_id,
        actor_email: callerEmail,
        field: c.field,
        old_value: c.old_value,
        new_value: c.new_value,
        reason: reason || null,
      }));
      const { error: auditError } = await supabase.from("dev_patient_edits").insert(auditRows);
      if (auditError) {
        console.error("[dev-manage-patients] audit insert failed:", auditError.message);
      }

      return new Response(JSON.stringify({ ok: true, changed: changes.map((c) => c.field) }), {
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
