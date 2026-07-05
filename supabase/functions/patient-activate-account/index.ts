// supabase/functions/patient-activate-account/index.ts
// Appelé par le patient juste après vérification de son OTP téléphone
// (session Supabase Auth valide). Lie ce compte à sa fiche "patients"
// existante, à condition qu'il connaisse le code remis en clinique et que
// le téléphone corresponde à celui de la fiche.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Session invalide" }), {
        status: 401,
        headers: cors,
      });
    }
    const authUser = userData.user;
    const phone = authUser.phone;
    if (!phone) {
      return new Response(JSON.stringify({ error: "Aucun téléphone vérifié sur cette session" }), {
        status: 400,
        headers: cors,
      });
    }

    const { code } = await req.json();
    if (!code) {
      return new Response(JSON.stringify({ error: "Code manquant" }), {
        status: 400,
        headers: cors,
      });
    }

    // Le téléphone Supabase Auth est en E.164 sans "+" (ex: 24106xxxxxxx).
    // On compare en tolérant les deux formats stockés côté clinique.
    const phoneVariants = [phone, `+${phone}`];

    const { data: activation, error: activationError } = await supabase
      .from("patient_activation_codes")
      .select("id, patient_id, phone, expires_at, used_at")
      .in("phone", phoneVariants)
      .eq("code", code)
      .is("used_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activationError || !activation) {
      return new Response(JSON.stringify({ error: "Code invalide ou déjà utilisé" }), {
        status: 400,
        headers: cors,
      });
    }
    if (new Date(activation.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "Ce code a expiré, demandez-en un nouveau à la clinique" }), {
        status: 400,
        headers: cors,
      });
    }

    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("id, auth_user_id")
      .eq("id", activation.patient_id)
      .single();

    if (patientError || !patient) {
      return new Response(JSON.stringify({ error: "Dossier patient introuvable" }), {
        status: 404,
        headers: cors,
      });
    }
    if (patient.auth_user_id && patient.auth_user_id !== authUser.id) {
      return new Response(JSON.stringify({ error: "Ce dossier est déjà relié à un autre compte" }), {
        status: 409,
        headers: cors,
      });
    }

    const { error: updateError } = await supabase
      .from("patients")
      .update({ auth_user_id: authUser.id })
      .eq("id", patient.id);
    if (updateError) throw updateError;

    await supabase
      .from("patient_activation_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", activation.id);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json", ...cors },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 400, headers: cors });
  }
});
