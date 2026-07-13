// supabase/functions/generate-patient-access-code/index.ts
// Appelé par le staff (secrétaire/médecin) pour remettre au patient un code
// à usage unique lui permettant d'activer son espace santé.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyToken } from "https://esm.sh/@clerk/backend@1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CODE_TTL_HOURS = 72;

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace("Bearer ", "");
    const verifyResult = await verifyToken(token, { secretKey: Deno.env.get("CLERK_SECRET_KEY")! });
    const payload = (verifyResult as any)?.payload ?? verifyResult;
    const callerId = payload.sub as string;

    const { patient_id } = await req.json();
    if (!patient_id) {
      return new Response(JSON.stringify({ error: "patient_id manquant" }), {
        status: 400,
        headers: cors,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("id, phone, clinic_id")
      .eq("id", patient_id)
      .single();

    if (patientError || !patient) {
      return new Response(JSON.stringify({ error: "Patient introuvable" }), {
        status: 404,
        headers: cors,
      });
    }

    // Le patient doit appartenir au cabinet de l'appelant -- avant ce
    // correctif, n'importe quel compte Clerk authentifie pouvait generer
    // un code d'activation (et recuperer le telephone + le code en clair
    // dans la reponse) pour n'importe quel patient de la plateforme.
    const { data: staffRow } = await supabase
      .from("clinic_staff")
      .select("id")
      .eq("clerk_user_id", callerId)
      .eq("clinic_id", patient.clinic_id)
      .maybeSingle();

    if (!staffRow) {
      return new Response(
        JSON.stringify({ error: "Accès refusé : ce patient n'appartient pas à votre cabinet" }),
        { status: 403, headers: cors }
      );
    }
    if (!patient.phone) {
      return new Response(
        JSON.stringify({ error: "Ce patient n'a pas de numéro de téléphone enregistré" }),
        { status: 400, headers: cors }
      );
    }

    const code = generateCode();
    const expires_at = new Date(Date.now() + CODE_TTL_HOURS * 3600 * 1000).toISOString();

    const { error: insertError } = await supabase
      .from("patient_activation_codes")
      .insert({ patient_id: patient.id, phone: patient.phone, code, expires_at });

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ code, phone: patient.phone, expires_at }),
      { headers: { "Content-Type": "application/json", ...cors } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 400, headers: cors });
  }
});
