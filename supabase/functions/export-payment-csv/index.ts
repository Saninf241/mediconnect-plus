// supabase/functions/export-payment-csv/index.ts
// Export CSV des lots de paiement de l'assureur connecte. Ne contient pas
// de coordonnees bancaires (RIB) : ce champ n'existe pas encore sur le
// profil clinique -- a ajouter plus tard si un fichier de virement bancaire
// direct est necessaire.
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
      .select("id, amount, commission, total_paid, period_start, period_end, consultation_count, created_at, paid_at, clinics(name)")
      .eq("insurer_id", staffRow.insurer_id)
      .eq("status", status)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const rows = (batches ?? []).map((b: any) => ({
      "Clinique": b.clinics?.name || "",
      "Période début": b.period_start || "",
      "Période fin": b.period_end || "",
      "Nb consultations": b.consultation_count ?? "",
      "Montant": b.amount,
      "Commission": b.commission,
      "Net clinique": b.total_paid,
      "Statut": status,
      "Date création": b.created_at || "",
      "Date paiement": b.paid_at || "",
      "Référence lot": b.id,
    }));

    const headers = [
      "Clinique",
      "Période début",
      "Période fin",
      "Nb consultations",
      "Montant",
      "Commission",
      "Net clinique",
      "Statut",
      "Date création",
      "Date paiement",
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
