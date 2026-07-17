// supabase/functions/generate-payment-batch/index.ts
// Regroupe les consultations acceptees et deja tarifees d'un assureur, par
// clinique, en un lot de paiement (payment_batches + batch_items). Ne
// touche jamais consultations.status -- une consultation "batchee" reste
// "accepted" jusqu'a ce que le lot soit marque paye (mark-payment-batch-paid),
// qui met a jour payment_status/payment_date individuellement.
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
      .select("id, insurer_id, role")
      .eq("clerk_user_id", callerId)
      .maybeSingle();

    if (staffErr || !staffRow?.insurer_id) {
      return new Response(
        JSON.stringify({ error: "Accès refusé : compte non lié à un assureur" }),
        { status: 403, headers: cors }
      );
    }

    const insurerId = staffRow.insurer_id as string;

    const body = await req.json().catch(() => ({}));
    const { clinicId, periodStart, periodEnd } = body as {
      clinicId?: string;
      periodStart?: string;
      periodEnd?: string;
    };

    // Consultations deja regroupees dans un lot (peu importe le statut du
    // lot) -- on ne re-regroupe jamais une consultation deja batchee.
    const { data: alreadyBatched, error: batchedErr } = await supabase
      .from("batch_items")
      .select("consultation_id");

    if (batchedErr) throw batchedErr;
    const excludeIds = new Set((alreadyBatched ?? []).map((r: any) => r.consultation_id));

    let q = supabase
      .from("consultations")
      .select("id, clinic_id, insurer_amount, pricing_status, insurer_decision_at")
      .eq("insurer_id", insurerId)
      .eq("status", "accepted");

    if (clinicId) q = q.eq("clinic_id", clinicId);
    if (periodStart) q = q.gte("insurer_decision_at", `${periodStart}T00:00:00`);
    if (periodEnd) q = q.lte("insurer_decision_at", `${periodEnd}T23:59:59.999`);

    const { data: candidates, error: candErr } = await q;
    if (candErr) throw candErr;

    const eligible = (candidates ?? []).filter((c: any) => !excludeIds.has(c.id));

    const notPriced = eligible.filter((c: any) => c.pricing_status !== "computed");
    const ready = eligible.filter((c: any) => c.pricing_status === "computed" && c.clinic_id);

    if (ready.length === 0) {
      return new Response(
        JSON.stringify({
          batches: [],
          excluded_not_priced: notPriced.length,
          message: "Aucune consultation prête à être regroupée (déjà en lot, ou tarification non calculée).",
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...cors } }
      );
    }

    const grouped = new Map<string, { id: string; amount: number }[]>();
    for (const c of ready) {
      const list = grouped.get(c.clinic_id) ?? [];
      list.push({ id: c.id, amount: c.insurer_amount ?? 0 });
      grouped.set(c.clinic_id, list);
    }

    const batches = [];

    for (const [gClinicId, items] of grouped.entries()) {
      const amount = items.reduce((sum, i) => sum + i.amount, 0);

      // Pas de commission pour l'instant : le modele de facturation
      // Mediconnect+ (commission, redistribution...) n'est pas encore
      // decide -- on enregistre le montant brut, a affiner plus tard.
      const { data: batch, error: batchError } = await supabase
        .from("payment_batches")
        .insert({
          insurer_id: insurerId,
          clinic_id: gClinicId,
          amount,
          commission: 0,
          total_paid: amount,
          status: "pending",
          period_start: periodStart ?? null,
          period_end: periodEnd ?? null,
          consultation_count: items.length,
          created_by_staff_id: staffRow.id,
        })
        .select("id")
        .single();

      if (batchError) throw batchError;

      const { error: linkError } = await supabase
        .from("batch_items")
        .insert(items.map((i) => ({ batch_id: batch.id, consultation_id: i.id })));

      if (linkError) throw linkError;

      batches.push({ batchId: batch.id, clinicId: gClinicId, count: items.length, amount });
    }

    return new Response(
      JSON.stringify({ batches, excluded_not_priced: notPriced.length }),
      { status: 200, headers: { "Content-Type": "application/json", ...cors } }
    );
  } catch (e) {
    console.error("generate-payment-batch error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: cors }
    );
  }
});
