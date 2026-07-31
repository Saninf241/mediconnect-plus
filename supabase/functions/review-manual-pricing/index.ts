// supabase/functions/review-manual-pricing/index.ts
// Approbation/rejet d'une proposition de tarification manuelle. Reserve a
// l'admin de l'assureur proprietaire de la proposition (meme convention
// que mark-payment-batch-paid). L'approbation ecrit consultations.
// insurer_amount / pricing_status='manual_approved' -- a partir de la,
// la consultation suit exactement le meme chemin que si le calcul
// automatique avait reussi (eligible a generate-payment-batch).
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
        JSON.stringify({ error: "Accès réservé aux administrateurs de l'assureur" }),
        { status: 403, headers: cors }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { manual_pricing_id, decision, rejection_reason } = body as {
      manual_pricing_id?: string;
      decision?: "approve" | "reject";
      rejection_reason?: string;
    };

    if (!manual_pricing_id || (decision !== "approve" && decision !== "reject")) {
      return new Response(
        JSON.stringify({ error: "manual_pricing_id et decision ('approve'|'reject') requis" }),
        { status: 400, headers: cors }
      );
    }

    const { data: proposal, error: proposalErr } = await supabase
      .from("consultation_manual_pricing")
      .select("id, consultation_id, insurer_id, proposed_amount, proposed_by_staff_id, status, consultations(payment_status)")
      .eq("id", manual_pricing_id)
      .maybeSingle();

    if (proposalErr || !proposal) {
      return new Response(JSON.stringify({ error: "Proposition introuvable" }), { status: 404, headers: cors });
    }

    if (proposal.insurer_id !== staffRow.insurer_id) {
      return new Response(
        JSON.stringify({ error: "Accès refusé : cette proposition n'appartient pas à votre assureur" }),
        { status: 403, headers: cors }
      );
    }

    if (proposal.status !== "pending") {
      return new Response(
        JSON.stringify({ error: `Cette proposition est déjà "${proposal.status}"` }),
        { status: 409, headers: cors }
      );
    }

    if (decision === "reject") {
      if (!rejection_reason?.trim()) {
        return new Response(JSON.stringify({ error: "Motif de rejet requis" }), { status: 400, headers: cors });
      }

      const { error } = await supabase
        .from("consultation_manual_pricing")
        .update({
          status: "rejected",
          rejection_reason: rejection_reason.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", manual_pricing_id);
      if (error) throw error;

      if (proposal.proposed_by_staff_id) {
        const { error: notifErr } = await supabase.from("notifications").insert({
          user_id: proposal.proposed_by_staff_id,
          type: "manual_pricing_decision",
          title: "Proposition de tarification rejetée",
          content: `Votre proposition a été rejetée : ${rejection_reason.trim().slice(0, 160)}`,
          metadata: { consultation_id: proposal.consultation_id, event: "proposal_rejected" },
          read: false,
        });
        if (notifErr) console.error("review-manual-pricing: erreur notification agent:", notifErr);
      }

      return new Response(JSON.stringify({ ok: true, status: "rejected" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...cors },
      });
    }

    // decision === "approve"
    // Une consultation deja payee ne doit jamais voir son montant change
    // silencieusement : le lot de paiement correspondant a deja ete verse
    // sur l'ancien montant, et rien ici ne sait faire un ajustement/
    // remboursement. On refuse plutot que de laisser consultations
    // diverger de ce qui a reellement ete paye.
    const alreadyPaid = (proposal as any).consultations?.payment_status === "paid";
    if (alreadyPaid) {
      return new Response(
        JSON.stringify({
          error:
            "Cette consultation a déjà été payée sur la base d'un montant précédent. " +
            "Une approbation changerait le montant sans ajuster le paiement déjà versé — " +
            "à traiter manuellement (pas de processus de régularisation automatique pour l'instant).",
        }),
        { status: 409, headers: cors }
      );
    }

    const { error: updateProposalErr } = await supabase
      .from("consultation_manual_pricing")
      .update({
        status: "approved",
        approved_by_staff_id: staffRow.id,
        approved_by_email: staffRow.email,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", manual_pricing_id);
    if (updateProposalErr) throw updateProposalErr;

    const { error: updateConsultationErr } = await supabase
      .from("consultations")
      .update({
        insurer_amount: proposal.proposed_amount,
        pricing_status: "manual_approved",
      })
      .eq("id", proposal.consultation_id);
    if (updateConsultationErr) throw updateConsultationErr;

    if (proposal.proposed_by_staff_id) {
      const { error: notifErr } = await supabase.from("notifications").insert({
        user_id: proposal.proposed_by_staff_id,
        type: "manual_pricing_decision",
        title: "Proposition de tarification approuvée",
        content: `Votre proposition de ${proposal.proposed_amount.toLocaleString("fr-FR")} FCFA a été approuvée.`,
        metadata: { consultation_id: proposal.consultation_id, event: "proposal_approved" },
        read: false,
      });
      if (notifErr) console.error("review-manual-pricing: erreur notification agent:", notifErr);
    }

    return new Response(JSON.stringify({ ok: true, status: "approved" }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...cors },
    });
  } catch (e) {
    console.error("review-manual-pricing error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: cors }
    );
  }
});
