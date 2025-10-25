// netlify/functions/biometrics-candidates.ts
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const APP_INGEST_SECRET = process.env.APP_INGEST_SECRET!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "GET") return { statusCode: 405, body: "Method Not Allowed" };
    const auth = event.headers["x-app-secret"];
    if (!auth || auth !== APP_INGEST_SECRET) return { statusCode: 401, body: "Unauthorized" };

    const clinic_id = event.queryStringParameters?.clinic_id || null;

    // renvoie les biométries non révoquées, filtrées par clinique si fourni
    let query = supabase
      .from("patient_biometrics")
      .select("patient_id, template_b64")
      .eq("revoked", false);

    if (clinic_id) query = query.eq("clinic_id", clinic_id);

    const { data, error } = await query.limit(2000); // limite raisonnable

    if (error) {
      console.error(error);
      return { statusCode: 500, body: "DB error" };
    }

    return { statusCode: 200, body: JSON.stringify(data ?? []) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: "Server error" };
  }
};
