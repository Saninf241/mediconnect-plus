// netlify/functions/insurer-rights-sync.ts
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * MOCK: 
 * - si patient.is_assured = true -> 80% assureur / 20% patient sur un panier fictif de 10 000 FCFA
 * - sinon 0% assureur
 * - renvoie aussi un insurer_id fictif
 */
export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const body = JSON.parse(event.body || "{}");
    const { patient_id, clinic_id, consultation_id } = body;

    if (!patient_id || !clinic_id || !consultation_id) {
      return { statusCode: 400, body: "Missing fields" };
    }

    // 1) lire patient
    const { data: patient, error: pErr } = await supabase
      .from("patients")
      .select("id, is_assured, insurance_provider")
      .eq("id", patient_id)
      .single();

    if (pErr || !patient) {
      return { statusCode: 404, body: "Patient not found" };
    }

    // 2) mock logique
    const base = 10000; // panier “devis” fictif pour la demo
    let insurer_amount = 0;
    let patient_amount = base;
    let insurer_id: string | null = null;

    if (patient.is_assured === true) {
      insurer_amount = Math.round(base * 0.8);
      patient_amount = base - insurer_amount;
      insurer_id = patient.insurance_provider ?? "mock-insurer";
    }

    // 3) (optionnel) on laisse le client web faire l'UPDATE
    // Si tu préfères que le serveur fasse l'UPDATE directement, dé-commente :
    /*
    await supabase.from("consultations").update({
      insurer_amount,
      patient_amount,
      insurer_id,
      rights_checked_at: new Date().toISOString(),
    }).eq("id", consultation_id);
    */

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        insurer_amount,
        patient_amount,
        insurer_id,
      }),
      headers: { "Content-Type": "application/json" },
    };
  } catch (e: any) {
    console.error(e);
    return { statusCode: 500, body: "Server error" };
  }
};
