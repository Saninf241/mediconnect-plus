// supabase/functions/match-insurer-directory/index.ts
// Matching best-effort entre une declaration secretaire (n° d'adherent /
// NIN saisi au wizard) et la base d'adherents declaree par l'assureur
// (insurer_member_directory, assureurs N2/N3). Ne renvoie JAMAIS la liste
// des adherents -- seulement un resultat oui/non + plan_code -- pour ne
// pas exposer la base de l'assureur (volumes, identites) au cabinet.
// Best-effort strict : cote appelant (NewPatientWizard), un echec de
// cette fonction (reseau, 4xx, exception) doit degrader silencieusement
// vers le comportement declaratif actuel, jamais bloquer l'enregistrement.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyToken } from "https://esm.sh/@clerk/backend@1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace("Bearer ", "");
    const verifyResult = await verifyToken(token, { secretKey: Deno.env.get("CLERK_SECRET_KEY")! });
    const payload = (verifyResult as any)?.payload ?? verifyResult;
    const callerId = payload.sub as string;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Meme garde-fou que resolve-existing-patient : reserve au staff
    // d'un cabinet reel (pas n'importe quel compte Clerk authentifie).
    const { data: staffRow } = await supabase
      .from("clinic_staff")
      .select("id")
      .eq("clerk_user_id", callerId)
      .maybeSingle();

    if (!staffRow) {
      return new Response(
        JSON.stringify({ error: "Accès refusé : réservé au personnel d'un cabinet" }),
        { status: 403, headers: cors }
      );
    }

    const { insurer_id, member_no, national_id } = await req.json();
    if (!insurer_id) {
      return new Response(JSON.stringify({ matched: false }), {
        headers: { "Content-Type": "application/json", ...cors },
      });
    }

    if (member_no) {
      const { data } = await supabase
        .from("insurer_member_directory")
        .select("id, plan_code")
        .eq("insurer_id", insurer_id)
        .eq("member_no", member_no)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (data?.id) {
        return new Response(
          JSON.stringify({ matched: true, directory_id: data.id, plan_code: data.plan_code ?? null }),
          { headers: { "Content-Type": "application/json", ...cors } }
        );
      }
    }

    if (national_id) {
      const { data } = await supabase
        .from("insurer_member_directory")
        .select("id, plan_code")
        .eq("insurer_id", insurer_id)
        .eq("national_id", national_id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (data?.id) {
        return new Response(
          JSON.stringify({ matched: true, directory_id: data.id, plan_code: data.plan_code ?? null }),
          { headers: { "Content-Type": "application/json", ...cors } }
        );
      }
    }

    return new Response(JSON.stringify({ matched: false }), {
      headers: { "Content-Type": "application/json", ...cors },
    });
  } catch (e) {
    // Best-effort : une erreur ici ne doit jamais faire echouer
    // l'enregistrement du patient cote appelant -- on repond 200 avec
    // matched:false plutot qu'une 500 qui forcerait l'appelant a
    // distinguer "pas trouve" de "en panne" (l'appelant degrade pareil
    // dans les deux cas, autant simplifier son code).
    return new Response(JSON.stringify({ matched: false, error: String(e) }), {
      status: 200,
      headers: cors,
    });
  }
});
