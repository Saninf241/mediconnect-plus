// supabase/functions/declare-batch-transfer/index.ts
// Premiere etape du nouveau cycle de paiement : l'assureur ne paie plus
// directement la clinique. Il vire le montant du lot (amount, brut, avant
// commission) a Mediconnect+ par le moyen de son choix (virement bancaire
// le plus souvent), puis declare ce virement ici. Le lot passe de
// "pending" a "transfer_declared" -- aucune consultation n'est touchee a
// ce stade, seul un compte developer (Mediconnect+) peut ensuite confirmer
// la reception reelle des fonds et reverser au cabinet (voir l'action
// confirm_batch_funds_received de dev-manage-orgs, et
// initiate-payment-batch-payout pour le mobile money automatise).
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

    // Meme convention que le reste de l'espace paiements assureur : engager
    // un virement reste reserve au responsable (role admin), pas a un agent.
    if (staffRow.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Accès refusé : réservé aux administrateurs de l'assureur" }),
        { status: 403, headers: cors }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { batchId, transferReference } = body as { batchId?: string; transferReference?: string };
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

    if (batch.status !== "pending") {
      return new Response(
        JSON.stringify({
          error:
            batch.status === "transfer_declared"
              ? "Ce virement a déjà été déclaré, en attente de confirmation Mediconnect+."
              : "Ce lot est déjà payé.",
        }),
        { status: 409, headers: cors }
      );
    }

    // Un litige ouvert sur une consultation du lot bloque toute avancee du
    // cycle de paiement, meme la simple declaration de virement -- le
    // montant vire pourrait etre errone si le litige change insurer_amount.
    const { data: batchItems, error: batchItemsErr } = await supabase
      .from("batch_items")
      .select("consultation_id, consultations:consultation_id(payment_dispute_status)")
      .eq("batch_id", batchId);

    if (batchItemsErr) throw batchItemsErr;

    const disputedCount = (batchItems ?? []).filter(
      (it: any) => it.consultations?.payment_dispute_status === "open"
    ).length;

    if (disputedCount > 0) {
      return new Response(
        JSON.stringify({
          error: `Ce lot contient ${disputedCount} consultation(s) en litige ouvert avec la clinique. Résolvez le(s) litige(s) avant de déclarer le virement.`,
        }),
        { status: 409, headers: cors }
      );
    }

    const now = new Date().toISOString();

    // Update conditionne sur status='pending' : verrou atomique contre un
    // double-clic ou deux onglets declarant le meme virement deux fois.
    const { data: updated, error: updateErr } = await supabase
      .from("payment_batches")
      .update({
        status: "transfer_declared",
        insurer_transfer_reference: transferReference?.trim() || null,
        insurer_transfer_declared_at: now,
        insurer_transfer_declared_by_staff_id: staffRow.id,
      })
      .eq("id", batchId)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (updateErr) throw updateErr;

    if (!updated) {
      return new Response(
        JSON.stringify({ error: "Ce lot vient d'être modifié par quelqu'un d'autre. Actualisez la page." }),
        { status: 409, headers: cors }
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...cors },
    });
  } catch (e) {
    console.error("declare-batch-transfer error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: cors }
    );
  }
});
