// supabase/functions/detect-anomalies/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";
import {
  createRemoteJWKSet,
  jwtVerify,
} from "https://deno.land/x/jose@v4.14.4/index.ts";

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

// ✅ Mets ici TON vrai domaine Clerk (celui qui marche dans ton app)
const JWKS_URL =
  "https://awaited-mayfly-26.clerk.accounts.dev/.well-known/jwks.json";

const jwks = createRemoteJWKSet(new URL(JWKS_URL));

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // -------------------------
    // 1) Auth Clerk (JWKS)
    // -------------------------
    const token = getBearerToken(req);
    if (!token) return json(401, { success: false, error: "Missing Authorization header" });

    let clerkUserId: string | undefined;

    try {
      const { payload } = await jwtVerify(token, jwks);
      clerkUserId = payload.sub as string | undefined;
    } catch (e: any) {
      console.error("[detect-anomalies] Clerk jwtVerify failed:", e);
      return jsonnew Response(
        JSON.stringify({ success: false, error: "Invalid Clerk token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!clerkUserId) return json(401, { success: false, error: "Token invalid: missing sub" });

    // -------------------------
    // 2) Supabase admin client
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
    // 3) Check user is assurer
    // -------------------------
    // ✅ accepte plusieurs libellés possibles
    const allowedRoles = ["assurer", "assureur", "insurer"];

    const { data: staffRow, error: staffErr } = await supabase
      .from("clinic_staff")
      .select("id, role, clinic_id, clerk_user_id, email, name")
      .eq("clerk_user_id", clerkUserId)
      .maybeSingle();

    if (staffErr) {
      console.error("[detect-anomalies] clinic_staff lookup error:", staffErr);
      return json(500, { success: false, error: "DB error during assurer lookup" });
    }

    if (!staffRow) {
      // ⚠️ message utile: ça te dit que clerk_user_id n'est pas enregistré en base
      return json(403, {
        success: false,
        error: "Unauthorized - user not found in clinic_staff (missing clerk_user_id mapping)",
        debug: { clerkUserId },
      });
    }

    if (!allowedRoles.includes(String(staffRow.role))) {
      return json(403, {
        success: false,
        error: "Unauthorized - Not an assurer",
        debug: { role: staffRow.role, clerkUserId, staff_id: staffRow.id },
      });
    }

    // -------------------------
    // 4) Fetch last 7 days consultations
    // -------------------------
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    const { data: consultations, error: qErr } = await supabase
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

    if (qErr) {
      console.error("[detect-anomalies] consultations query error:", qErr);
      return json(500, { success: false, error: "DB error while fetching consultations" });
    }

    const alerts: AlertRow[] = [];

    // Rule 1: same patient multiple clinics same day
    const patientVisits = new Map<string, Set<string>>();
    for (const c of consultations || []) {
      if (!c.patient_id || !c.clinic_id) continue;
      const dateStr = new Date(c.created_at).toISOString().split("T")[0];
      const key = `${c.patient_id}-${dateStr}`;

      if (!patientVisits.has(key)) patientVisits.set(key, new Set([c.clinic_id]));
      else {
        const set = patientVisits.get(key)!;
        if (!set.has(c.clinic_id)) {
          alerts.push({
            type: "warning",
            message: `Patient ${c.patients?.name ?? "?"} consulté dans plusieurs établissements le ${new Date(
              dateStr
            ).toLocaleDateString("fr-FR")}`,
            consultation_id: c.id,
          });
        }
        set.add(c.clinic_id);
      }
    }

    // Rule 2: insured but missing biometric proof
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

    // Rule 3: rapid succession (<15 min) per clinic
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
