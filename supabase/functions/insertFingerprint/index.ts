import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );

  const { patient_id, fingerprint_template } = await req.json();

  if (!patient_id || !fingerprint_template) {
    return new Response("Missing fields", { status: 400 });
  }

  const { error } = await supabase.from("patients_fingerprint").insert({
    patient_id,
    fingerprint_template,
  });

  if (error) {
    return new Response("Failed to insert: " + error.message, { status: 500 });
  }

  return new Response("Fingerprint inserted", { status: 200 });
});
