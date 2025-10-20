// netlify/functions/biometrics-enroll.ts
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const APP_INGEST_SECRET = process.env.APP_INGEST_SECRET!; // secret partagé avec l'app

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }
    const auth = event.headers["x-app-secret"];
    if (!auth || auth !== APP_INGEST_SECRET) {
      return { statusCode: 401, body: "Unauthorized" };
    }

    const payload = JSON.parse(event.body || "{}");
    const {
      patient_id,
      clinic_id,
      operator_id,
      template_b64,
      template_hash,
      quality,
      device_model,
    } = payload;

    if (!patient_id || !clinic_id || !template_b64 || !template_hash) {
      return { statusCode: 400, body: "Missing fields" };
    }

    // upsert par patient (si déjà présent et pas 'revoked')
    const { error } = await supabase
      .from("patient_biometrics")
      .upsert(
        {
          patient_id,
          clinic_id,
          enrolled_by: operator_id ?? null,
          template_b64,
          template_hash,
          quality: quality ?? null,
          device_model: device_model ?? null,
          revoked: false,
        },
        { onConflict: "patient_id" }
      );

    if (error) {
      console.error(error);
      return { statusCode: 500, body: "DB error" };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true }),
    };
  } catch (e: any) {
    console.error(e);
    return { statusCode: 500, body: "Server error" };
  }
};
