// supabase/functions/mark-payment-batch-paid/index.ts
// Marque un lot de paiement comme paye et repercute payment_status/
// payment_date sur les consultations du lot. Reserve aux comptes admin de
// l'assureur proprietaire du lot (meme convention que MembersDirectoryPage).
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
      .select("id, insurer_id, role, email")
      .eq("clerk_user_id", callerId)
      .maybeSingle();

    if (staffErr || !staffRow?.insurer_id) {
      return new Response(
        JSON.stringify({ error: "Accès refusé : compte non lié à un assureur" }),
        { status: 403, headers: cors }
      );
    }

    if (staffRow.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Accès refusé : réservé aux administrateurs de l'assureur" }),
        { status: 403, headers: cors }
      );
    }

    const { batchId } = await req.json().catch(() => ({}));
    if (!batchId) {
      return new Response(JSON.stringify({ error: "batchId manquant" }), { status: 400, headers: cors });
    }

    const { data: batch, error: batchErr } = await supabase
      .from("payment_batches")
      .select("id, insurer_id, status")
      .eq("id", batchId)
      .maybeSingle();

    if (batchErr || !batch) {
      return new Response(JSON.stringify({ error: "Lot introuvable" }), { status: 404, headers: cors });
    }

    if (batch.insurer_id !== staffRow.insurer_id) {
      return new Response(
        JSON.stringify({ error: "Accès refusé : ce lot n'appartient pas à votre assureur" }),
        { status: 403, headers: cors }
      );
    }

    if (batch.status === "paid") {
      return new Response(JSON.stringify({ error: "Ce lot est déjà marqué payé" }), {
        status: 409,
        headers: cors,
      });
    }

    const now = new Date().toISOString();

    const { error: updateBatchErr } = await supabase
      .from("payment_batches")
      .update({
        status: "paid",
        paid_at: now,
        paid_by_staff_id: staffRow.id,
        paid_by_email: staffRow.email,
      })
      .eq("id", batchId);

    if (updateBatchErr) throw updateBatchErr;

    const { data: items, error: itemsErr } = await supabase
      .from("batch_items")
      .select("consultation_id")
      .eq("batch_id", batchId);

    if (itemsErr) throw itemsErr;

    const consultationIds = (items ?? []).map((i: any) => i.consultation_id).filter(Boolean);

    if (consultationIds.length > 0) {
      const { error: consultErr } = await supabase
        .from("consultations")
        .update({ payment_status: "paid", payment_date: now })
        .in("id", consultationIds);

      if (consultErr) throw consultErr;
    }

    return new Response(
      JSON.stringify({ success: true, updated: consultationIds.length }),
      { status: 200, headers: { "Content-Type": "application/json", ...cors } }
    );
  } catch (e) {
    console.error("mark-payment-batch-paid error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: cors }
    );
  }
});
