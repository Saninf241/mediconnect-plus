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

  // 1) Résoudre l’assureur à partir du staff connecté si besoin
  let finalInsurerId = insurerId as string | undefined;

  if (!finalInsurerId) {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    if (token) {
      const userClient = createClient(supabaseUrl, token, {
        auth: { persistSession: false },
      });

      const { data: userRes } = await userClient.auth.getUser();
      const email =
        (userRes.user as any)?.email ||
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

  // 2) Récupérer les consultations (sans JOIN)
  let q = supabase
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
        patient_id,
        doctor_id
      `,
    )
    .eq("insurer_id", finalInsurerId);

  if (status) q = q.eq("status", status);
  if (clinicId) q = q.eq("clinic_id", clinicId);
  if (dateStart) q = q.gte("created_at", dateStart);
  if (dateEnd) q = q.lte("created_at", dateEnd + "T23:59:59");

  q = q.order("created_at", { ascending: false });

  const { data: consultations, error } = await q;
  if (error) {
    console.error("filter-consultations consultations error", error);
    return new Response(
      JSON.stringify({ data: [], error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!consultations || consultations.length === 0) {
    return new Response(
      JSON.stringify({ data: [], error: null }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  // 3) Récupérer les IDs pour joindre manuellement
  const patientIds = Array.from(
    new Set(
      consultations
        .map((c: any) => c.patient_id)
        .filter((x: string | null) => !!x),
    ),
  );
  const doctorIds = Array.from(
    new Set(
      consultations
        .map((c: any) => c.doctor_id)
        .filter((x: string | null) => !!x),
    ),
  );
  const clinicIds = Array.from(
    new Set(
      consultations
        .map((c: any) => c.clinic_id)
        .filter((x: string | null) => !!x),
    ),
  );

  // 4) Charger les patients / médecins / cliniques
  const [patientsRes, doctorsRes, clinicsRes] = await Promise.all([
    patientIds.length
      ? supabase
          .from("patients")
          .select("id, name")
          .in("id", patientIds)
      : Promise.resolve({ data: [] as any[], error: null }),
    doctorIds.length
      ? supabase
          .from("clinic_staff")
          .select("id, name")
          .in("id", doctorIds)
      : Promise.resolve({ data: [] as any[], error: null }),
    clinicIds.length
      ? supabase
          .from("clinics")
          .select("id, name")
          .in("id", clinicIds)
      : Promise.resolve({ data: [] as any[], error: null }),
  ]);

  if (patientsRes.error) console.error("patients error", patientsRes.error);
  if (doctorsRes.error) console.error("doctors error", doctorsRes.error);
  if (clinicsRes.error) console.error("clinics error", clinicsRes.error);

  const patientsMap = new Map<string, string>();
  for (const p of patientsRes.data || []) {
    patientsMap.set(p.id, p.name);
  }

  const doctorsMap = new Map<string, string>();
  for (const d of doctorsRes.data || []) {
    doctorsMap.set(d.id, d.name);
  }

  const clinicsMap = new Map<string, string>();
  for (const c of clinicsRes.data || []) {
    clinicsMap.set(c.id, c.name);
  }

  // 5) Normaliser pour le front
  const normalized = (consultations as any[]).map((c) => {
    const patientName = c.patient_id
      ? patientsMap.get(c.patient_id) || null
      : null;
    const doctorName = c.doctor_id
      ? doctorsMap.get(c.doctor_id) || null
      : null;
    const clinicName = c.clinic_id
      ? clinicsMap.get(c.clinic_id) || null
      : null;

    // petit search texte côté serveur (optionnel)
    if (search) {
      const s = search.toLowerCase();
      const hay = [
        patientName || "",
        doctorName || "",
        clinicName || "",
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(s)) {
        return null; // filtré
      }
    }

    return {
      id: c.id,
      created_at: c.created_at,
      amount: c.amount,
      status: c.status,
      pdf_url: c.pdf_url,
      insurer_id: c.insurer_id,
      clinic_id: c.clinic_id,
      patient_name: patientName,
      doctor_name: doctorName,
      clinic_name: clinicName,
    };
  }).filter(Boolean);

  return new Response(
    JSON.stringify({ data: normalized, error: null }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
