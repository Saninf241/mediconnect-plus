// supabase/functions/filter-consultations/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonHeaders = {
  "Content-Type": "application/json",
  ...corsHeaders,
};

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: jsonHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json().catch(() => ({}));

    const {
      search = "",
      status = "",
      clinicId = "",
      dateStart = "",
      dateEnd = "",
      insurerId = "",
    } = body as {
      search?: string;
      status?: string;
      clinicId?: string;
      dateStart?: string;
      dateEnd?: string;
      insurerId?: string;
    };

    console.log("[filter-consultations] body:", body);

    // ✅ garde-fou anti fuite
    if (!insurerId) {
      return new Response(
        JSON.stringify({ data: [], error: "Missing insurerId" }),
        { status: 400, headers: jsonHeaders }
      );
    }

    let q = supabase
      .from("consultations")
      .select(`
        id,
        created_at,
        amount,
        status,
        pdf_url,
        insurer_id,
        patient_id,
        doctor_id,
        clinic_id,
        pricing_status,
        pricing_total,
        amount_delta,
        insurer_amount,
        patient_amount,
        missing_tariffs,
        patients ( name ),
        clinic_staff ( name ),
        clinics ( name )
      `)
      .eq("insurer_id", insurerId);

    if (status) q = q.eq("status", status);
    if (clinicId) q = q.eq("clinic_id", clinicId);
    if (dateStart) q = q.gte("created_at", dateStart);
    if (dateEnd) q = q.lte("created_at", dateEnd);

    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      q = q.or(
        `patients.name.ilike.${s},clinic_staff.name.ilike.${s},clinics.name.ilike.${s}`
      );
    }

    const { data, error } = await q.order("created_at", { ascending: false });

    if (error) {
      console.error("[filter-consultations] error:", error);
      return new Response(
        JSON.stringify({ data: [], error: error.message ?? error }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const first = data?.[0] as any;
    console.log("[filter-consultations] first row:", first
      ? {
          id: first.id,
          insurer_id: first.insurer_id,
          status: first.status,
          pricing_status: first.pricing_status,
          pricing_total: first.pricing_total,
          amount_delta: first.amount_delta,
        }
      : null
    );

    return new Response(JSON.stringify({ data: data ?? [], error: null }), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (e) {
    console.error("[filter-consultations] unexpected:", e);
    return new Response(
      JSON.stringify({ data: [], error: "Unexpected server error" }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
