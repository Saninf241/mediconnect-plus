// /functions/logBiometricCapture/index.ts
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
serve(async (req) => {
  try {
    const { consultation_id, patient_id, device_id, operator_id, api_key } = await req.json();

    // 1) simple auth par api_key (ou JWT dédié)
    if (api_key !== Deno.env.get("SCANNER_API_KEY")) {
      return new Response("Unauthorized", { status: 401 });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // 2) Idempotence: upsert unique sur consultation_id
    const { error } = await supabase
      .from("biometric_captures")
      .upsert({ consultation_id, patient_id, device_id, operator_id }, { onConflict: "consultation_id" });

    if (error) throw error;

    // 3) (optionnel) si le patient était non enrolé et assuré, on le marque comme enrôlé
    await supabase.from("patients").update({ finger_missing: false }).eq("id", patient_id);

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
});
