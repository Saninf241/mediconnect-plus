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
    // 1) Auth: verify JWT (HS256)
    // -------------------------
    const token = getBearerToken(req);
    if (!token) return json(401, { success: false, error: "Missing Authorization header" });

    const jwtSecret = Deno.env.get("JWT_SECRET");
    if (!jwtSecret) {
      return json(500, {
        success: false,
        error: "Missing JWT_SECRET env var (Supabase Edge Function secret)",
      });
    }

    let clerkUserId: string | null = null;

    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(jwtSecret), {
        algorithms: ["HS256"],
      });

      // Clerk user id (sub) — c’est ce qu’on utilise pour matcher clinic_staff / insurer_staff
      clerkUserId = (payload?.sub as string) ?? null;
    } catch (e) {
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
      return json(500, {
        success: false,
        error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // -------------------------
    // 3) Identify insurer staff user + insurer_id
    //    (selon ton schéma: clinic_staff OU insurer_staff)
    // -------------------------
    let insurerStaff: any = null;

    // A) Essai 1: insurer_staff (le plus logique)
    {
      const { data, error } = await supabase
        .from("insurer_staff")
        .select("id, insurer_id, role, clerk_user_id, email, name")
        .eq("clerk_user_id", clerkUserId)
        .maybeSingle();

      if (error) console.error("[detect-anomalies] insurer_staff lookup error:", error);
      if (data) insurerStaff = data;
    }

    // B) Fallback: clinic_staff (si chez toi c’est stocké là)
    if (!insurerStaff) {
      const { data, error } = await supabase
        .from("clinic_staff")
        .select("id, role, clerk_user_id, email, name, insurer_id")
        .eq("clerk_user_id", clerkUserId)
        .maybeSingle();

      if (error) console.error("[detect-anomalies] clinic_staff lookup error:", error);

      // Attention: ici on accepte seulement si role="assurer" OU "assureur"
      if (data && (data.role === "assurer" || data.role === "assureur")) {
        insurerStaff = data;
      }
    }

    if (!insurerStaff) {
      return json(403, { success: false, error: "Unauthorized - Not an assurer" });
    }

    const insurerId = insurerStaff.insurer_id;
    if (!insurerId) {
      return json(500, {
        success: false,
        error: "Assurer user has no insurer_id (cannot scope anomalies)",
      });
    }

    // -------------------------
    // 4) Fetch last 7 days consultations (SCOPED to insurer)
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
        insurer_id,
        fingerprint_missing,
        biometric_verified_at,
        patients ( name, is_assured ),
        clinics ( name ),
        clinic_staff!consultations_doctor_id_fkey ( name )
      `
      )
      .eq("insurer_id", insurerId)
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

      if (!patientVisits.has(key)) {
        patientVisits.set(key, new Set([c.clinic_id]));
      } else {
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

    return json(200, {
      success: true,
      insurer_id: insurerId,
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
