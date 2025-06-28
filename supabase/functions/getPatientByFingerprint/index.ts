import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function compareTemplates(templateA: string, templateB: string): boolean {
  return templateA === templateB;
}

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );

  const { fingerprint_template } = await req.json();

  if (!fingerprint_template) {
    return new Response("Missing fingerprint_template", { status: 400 });
  }

  const { data, error } = await supabase.from("patients_fingerprint").select();

  if (error || !data) {
    return new Response("Database error", { status: 500 });
  }

  const match = data.find((record) =>
    compareTemplates(record.fingerprint_template, fingerprint_template)
  );

  if (!match) {
    return new Response("Patient not found", { status: 404 });
  }

  return new Response(JSON.stringify({ patient_id: match.patient_id }), {
    headers: { "Content-Type": "application/json" },
  });
});
