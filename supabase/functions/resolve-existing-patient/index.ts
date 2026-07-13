// supabase/functions/resolve-existing-patient/index.ts
// Appelé par le staff (secrétaire) avant de créer une nouvelle fiche
// patient : retrouve un dossier existant via un identifiant fort (n°
// d'adhérent chez l'assureur sélectionné, ou NIN) pour éviter qu'une même
// personne accumule plusieurs fiches réparties entre cabinets.
//
// Priorité : n° d'adhérent + assureur (identifiant le plus fiable pour un
// assuré, cible prioritaire du produit), puis NIN en repli. On utilise le
// service role car insurer_memberships a RLS activé et on ne veut pas
// dépendre de la policy en place pour ce contrôle anti-doublon.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyToken } from "https://esm.sh/@clerk/backend@1";

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
    const verifyResult = await verifyToken(token, { secretKey: Deno.env.get("CLERK_SECRET_KEY")! });
    const payload = (verifyResult as any)?.payload ?? verifyResult;
    const callerId = payload.sub as string;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // La recherche est volontairement transversale a tous les cabinets
    // (anti-doublon), mais l'appelant doit au moins etre un membre reel
    // du personnel d'un cabinet -- avant ce correctif, n'importe quel
    // compte Clerk authentifie (meme sans aucun lien avec un cabinet)
    // pouvait sonder l'existence d'un patient par NIN/n° d'adherent.
    const { data: staffRow } = await supabase
      .from("clinic_staff")
      .select("id")
      .eq("clerk_user_id", callerId)
      .maybeSingle();

    if (!staffRow) {
      return new Response(
        JSON.stringify({ error: "Accès refusé : réservé au personnel d'un cabinet" }),
        { status: 403, headers: cors }
      );
    }

    const { insurer_id, member_no, national_id } = await req.json();

    if (insurer_id && member_no) {
      const { data: membership } = await supabase
        .from("insurer_memberships")
        .select("patient_id")
        .eq("insurer_id", insurer_id)
        .eq("member_no", member_no)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (membership?.patient_id) {
        return new Response(
          JSON.stringify({ patient_id: membership.patient_id, matched_on: "member_no" }),
          { headers: { "Content-Type": "application/json", ...cors } }
        );
      }
    }

    if (national_id) {
      const { data: patient } = await supabase
        .from("patients")
        .select("id")
        .eq("national_id", national_id)
        .limit(1)
        .maybeSingle();

      if (patient?.id) {
        return new Response(
          JSON.stringify({ patient_id: patient.id, matched_on: "national_id" }),
          { headers: { "Content-Type": "application/json", ...cors } }
        );
      }
    }

    return new Response(JSON.stringify({ patient_id: null }), {
      headers: { "Content-Type": "application/json", ...cors },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 400, headers: cors });
  }
});
