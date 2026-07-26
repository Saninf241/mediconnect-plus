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

// patients.phone est saisi en clinique en local gabonais ("077074475"),
// sans normalisation (3 chemins de creation divergents, aucun n'applique
// de format E.164) -- verifie empiriquement : 100% des numeros reels en
// base sont dans ce format. authUser.phone (Supabase Auth, apres OTP) est
// en E.164 sans "+" ("24177074475"). Comparer ces deux formats bruts ne
// matche jamais, ce qui rendait l'activation impossible pour tout le
// monde (0 code utilise, 0 compte relie en base au moment de ce correctif).
// On compare donc sur les chiffres significatifs (indicatif 241 et zero
// initial retires des deux cotes) plutot que sur la chaine brute.
function significantDigits(raw: string | null | undefined): string {
  const digits = (raw ?? "").replace(/[^\d]/g, "");
  const withoutCountryCode = digits.startsWith("241") ? digits.slice(3) : digits;
  return withoutCountryCode.replace(/^0/, "");
}

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

    // Le code seul n'est pas suffisant pour identifier la bonne ligne (deux
    // patients differents pourraient un jour partager le meme code sur
    // 900 000 valeurs possibles) : on filtre par code, puis on confirme le
    // telephone en comparant les chiffres significatifs des deux cotes
    // (cf. significantDigits ci-dessus) plutot que la chaine brute.
    const { data: candidates, error: activationError } = await supabase
      .from("patient_activation_codes")
      .select("id, patient_id, phone, expires_at, used_at")
      .eq("code", code)
      .is("used_at", null)
      .order("created_at", { ascending: false });

    const callerDigits = significantDigits(phone);
    const activation = (candidates ?? []).find(
      (c) => significantDigits(c.phone) === callerDigits
    );

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
