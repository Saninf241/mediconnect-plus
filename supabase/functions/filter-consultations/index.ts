// supabase/functions/filter-consultations/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// client service-role (edge function = backend sécurisé)
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const jsonHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: jsonHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Only POST is allowed" }),
      { status: 405, headers: jsonHeaders },
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch (_e) {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: jsonHeaders },
    );
  }

  const {
    status = "",
    clinicId = "",
    dateStart = "",
    dateEnd = "",
    insurerId = "",
  } = body ?? {};

  try {
    // ✅ sélection très simple : aucune jointure, donc très peu de risques de 400
    let query = supabase
      .from("consultations")
      .select(
        `
        id,
        created_at,
        status,
        amount,
        insurer_id,
        clinic_id,
        patient_id,
        doctor_id,
        pdf_url
      `,
      )
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }
    if (clinicId) {
      query = query.eq("clinic_id", clinicId);
    }
    if (insurerId) {
      query = query.eq("insurer_id", insurerId);
    }
    if (dateStart) {
      query = query.gte("created_at", dateStart);
    }
    if (dateEnd) {
      // fin de journée incluse
      query = query.lte("created_at", `${dateEnd}T23:59:59`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[filter-consultations] Supabase error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: jsonHeaders },
      );
    }

    return new Response(
      JSON.stringify({ data }),
      { status: 200, headers: jsonHeaders },
    );
  } catch (e) {
    console.error("[filter-consultations] Unexpected error:", e);
    return new Response(
      JSON.stringify({ error: "Unexpected error" }),
      { status: 500, headers: jsonHeaders },
    );
  }
});

