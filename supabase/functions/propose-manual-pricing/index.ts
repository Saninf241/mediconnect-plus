// supabase/functions/propose-manual-pricing/index.ts
// Un agent (ou admin) de l'assureur propose un montant manuel pour une
// consultation -- typiquement quand compute_consultation_pricing est
// bloque (acte non tarifable / tarif manquant) ou juge errone. Ne modifie
// jamais consultations elle-meme : cree seulement une proposition
// "pending", qui doit etre validee par un admin (review-manual-pricing)
// avant de devenir active.
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
    if (!token) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), { status: 401, headers: cors });
    }

    const verifyResult = await verifyToken(token, { secretKey: Deno.env.get("CLERK_SECRET_KEY")! });
    const payload = (verifyResult as any)?.payload ?? verifyResult;
    const callerId = payload.sub as string;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: staffRow, error: staffErr } = await supabase
      .from("insurer_staff")
      .select("id, insurer_id, role, name")
      .eq("clerk_user_id", callerId)
      .maybeSingle();

    if (staffErr || !staffRow?.insurer_id) {
      return new Response(
        JSON.stringify({ error: "Accès refusé : compte non lié à un assureur" }),
        { status: 403, headers: cors }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { consultation_id, proposed_amount, justification } = body as {
      consultation_id?: string;
      proposed_amount?: number;
      justification?: string;
    };

    if (!consultation_id || typeof proposed_amount !== "number" || !Number.isFinite(proposed_amount) || proposed_amount < 0) {
      return new Response(
        JSON.stringify({ error: "consultation_id et un montant proposé valide sont requis" }),
        { status: 400, headers: cors }
      );
    }

    const { data: consultation, error: consultErr } = await supabase
      .from("consultations")
      .select("id, insurer_id")
      .eq("id", consultation_id)
      .maybeSingle();

    if (consultErr || !consultation) {
      return new Response(JSON.stringify({ error: "Consultation introuvable" }), { status: 404, headers: cors });
    }

    if (consultation.insurer_id !== staffRow.insurer_id) {
      return new Response(
        JSON.stringify({ error: "Accès refusé : cette consultation n'appartient pas à votre assureur" }),
        { status: 403, headers: cors }
      );
    }

    const { error: upsertErr } = await supabase
      .from("consultation_manual_pricing")
      .upsert(
        {
          consultation_id,
          insurer_id: staffRow.insurer_id,
          proposed_amount,
          justification: justification?.trim() || null,
          // Toute (re)proposition repart en attente -- invalide une
          // decision precedente (approuvee ou rejetee).
          status: "pending",
          proposed_by_staff_id: staffRow.id,
          proposed_by_name: staffRow.name,
          proposed_at: new Date().toISOString(),
          approved_by_staff_id: null,
          approved_by_name: null,
          approved_at: null,
          rejection_reason: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "consultation_id" }
      );

    if (upsertErr) throw upsertErr;

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...cors },
    });
  } catch (e) {
    console.error("propose-manual-pricing error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: cors }
    );
  }
});
