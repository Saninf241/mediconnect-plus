// supabase/functions/export-payment-csv/index.ts
// Export CSV des lots de paiement de l'assureur connecte. Inclut la
// destination de paiement du cabinet (RIB/mobile money verifie, cf.
// clinic_payment_info -- migration 20260727130000 a ouvert la lecture
// assureur dessus), la reference d'un eventuel paiement automatique
// (payment_batch_payouts) et un indicateur de litige (batch_items ->
// consultations.payment_dispute_status). Numeros/comptes masques -- ce
// fichier peut circuler (email, tableur partage), jamais la donnee brute.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyToken } from "https://esm.sh/@clerk/backend@1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function toCSV(rows: Record<string, unknown>[], headers: string[]): string {
  const csv = [headers.join(",")];
  for (const row of rows) {
    csv.push(headers.map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(","));
  }
  return csv.join("\n");
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
      .from("insurer_staff")
      .select("insurer_id")
      .eq("clerk_user_id", callerId)
      .maybeSingle();

    if (staffErr || !staffRow?.insurer_id) {
      return new Response(
        JSON.stringify({ error: "Accès refusé : compte non lié à un assureur" }),
        { status: 403, headers: cors }
      );
    }

    const body = await req.json().catch(() => ({}));
    const status = (body as { status?: string })?.status || "pending";

    const { data: batches, error } = await supabase
      .from("payment_batches")
      .select(
        "id, clinic_id, amount, commission, total_paid, period_start, period_end, consultation_count, created_at, paid_at, paid_by_email, clinics(name)"
      )
      .eq("insurer_id", staffRow.insurer_id)
      .eq("status", status)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const batchIds = (batches ?? []).map((b: any) => b.id);
    const clinicIds = Array.from(new Set((batches ?? []).map((b: any) => b.clinic_id).filter(Boolean)));

    const [paymentInfoRes, payoutsRes, itemsRes] = await Promise.all([
      clinicIds.length > 0
        ? supabase
            .from("clinic_payment_info")
            .select(
              "clinic_id, payment_method, bank_name, account_number, mobile_money_provider, mobile_money_number, status"
            )
            .in("clinic_id", clinicIds)
        : Promise.resolve({ data: [], error: null }),
      batchIds.length > 0
        ? supabase
            .from("payment_batch_payouts")
            .select("batch_id, provider, status, provider_reference, completed_at")
            .in("batch_id", batchIds)
            .order("initiated_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      batchIds.length > 0
        ? supabase
            .from("batch_items")
            .select("batch_id, consultations:consultation_id(payment_dispute_status)")
            .in("batch_id", batchIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (paymentInfoRes.error) throw paymentInfoRes.error;
    if (payoutsRes.error) throw payoutsRes.error;
    if (itemsRes.error) throw itemsRes.error;

    const paymentInfoByClinic = new Map<string, any>();
    for (const r of (paymentInfoRes.data ?? []) as any[]) paymentInfoByClinic.set(r.clinic_id, r);

    // Un lot peut avoir plusieurs tentatives de paiement automatique
    // (echec puis reussite) -- on ne garde que la plus recente par lot
    // (deja triee desc par initiated_at plus haut).
    const payoutByBatch = new Map<string, any>();
    for (const r of (payoutsRes.data ?? []) as any[]) {
      if (!payoutByBatch.has(r.batch_id)) payoutByBatch.set(r.batch_id, r);
    }

    const disputeByBatch = new Map<string, "open" | "resolved" | null>();
    for (const it of (itemsRes.data ?? []) as any[]) {
      const s = it.consultations?.payment_dispute_status;
      if (!s) continue;
      const current = disputeByBatch.get(it.batch_id);
      // "open" prime toujours sur "resolved" si le lot contient les deux.
      if (s === "open" || current !== "open") disputeByBatch.set(it.batch_id, s);
    }

    const rows = (batches ?? []).map((b: any) => {
      const info = b.clinic_id ? paymentInfoByClinic.get(b.clinic_id) : undefined;
      const payout = payoutByBatch.get(b.id);
      const dispute = disputeByBatch.get(b.id);

      let destination = "Non vérifiée";
      if (info?.status === "verified") {
        destination =
          info.payment_method === "mobile_money"
            ? `Mobile money — ${info.mobile_money_provider ?? "—"} ${maskAccountNumber(info.mobile_money_number)}`
            : `Virement — ${info.bank_name ?? "—"} ${maskAccountNumber(info.account_number)}`;
      }

      return {
        "Clinique": b.clinics?.name || "",
        "Période début": b.period_start || "",
        "Période fin": b.period_end || "",
        "Nb consultations": b.consultation_count ?? "",
        "Montant": b.amount,
        "Commission": b.commission,
        "Net clinique": b.total_paid,
        "Statut": status,
        "Destination de paiement": destination,
        "Paiement automatique": payout
          ? `${payout.provider}${payout.status === "success" ? " (réussi)" : payout.status === "failed" ? " (échoué)" : " (en cours)"}`
          : "—",
        "Référence paiement": payout?.provider_reference || "",
        "Litige": dispute === "open" ? "En cours" : dispute === "resolved" ? "Résolu" : "Aucun",
        "Date création": b.created_at || "",
        "Date paiement": b.paid_at || "",
        "Payé par": b.paid_by_email || "",
        "Référence lot": b.id,
      };
    });

    const headers = [
      "Clinique",
      "Période début",
      "Période fin",
      "Nb consultations",
      "Montant",
      "Commission",
      "Net clinique",
      "Statut",
      "Destination de paiement",
      "Paiement automatique",
      "Référence paiement",
      "Litige",
      "Date création",
      "Date paiement",
      "Payé par",
      "Référence lot",
    ];

    const csv = toCSV(rows, headers);

    return new Response(csv, {
      status: 200,
      headers: {
        ...cors,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="paiements-${status}.csv"`,
      },
    });
  } catch (e) {
    console.error("export-payment-csv error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: cors }
    );
  }
});
