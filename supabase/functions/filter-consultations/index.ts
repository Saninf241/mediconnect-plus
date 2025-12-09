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

  // On log pour debug (visible dans Supabase → Logs)
  console.log("filter-consultations body:", body);

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
        patient_id,
        doctor_id,
        clinic_id,
        patients ( name ),
        clinic_staff ( name ),
        clinics ( name )
      `
    );

  // ⚠ on NE filtre PLUS ici par insurer_id, on le fera côté front
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
    console.error("filter-consultations error:", error);
    return new Response(
      JSON.stringify({ data: [], error }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Pour debug : on renvoie aussi l’insurerId reçu
  console.log(
    "filter-consultations result (ids):",
    (data || []).map((r) => ({ id: r.id, insurer_id: r.insurer_id }))
  );

  return new Response(
    JSON.stringify({ data, error: null }),
    { headers: { "Content-Type": "application/json" } }
  );
});
