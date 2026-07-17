// supabase/functions/filter-consultations/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyToken } from "https://esm.sh/@clerk/backend@1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const jsonHeaders = {
  "Content-Type": "application/json",
  ...corsHeaders,
};

serve(async (req) => {
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
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authentification : on n'accepte plus insurerId depuis le corps de la
    // requete (n'importe qui pouvait se faire passer pour n'importe quel
    // assureur). On verifie le token Clerk et on derive l'insurerId depuis
    // la ligne insurer_staff de l'appelant, cote serveur.
    const clerkSecret = Deno.env.get("CLERK_SECRET_KEY")!;
    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace("Bearer ", "");

    if (!token) {
      return new Response(JSON.stringify({ data: [], error: "Non authentifié" }), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    const verifyResult = await verifyToken(token, { secretKey: clerkSecret });
    const payload = (verifyResult as any)?.payload ?? verifyResult;
    const callerId = payload.sub as string;

    const { data: staffRow, error: staffErr } = await supabase
      .from("insurer_staff")
      .select("insurer_id")
      .eq("clerk_user_id", callerId)
      .maybeSingle();

    if (staffErr || !staffRow?.insurer_id) {
      return new Response(
        JSON.stringify({ data: [], error: "Accès refusé : compte non lié à un assureur" }),
        { status: 403, headers: jsonHeaders }
      );
    }

    const insurerId = staffRow.insurer_id as string;

    const body = await req.json().catch(() => ({}));
    const {
      search = "",
      status = "",
      clinicId = "",
      dateStart = "",
      dateEnd = "",
    } = body as {
      search?: string;
      status?: string;
      clinicId?: string;
      dateStart?: string;
      dateEnd?: string;
    };

    const selectFields = `
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
      biometric_verified_at,
      biometric_operator_id,
      biometric_clinic_id,
      fingerprint_missing,
      insurer_comment,
      insurer_decision_at,
      patients(name),
      clinic_staff(name),
      clinics(name)
    `;

    let q = supabase
      .from("consultations")
      .select(selectFields)
      .eq("insurer_id", insurerId);

    if (status) q = q.eq("status", status);
    if (clinicId) q = q.eq("clinic_id", clinicId);

    if (dateStart) {
      q = q.gte("created_at", `${dateStart}T00:00:00`);
    }

    if (dateEnd) {
      q = q.lte("created_at", `${dateEnd}T23:59:59.999`);
    }

    const { data, error } = await q.order("created_at", { ascending: false });

    if (error) {
      console.error("filter-consultations error:", error);
      return new Response(JSON.stringify({ data: [], error }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    let filteredData = data ?? [];

    if (search.trim()) {
      // Insensible aux accents en plus de la casse : "loic"/"francois" doit
      // retrouver "Loïc"/"François" -- tres frequent sur des noms francophones.
      const normalize = (v: string) =>
        v.normalize("NFD").replace(new RegExp("[\\u0300-\\u036f]", "g"), "").toLowerCase();

      const s = normalize(search.trim());

      filteredData = filteredData.filter((row: any) => {
        const patientName = normalize(row?.patients?.name ?? "");
        const doctorName = normalize(row?.clinic_staff?.name ?? "");
        const clinicName = normalize(row?.clinics?.name ?? "");
        const statusText = normalize(row?.status ?? "");

        return (
          patientName.includes(s) ||
          doctorName.includes(s) ||
          clinicName.includes(s) ||
          statusText.includes(s)
        );
      });
    }

    console.log("filter-consultations first row:", filteredData[0] ?? null);

    return new Response(JSON.stringify({ data: filteredData, error: null }), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (e) {
    console.error("filter-consultations fatal error:", e);

    return new Response(
      JSON.stringify({
        data: [],
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: jsonHeaders,
      }
    );
  }
});