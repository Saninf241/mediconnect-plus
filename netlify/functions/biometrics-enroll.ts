// netlify/functions/biometrics-enroll.ts
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const APP_INGEST_SECRET = process.env.APP_INGEST_SECRET!;

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

    if (!patient_id || !clinic_id || !template_b64) {
      return { statusCode: 400, body: "Missing fields" };
    }

    // Le seul garde-fou de cet endpoint est APP_INGEST_SECRET, un secret
    // partage embarque en dur dans l'app Android (extractible de l'APK) --
    // il n'authentifie pas QUI appelle, seulement "un appareil de la flotte".
    // Sans cette verification, patient_id/clinic_id sont pris tels quels :
    // un appelant qui connait/devine ces deux ids pouvait enroler un
    // gabarit biometrique pour un patient au nom d'un cabinet qui n'a
    // aucun lien reel avec lui. On verifie donc que patient_id appartient
    // bien a clinic_id (cabinet d'origine OU lien patient_clinic_links
    // existant, pour ne pas casser le cas legitime d'un patient suivi
    // dans plusieurs cabinets) avant d'ecrire quoi que ce soit.
    const { data: patientRow, error: patientErr } = await supabase
      .from("patients")
      .select("id, clinic_id")
      .eq("id", patient_id)
      .maybeSingle();

    if (patientErr) {
      console.error("patient lookup error:", patientErr);
      return { statusCode: 500, body: "DB error (patient lookup)" };
    }
    if (!patientRow) {
      return { statusCode: 404, body: "Patient introuvable" };
    }

    if (patientRow.clinic_id !== clinic_id) {
      const { data: link, error: linkErr } = await supabase
        .from("patient_clinic_links")
        .select("patient_id")
        .eq("patient_id", patient_id)
        .eq("clinic_id", clinic_id)
        .maybeSingle();

      if (linkErr) {
        console.error("patient_clinic_links lookup error:", linkErr);
        return { statusCode: 500, body: "DB error (clinic link lookup)" };
      }
      if (!link) {
        return { statusCode: 403, body: "Ce patient n'appartient pas à ce cabinet" };
      }
    }

    const hash =
      template_hash ||
      crypto.createHash("sha256").update(template_b64, "utf8").digest("hex");

    // 1) UPDATE si un actif existe déjà (revoked=false)
    const { error: upErr, count: upCount } = await supabase
      .from("patient_biometrics")
      .update({
        clinic_id,
        enrolled_by: operator_id ?? null,
        template_b64,
        template_hash: hash,
        quality: quality ?? null,
        device_model: device_model ?? null,
        updated_at: new Date().toISOString(),
      }, { count: "exact" })
      .eq("patient_id", patient_id)
      .eq("revoked", false);

    if (upErr) {
      console.error("UPDATE error:", upErr);
      return { statusCode: 500, body: "DB error (update)" };
    }

    if ((upCount ?? 0) > 0) {
      return { statusCode: 200, body: JSON.stringify({ ok: true, mode: "update" }) };
    }

    // 2) Sinon INSERT un nouvel actif
    const { error: insErr } = await supabase
      .from("patient_biometrics")
      .insert({
        patient_id,
        clinic_id,
        enrolled_by: operator_id ?? null,
        template_b64,
        template_hash: hash,
        quality: quality ?? null,
        device_model: device_model ?? null,
        revoked: false,
      });

    if (insErr) {
      // Si conflit rare (course condition), on retente un UPDATE
      if ((insErr as any).code === "23505") {
        const { error: up2Err } = await supabase
          .from("patient_biometrics")
          .update({
            clinic_id,
            enrolled_by: operator_id ?? null,
            template_b64,
            template_hash: hash,
            quality: quality ?? null,
            device_model: device_model ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("patient_id", patient_id)
          .eq("revoked", false);

        if (up2Err) {
          console.error("UPDATE after conflict error:", up2Err);
          return { statusCode: 500, body: "DB error (update-after-conflict)" };
        }

        return { statusCode: 200, body: JSON.stringify({ ok: true, mode: "update-after-conflict" }) };
      }

      console.error("INSERT error:", insErr);
      return { statusCode: 500, body: "DB error (insert)" };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, mode: "insert" }) };
  } catch (e: any) {
    console.error(e);
    return { statusCode: 500, body: "Server error" };
  }
};
