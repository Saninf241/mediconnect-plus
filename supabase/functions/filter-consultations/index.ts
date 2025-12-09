// supabase/functions/filter-consultations/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

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

  // ⚠️ Sécurité / filtrage : sans insurerId → aucune donnée
  if (!insurerId) {
    return new Response(
      JSON.stringify({ data: [], error: null }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  let q = supabase
    .from("consultations")
    .select(
      `
        id,
        created_at,
        amount,
        status,
        pdf_url,
        insurer_comment,
        insurer_id,
        patient_id,
        doctor_id,
        clinic_id,
        patients ( name ),
        clinic_staff ( name ),
        clinics ( name )
      `
    )
    .eq("insurer_id", insurerId); // ✅ filtre assureur

  if (status) q = q.eq("status", status);
  if (clinicId) q = q.eq("clinic_id", clinicId);
  if (dateStart) q = q.gte("created_at", dateStart);
  if (dateEnd) q = q.lte("created_at", dateEnd);

  if (search && search.trim()) {
    const s = `%${search.trim()}%`;
    // on cherche dans patient, médecin, clinique
    q = q.or(
      `patients.name.ilike.${s},clinic_staff.name.ilike.${s},clinics.name.ilike.${s}`
    );
  }

  const { data, error } = await q.order("created_at", { ascending: false });

  if (error) {
    console.error("filter-consultations error:", error);
    return new Response(
      JSON.stringify({ data: [], error }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ data, error: null }),
    { headers: { "Content-Type": "application/json" } }
  );
});
