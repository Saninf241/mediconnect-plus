// supabase/functions/detect-anomalies/index.ts
// supabase/functions/detect-anomalies/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

type AlertType = "error" | "warning" | "info";

type AlertRow = {
  type: AlertType;
  message: string;
  consultation_id: string | null;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getBearerToken(req: Request): string | null {
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length).trim();
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // 0) Bearer
    const token = getBearerToken(req);
    if (!token) return json(401, { success: false, error: "Missing Authorization header" });

    // 1) Client "user" (validate token properly)
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return json(500, { success: false, error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY" });
    }

    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !userData?.user) {
      return json(401, { success: false, error: "Invalid token" });
    }

    // IMPORTANT: chez toi, l'id = Clerk user id (sub)
    const clerkUserId = userData.user.id;
    if (!clerkUserId) return json(401, { success: false, error: "Token invalid: missing user id" });

    // 2) Admin client (service role) for DB queries
    const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY");
    if (!SERVICE_ROLE_KEY) {
      return json(500, { success: false, error: "Missing SERVICE_ROLE_KEY env var" });
    }
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // 3) Check insurer staff
    const { data: staff, error: staffErr } = await supabaseAdmin
      .from("insurer_staff")
      .select("id, insurer_id, role, clerk_user_id")
      .eq("clerk_user_id", clerkUserId)
      .eq("role", "insurer_agent")
      .maybeSingle();

    if (staffErr) {
      console.error("[detect-anomalies] insurer_staff lookup error:", staffErr);
      return json(403, { success: false, error: "Unauthorized (insurer lookup failed)" });
    }
    if (!staff) return json(403, { success: false, error: "Unauthorized - Not an insurer_agent" });

    // 4) Fetch last 7 days consultations for this insurer
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    const { data: consultations, error: qErr } = await supabaseAdmin
      .from("consultations")
      .select(`
        id,
        patient_id,
        clinic_id,
        doctor_id,
        created_at,
        amount,
        fingerprint_missing,
        biometric_verified_at,
        insurer_id,
        patients ( name, is_assured ),
        clinics ( name ),
        clinic_staff!consultations_doctor_id_fkey ( name )
      `)
      .eq("insurer_id", staff.insurer_id)
      .gte("created_at", sevenDaysAgo.toISOString());

    if (qErr) {
      console.error("[detect-anomalies] consultations query error:", qErr);
      return json(500, { success: false, error: "DB error while fetching consultations" });
    }

    const alerts: AlertRow[] = [];

    // Rule 1: Same patient visits multiple clinics same day
    const patientVisits = new Map<string, Set<string>>();
    for (const c of consultations || []) {
      if (!c.patient_id || !c.clinic_id) continue;
      const dateStr = new Date(c.created_at).toISOString().split("T")[0];
      const key = `${c.patient_id}-${dateStr}`;

      if (!patientVisits.has(key)) patientVisits.set(key, new Set([c.clinic_id]));
      else {
        const clinicsSet = patientVisits.get(key)!;
        if (!clinicsSet.has(c.clinic_id)) {
          alerts.push({
            type: "warning",
            message: `Patient ${c.patients?.name ?? "?"} consulté dans plusieurs établissements le ${new Date(
              dateStr
            ).toLocaleDateString("fr-FR")}`,
            consultation_id: c.id,
          });
        }
        clinicsSet.add(c.clinic_id);
      }
    }

    // Rule 2: Missing biometric proof for insured patient
    for (const c of consultations || []) {
      const isAssured = c.patients?.is_assured === true;
      const missingBio = c.fingerprint_missing === true || !c.biometric_verified_at;

      if (isAssured && missingBio) {
        alerts.push({
          type: "error",
          message: `Empreinte manquante pour une prestation assurée — Patient ${c.patients?.name ?? "?"} à ${
            c.clinics?.name ?? "?"
          }`,
          consultation_id: c.id,
        });
      }
    }

    // Rule 3: Rapid succession consultations per clinic (< 15 min)
    const byClinic = new Map<string, any[]>();
    for (const c of consultations || []) {
      if (!c.clinic_id) continue;
      if (!byClinic.has(c.clinic_id)) byClinic.set(c.clinic_id, []);
      byClinic.get(c.clinic_id)!.push(c);
    }

    for (const list of byClinic.values()) {
      list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      for (let i = 1; i < list.length; i++) {
        const prev = list[i - 1];
        const curr = list[i];
        const diffMin =
          (new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime()) / (1000 * 60);

        if (diffMin < 15) {
          alerts.push({
            type: "warning",
            message: `Consultations rapprochées (${Math.round(diffMin)} min) à ${curr.clinics?.name ?? "?"}`,
            consultation_id: curr.id,
          });
        }
      }
    }

    // Rule 4: Unusual volume per clinic (avg/day > threshold)
    const clinicVolumes = new Map<string, number>();
    for (const c of consultations || []) {
      if (!c.clinic_id) continue;
      clinicVolumes.set(c.clinic_id, (clinicVolumes.get(c.clinic_id) || 0) + 1);
    }

    const avgDailyThreshold = 20;
    const daysInPeriod = 7;

    for (const [clinicId, count] of clinicVolumes.entries()) {
      const avgDaily = count / daysInPeriod;
      if (avgDaily > avgDailyThreshold) {
        const clinicName = (consultations || []).find((x: any) => x.clinic_id === clinicId)?.clinics?.name;
        alerts.push({
          type: "warning",
          message: `Volume inhabituel de consultations à ${clinicName ?? "?"} (${Math.round(avgDaily)} / jour)`,
          consultation_id: null,
        });
      }
    }

    return json(200, {
      success: true,
      alerts_count: alerts.length,
      alerts,
      from: sevenDaysAgo.toISOString(),
      to: now.toISOString(),
      insurer_id: staff.insurer_id,
    });
  } catch (e: any) {
    console.error("[detect-anomalies] fatal:", e);
    return json(500, { success: false, error: e?.message || "Internal error" });
  }
});
