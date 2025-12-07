// supabase/functions/filter-consultations/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const body = await req.json().catch(() => ({}));
  const {
    search = "",
    status = "",
    clinicId = "",
    dateStart = "",
    dateEnd = "",
    insurerId,
  } = body;

  // 1) Déterminer l'assureur à partir du staff connecté si besoin
  let finalInsurerId = insurerId as string | undefined;

  if (!finalInsurerId) {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    if (token) {
      const supabaseUserClient = createClient(supabaseUrl, token, {
        auth: { persistSession: false },
      });

      const { data: userRes } = await supabaseUserClient.auth.getUser();
      const email =
        (userRes.user as any)?.email ||
        (userRes.user as any)?.email_confirmed ||
        userRes.user?.user_metadata?.email ||
        undefined;

      if (email) {
        const { data: staffRow } = await supabase
          .from("insurer_staff")
          .select("insurer_id")
          .eq("email", email)
          .maybeSingle();

        if (staffRow?.insurer_id) {
          finalInsurerId = staffRow.insurer_id as string;
        }
      }
    }
  }

  if (!finalInsurerId) {
    return new Response(
      JSON.stringify({ data: [], error: "INSURER_NOT_RESOLVED" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  // 2) Requête avec JOINS en utilisant bien "name"
  let query = supabase
    .from("consultations")
    .select(
      `
      id,
      created_at,
      amount,
      status,
      pdf_url,
      insurer_id,
      clinic_id,
      patient:patients (
        name
      ),
      doctor:clinic_staff (
        name
      ),
      clinic:clinics (
        name
      )
    `,
    )
    .eq("insurer_id", finalInsurerId);

  if (status) {
    query = query.eq("status", status);
  }

  if (clinicId) {
    query = query.eq("clinic_id", clinicId);
  }

  if (dateStart) {
    query = query.gte("created_at", dateStart);
  }

  if (dateEnd) {
    query = query.lte("created_at", dateEnd + "T23:59:59");
  }

  query = query.order("created_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error("filter-consultations error", error);
    return new Response(
      JSON.stringify({ data: [], error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // 3) Normalisation → champs "plats" pour le front
  const normalized = (data ?? []).map((row: any) => ({
    id: row.id,
    created_at: row.created_at,
    amount: row.amount,
    status: row.status,
    pdf_url: row.pdf_url,
    insurer_id: row.insurer_id,
    clinic_id: row.clinic_id,
    patient_name: row.patient?.name ?? null,   // ⬅️ ici "name"
    doctor_name: row.doctor?.name ?? null,     // ⬅️ ici aussi
    clinic_name: row.clinic?.name ?? null,     // ⬅️ idem
  }));

  // 4) Eventuelle recherche texte côté JS si tu veux (search)

  return new Response(
    JSON.stringify({ data: normalized, error: null }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});

