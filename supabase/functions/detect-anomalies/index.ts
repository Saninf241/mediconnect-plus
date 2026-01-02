// supabase/functions/detect-anomalies/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";
import { jwtVerify } from "https://deno.land/x/jose@v4.14.4/index.ts";

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
    // -------------------------
    // 1) Verify Supabase JWT (HS256)
    // -------------------------
    const token = getBearerToken(req);
    if (!token) return json(401, { success: false, error: "Missing Authorization header" });

    const jwtSecret = Deno.env.get("SUPABASE_JWT_SECRET");
    if (!jwtSecret) return json(500, { success: false, error: "Missing SUPABASE_JWT_SECRET env var" });

    let clerkUserId: string | undefined;

    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(jwtSecret), {
        algorithms: ["HS256"],
      });
      clerkUserId = payload.sub as string | undefined;
    } catch (e: any) {
      console.error("[detect-anomalies] jwtVerify failed:", e);
      return json(401, { success: false, error: "Invalid token" });
    }

    if (!clerkUserId) return json(401, { success: false, error: "Token invalid: missing sub" });

    // -------------------------
    // 2) Supabase admin client (service role)
    // -------------------------
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return json(500, { success: false, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // -------------------------
    // 3) Check user is assurer (via clerk_user_id)
    // -------------------------
    const { data: assurer, error: assurerError } = await supabase
      .from("clinic_staff")
      .select("id, role, clinic_id, clerk_user_id, email")
      .eq("clerk_user_id", clerkUserId)
      .eq("role", "assurer")
      .maybeSingle();

    if (assurerError) {
      console.error("[detect-anomalies] assurer lookup error:", assurerError);
      return json(403, { success: false, error: "Unauthorized (assurer lookup failed)" });
    }
    if (!assurer) return json(403, { success: false, error: "Unauthorized - Not an assurer" });

    // -------------------------
    // 4) Fetch last 7 days consultations
    // -------------------------
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    const { data: consultations, error } = await supabase
      .from("consultations")
      .select(
        `
        id,
        patient_id,
        clinic_id,
        doctor_id,
        created_at,
        amount,
        fingerprint_missing,
        biometric_verified_at,
        patients ( name, is_assured ),
        clinics ( name ),
        clinic_staff!consultations_doctor_id_fkey ( name )
      `
      )
      .gte("created_at", sevenDaysAgo.toISOString());

    if (error) {
      console.error("[detect-anomalies] consultations query error:", error);
      return json(500, { success: false, error: "DB error while fetching consultations" });
    }

    const alerts: AlertRow[] = [];

    // -------------------------
    // Rule 1: Same patient visits multiple clinics same day
    // -------------------------
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

    // -------------------------
    // Rule 2: Missing biometric proof for insured patient
    // (based on YOUR real fields)
    // -------------------------
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

    // -------------------------
    // Rule 3: Rapid succession consultations per clinic (< 15 min)
    // -------------------------
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

    // -------------------------
    // Rule 4: Unusual activity volume per clinic (avg/day > threshold)
    // -------------------------
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

    // (Optionnel) ici tu peux enregistrer dans alerts/notifications plus tard
    return json(200, {
      success: true,
      alerts_count: alerts.length,
      alerts,
      from: sevenDaysAgo.toISOString(),
      to: now.toISOString(),
    });
  } catch (e: any) {
    console.error("[detect-anomalies] fatal:", e);
    return json(500, { success: false, error: e?.message || "Internal error" });
  }
});
