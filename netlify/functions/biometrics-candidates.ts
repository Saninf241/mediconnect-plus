// netlify/functions/biometrics-candidates.ts
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const APP_INGEST_SECRET = process.env.APP_INGEST_SECRET!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "GET") {
      return json(405, { error: "Method Not Allowed" });
    }

    const auth = event.headers["x-app-secret"];
    if (!auth || auth !== APP_INGEST_SECRET) {
      return json(401, { error: "Unauthorized" });
    }

    // NOTE (audit securite) : contrairement a biometrics-enroll, cet endpoint
    // ne peut pas verifier "ce clinic_id appartient bien a l'appelant" -- le
    // seul garde-fou reste APP_INGEST_SECRET, un secret partage identique
    // pour toute la flotte d'appareils (pas de credential par cabinet). Tant
    // que ce secret n'est pas remplace par une authentification par
    // appareil/cabinet, n'importe quel clinic_id peut theoriquement etre
    // interroge par quiconque detient le secret. Risque residuel accepte
    // pour l'instant, a traiter lors de la rotation/refonte d'INGEST_SECRET.
    const clinicId = event.queryStringParameters?.clinic_id || null;
    const scope = event.queryStringParameters?.scope || "network";

    if (!clinicId) {
      return json(400, { error: "Missing clinic_id" });
    }

    // Seul mode utilisé par l'appli : fusionne réseau assureur + patients
    // enrôlés directement dans ce cabinet (cf. section C ci-dessous). Un
    // ancien mode "clinic" strict existait ici mais n'était appelé par
    // personne — supprimé, sa logique est maintenant incluse dans "network".
    if (scope === "network") {
      // A. Assureurs conventionnés avec cette clinique/cabinet
      const { data: networks, error: networkErr } = await supabase
        .from("clinic_insurer_networks")
        .select("insurer_id")
        .eq("clinic_id", clinicId)
        .eq("status", "active")
        .eq("can_identify_network", true);

      if (networkErr) {
        console.error("[biometrics-candidates] network DB error:", networkErr);
        return json(500, { error: "Network DB error" });
      }

      const insurerIds = [...new Set((networks ?? []).map((n: any) => n.insurer_id).filter(Boolean))];

      let networkPatientIds: string[] = [];
      if (insurerIds.length > 0) {
        // B. Patients actifs chez ces assureurs
        const { data: memberships, error: membershipErr } = await supabase
          .from("insurer_memberships")
          .select("patient_id")
          .in("insurer_id", insurerIds)
          .eq("is_active", true)
          .eq("status", "active");

        if (membershipErr) {
          console.error("[biometrics-candidates] memberships DB error:", membershipErr);
          return json(500, { error: "Membership DB error" });
        }

        networkPatientIds = (memberships ?? []).map((m: any) => m.patient_id).filter(Boolean);
      }

      // C. Patients enrôlés directement dans ce cabinet, assurés ou non.
      // L'identification intra-cabinet ne doit jamais dépendre d'une
      // couverture assurance : un cabinet doit toujours retrouver les
      // patients qu'il a lui-même enrôlés, même sans réseau assureur actif.
      const { data: localBiometrics, error: localErr } = await supabase
        .from("patient_biometrics")
        .select("patient_id")
        .eq("clinic_id", clinicId)
        .eq("revoked", false);

      if (localErr) {
        console.error("[biometrics-candidates] local clinic DB error:", localErr);
        return json(500, { error: "Local clinic DB error" });
      }

      const localPatientIds = (localBiometrics ?? []).map((r: any) => r.patient_id).filter(Boolean);

      const patientIds = [...new Set([...networkPatientIds, ...localPatientIds])];

      if (patientIds.length === 0) {
        return json(200, []);
      }

      // D. Templates biométriques de ces patients
      const { data, error } = await supabase
        .from("patient_biometrics")
        .select("patient_id, template_b64")
        .eq("revoked", false)
        .in("patient_id", patientIds)
        .limit(2000);

      if (error) {
        console.error("[biometrics-candidates] biometrics DB error:", error);
        return json(500, { error: "Biometrics DB error" });
      }

      return json(200, data ?? []);
    }

    return json(400, { error: `Unsupported scope: ${scope}` });
  } catch (e) {
    console.error("[biometrics-candidates] fatal:", e);
    return json(500, { error: "Server error" });
  }
};
