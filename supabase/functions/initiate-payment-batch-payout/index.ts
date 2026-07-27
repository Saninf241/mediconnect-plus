// supabase/functions/initiate-payment-batch-payout/index.ts
// Declenche un paiement mobile money automatique pour un lot, en plus du
// "Marquer paye" manuel existant (mark-payment-batch-paid, inchange et
// toujours utilisable en repli -- virement bancaire, panne prestataire,
// ou cabinet sans moyen de paiement verifie).
//
// AUCUN PRESTATAIRE REEL N'EST BRANCHE : aucun compte marchand pawaPay/
// CinetPay n'existe encore (voir echanges utilisateur du 2026-07-27).
// Seul un provider "simulated" est implemente -- il simule un succes
// immediat pour permettre de tester tout le circuit (lot -> paiement ->
// cascade sur les consultations) sans argent reel. Pour brancher un vrai
// prestataire plus tard : ajouter son adapter dans PAYOUT_PROVIDERS,
// definir PAYOUT_PROVIDER dans les secrets de la fonction (sinon
// "simulated" reste le defaut), et fournir les cles API via d'autres
// secrets dedies (jamais en dur dans le code).
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyToken } from "https://esm.sh/@clerk/backend@1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function maskAccountNumber(v: string | null | undefined) {
  if (!v) return "—";
  const trimmed = v.replace(/\s+/g, "");
  if (trimmed.length <= 4) return trimmed;
  return `${"•".repeat(trimmed.length - 4)}${trimmed.slice(-4)}`;
}

type PayoutResult = { success: true; providerReference: string } | { success: false; reason: string };

// -- Adapters de prestataire ------------------------------------------------
// Chaque adapter recoit le montant (FCFA) et la destination en clair
// (jamais loguee) et doit renvoyer un PayoutResult. "simulated" est le
// seul actif aujourd'hui.
const PAYOUT_PROVIDERS: Record<
  string,
  (params: { amountFcfa: number; provider: string; number: string }) => Promise<PayoutResult>
