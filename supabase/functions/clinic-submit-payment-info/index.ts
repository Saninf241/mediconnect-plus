// supabase/functions/clinic-submit-payment-info/index.ts
// Soumission/mise a jour des coordonnees de paiement d'un cabinet (RIB ou
// mobile money). Reserve a l'admin (cabinet multi-specialiste) ou au
// medecin (cabinet specialiste solo, pas de role admin distinct chez eux).
// Toute soumission repart au statut "pending" -- seul le developpeur
// (action verify_clinic_payment_info sur dev-manage-orgs) peut la faire
// passer a "verified".
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyToken } from "https://esm.sh/@clerk/backend@1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function notifyDev(subject: string, text: string) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_FROM_EMAIL");
  const to = Deno.env.get("DEV_NOTIFICATION_EMAIL");
  if (!apiKey || !from || !to) {
    console.warn("[clinic-submit-payment-info] secrets manquants, notif dev ignoree");
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, text }),
    });
    if (!res.ok) console.error("[clinic-submit-payment-info] Resend error:", await res.text());
  } catch (e) {
    // Ne doit jamais faire echouer la soumission cote cabinet.
    console.error("[clinic-submit-payment-info] notifyDev failed:", e);
  }
}

function maskAccountNumber(v: string | null | undefined) {
  if (!v) return "—";
  const trimmed = v.replace(/\s+/g, "");
  if (trimmed.length <= 4) return trimmed;
  return `${"•".repeat(trimmed.length - 4)}${trimmed.slice(-4)}`;
}

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
      .from("clinic_staff")
      .select("id, clinic_id, role, name, email")
      .eq("clerk_user_id", callerId)
      .maybeSingle();

    if (staffErr || !staffRow?.clinic_id) {
      return new Response(
        JSON.stringify({ error: "Accès refusé : compte non lié à un cabinet" }),
        { status: 403, headers: cors }
      );
    }

    const { data: clinic, error: clinicErr } = await supabase
      .from("clinics")
      .select("type, name")
      .eq("id", staffRow.clinic_id)
      .maybeSingle();

    if (clinicErr || !clinic) {
      return new Response(JSON.stringify({ error: "Cabinet introuvable" }), { status: 404, headers: cors });
    }

    // Multi-specialiste : seul l'admin peut toucher aux coordonnees de
    // paiement. Specialiste solo (pas de role admin distinct) : le
    // medecin fait office de responsable.
    const isMultiSpecialist = clinic.type === "multi_specialist";
    const allowed = isMultiSpecialist ? staffRow.role === "admin" : staffRow.role === "doctor" || staffRow.role === "admin";

    if (!allowed) {
      return new Response(
        JSON.stringify({
          error: isMultiSpecialist
            ? "Accès réservé à l'administrateur du cabinet"
            : "Accès réservé au médecin du cabinet",
        }),
        { status: 403, headers: cors }
      );
    }

    const body = await req.json().catch(() => ({}));
    const {
      payment_method,
      bank_name,
      account_number,
      account_holder_name,
      mobile_money_provider,
      mobile_money_number,
    } = body as {
      payment_method?: string;
      bank_name?: string;
      account_number?: string;
      account_holder_name?: string;
      mobile_money_provider?: string;
      mobile_money_number?: string;
    };

    if (payment_method !== "bank_transfer" && payment_method !== "mobile_money") {
      return new Response(JSON.stringify({ error: "Moyen de paiement invalide" }), { status: 400, headers: cors });
    }

    if (payment_method === "bank_transfer" && (!bank_name?.trim() || !account_number?.trim() || !account_holder_name?.trim())) {
      return new Response(
        JSON.stringify({ error: "Banque, numéro de compte et titulaire requis pour un virement bancaire" }),
        { status: 400, headers: cors }
      );
    }

    if (payment_method === "mobile_money" && (!mobile_money_provider?.trim() || !mobile_money_number?.trim())) {
      return new Response(
        JSON.stringify({ error: "Opérateur et numéro requis pour un paiement mobile money" }),
        { status: 400, headers: cors }
      );
    }

    const { data: existing } = await supabase
      .from("clinic_payment_info")
      .select("id")
      .eq("clinic_id", staffRow.clinic_id)
      .maybeSingle();

    const { error: upsertErr } = await supabase
      .from("clinic_payment_info")
      .upsert(
        {
          clinic_id: staffRow.clinic_id,
          payment_method,
          bank_name: bank_name?.trim() || null,
          account_number: account_number?.trim() || null,
          account_holder_name: account_holder_name?.trim() || null,
          mobile_money_provider: mobile_money_provider?.trim() || null,
          mobile_money_number: mobile_money_number?.trim() || null,
          // Toute (re)soumission repart en attente -- invalide une
          // verification precedente, meme si un seul champ a change.
          status: "pending",
          verified_by_email: null,
          verified_at: null,
          rejection_reason: null,
          submitted_by_clerk_user_id: callerId,
          submitted_by_role: staffRow.role,
          submitted_by_name: staffRow.name,
          submitted_by_email: staffRow.email,
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "clinic_id" }
      );

    if (upsertErr) throw upsertErr;

    await notifyDev(
      `[MediConnect+] ${existing ? "Modification" : "Nouvelle soumission"} de coordonnées de paiement à vérifier`,
      [
        `${existing ? "Modification" : "Nouvelle soumission"} de coordonnées de paiement pour ${clinic.name ?? staffRow.clinic_id}.`,
        `Soumis par : ${staffRow.name ?? "?"} (${staffRow.role})`,
        payment_method === "bank_transfer"
          ? `Virement — ${bank_name} — compte se terminant par ${maskAccountNumber(account_number)}`
          : `Mobile money — ${mobile_money_provider} — ${maskAccountNumber(mobile_money_number)}`,
        ``,
        `À vérifier dans l'espace développeur (Gérer cabinets & assureurs).`,
      ].join("\n")
    );

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...cors },
    });
  } catch (e) {
    console.error("clinic-submit-payment-info error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: cors }
    );
  }
});
