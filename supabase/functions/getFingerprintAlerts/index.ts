// supabase/functions/getFingerprintAlerts/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ⚠️ Renseigne ces variables dans le dashboard Supabase (Function secrets)
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",              // mets ton domaine en prod
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

serve(async (req) => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const limit = Number(url.searchParams.get("limit") ?? "100");
    const since = url.searchParams.get("since"); // ISO string ex: 2025-08-01T00:00:00Z
    const until = url.searchParams.get("until"); // ISO string

    // Important: on propage le header Authorization du client pour appliquer RLS
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    let query = supabase
      .from("consultations_alerts")
      .select(
        "id, created_at, amount, status, patient_name, patient_is_assured, doctor_name, clinic_name, anomaly",
      )
      .eq("anomaly", true)
      .order("created_at", { ascending: false })
      .limit(isNaN(limit) ? 100 : limit);

    if (since) query = query.gte("created_at", since);
    if (until) query = query.lte("created_at", until);

    const { data, error } = await query;
    if (error) {
      console.error("getFingerprintAlerts query error:", error);
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, data: data ?? [] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("getFingerprintAlerts unexpected error:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