> = {
  async simulated({ amountFcfa }) {
    // Pas d'appel reseau : succes immediat, pour pouvoir tester le circuit
    // complet sans compte marchand reel.
    return { success: true, providerReference: `SIM-${crypto.randomUUID()}` };
  },
  // pawaPay confirme live au Gabon avec Airtel Money (Moov Money annonce
  // "a venir" au moment de la verification, 2026-07-27) -- API de payout
  // dediee (pas juste de la collecte). A implementer une fois un compte
  // marchand pawaPay ouvert : POST https://api.pawapay.io/v2/payouts avec
  // un Bearer token (secret PAWAPAY_API_TOKEN), montant en devise mineure,
  // MSISDN du beneficiaire, correspondentId selon l'operateur.
  async pawapay() {
    return { success: false, reason: "Prestataire pawaPay pas encore configuré (aucune clé API)." };
  },
  // CinetPay : Moov Money Gabon confirme dans leur documentation generale,
  // couverture Airtel Money Gabon pas confirmee au 2026-07-27 -- a
  // revalider aupres d'eux avant integration.
  async cinetpay() {
    return { success: false, reason: "Prestataire CinetPay pas encore configuré (aucune clé API)." };
  },
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

    // Meme convention que mark-payment-batch-paid : declencher un vrai
    // paiement (meme simule) reste une action reservee a l'admin.
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
      .select("id, insurer_id, clinic_id, status, total_paid")
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

    // Meme garde-fou que mark-payment-batch-paid : un litige ouvert bloque
    // tout paiement, automatique ou manuel.
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
          error: `Ce lot contient ${disputedCount} consultation(s) en litige ouvert avec la clinique. Résolvez le(s) litige(s) avant de déclencher le paiement.`,
        }),
        { status: 409, headers: cors }
      );
    }

    const { data: paymentInfo, error: paymentInfoErr } = await supabase
      .from("clinic_payment_info")
      .select("payment_method, mobile_money_provider, mobile_money_number, status")
      .eq("clinic_id", batch.clinic_id)
      .maybeSingle();

    if (paymentInfoErr) throw paymentInfoErr;

    if (!paymentInfo || paymentInfo.status !== "verified") {
      return new Response(
        JSON.stringify({
          error:
            "Ce cabinet n'a pas encore de moyen de paiement vérifié. Demandez-lui de le renseigner (Paramètres du cabinet), " +
            "faites-le vérifier côté développeur, ou utilisez « Marquer payé » après un virement manuel.",
        }),
        { status: 409, headers: cors }
      );
    }

    if (paymentInfo.payment_method !== "mobile_money") {
      return new Response(
        JSON.stringify({
          error:
            "Le paiement automatique n'est disponible que pour un cabinet enregistré en mobile money. " +
            "Ce cabinet a enregistré un virement bancaire — utilisez « Marquer payé » après un virement manuel.",
        }),
        { status: 409, headers: cors }
      );
    }

    const providerName = Deno.env.get("PAYOUT_PROVIDER") || "simulated";
    const adapter = PAYOUT_PROVIDERS[providerName];
    if (!adapter) {
      return new Response(JSON.stringify({ error: `Prestataire de paiement inconnu : ${providerName}` }), {
        status: 500,
        headers: cors,
      });
    }

    const destinationSnapshot = {
      operator: paymentInfo.mobile_money_provider,
      masked_number: maskAccountNumber(paymentInfo.mobile_money_number),
    };

    // Cet insert sert de verrou atomique (index unique partiel
    // idx_payment_batch_payouts_active_per_batch, migration
    // 20260727140000) : si un autre appel concurrent (double-clic, autre
    // onglet) a deja cree une ligne "initiated"/"success" pour ce lot,
    // l'insert echoue AVANT qu'on appelle un prestataire -- on ne
    // declenche jamais deux paiements pour le meme lot.
    const { data: payoutRow, error: payoutInsertErr } = await supabase
      .from("payment_batch_payouts")
      .insert({
        batch_id: batchId,
        provider: providerName,
        destination_type: "mobile_money",
        destination_snapshot: destinationSnapshot,
        status: "initiated",
        initiated_by_staff_id: staffRow.id,
      })
      .select("id")
      .single();

    if (payoutInsertErr) {
      if ((payoutInsertErr as any).code === "23505") {
        return new Response(
          JSON.stringify({
            error: "Un paiement est déjà en cours ou a déjà réussi pour ce lot. Actualisez la page.",
          }),
          { status: 409, headers: cors }
        );
      }
      throw payoutInsertErr;
    }

    const result = await adapter({
      amountFcfa: batch.total_paid ?? 0,
      provider: paymentInfo.mobile_money_provider ?? "",
      number: paymentInfo.mobile_money_number ?? "",
    });

    if (!result.success) {
      await supabase
        .from("payment_batch_payouts")
        .update({ status: "failed", failure_reason: result.reason, completed_at: new Date().toISOString() })
        .eq("id", payoutRow.id);

      return new Response(JSON.stringify({ error: result.reason }), { status: 502, headers: cors });
    }

    const now = new Date().toISOString();

    await supabase
      .from("payment_batch_payouts")
      .update({ status: "success", provider_reference: result.providerReference, completed_at: now })
      .eq("id", payoutRow.id);

    // Meme verrou atomique que mark-payment-batch-paid : si un "Marquer
    // payé" manuel a deja bascule ce lot entre notre verification initiale
    // et maintenant, 0 ligne matche -- on ne recascade pas sur les
    // consultations (deja fait par l'autre chemin), on le signale juste.
    const { data: updatedBatch, error: updateBatchErr } = await supabase
      .from("payment_batches")
      .update({
        status: "paid",
        paid_at: now,
        paid_by_staff_id: staffRow.id,
        paid_by_email: staffRow.email,
      })
      .eq("id", batchId)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (updateBatchErr) throw updateBatchErr;

    let consultationIds: string[] = [];
    if (updatedBatch) {
      consultationIds = (batchItems ?? []).map((i: any) => i.consultation_id).filter(Boolean);

      if (consultationIds.length > 0) {
        const { error: consultErr } = await supabase
          .from("consultations")
          .update({ payment_status: "paid", payment_date: now })
          .in("id", consultationIds);

        if (consultErr) throw consultErr;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        simulated: providerName === "simulated",
        providerReference: result.providerReference,
        updated: consultationIds.length,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...cors } }
    );
  } catch (e) {
    console.error("initiate-payment-batch-payout error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: cors }
    );
  }
});
