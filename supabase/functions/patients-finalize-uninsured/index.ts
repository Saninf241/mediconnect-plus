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
    const { payload } = await verifyToken(token, {
      secretKey: Deno.env.get("CLERK_SECRET_KEY")!,
    });

    const email =
      // @ts-ignore
      payload?.email_addresses?.[0]?.email_address || payload?.email || null;
    if (!email) return new Response(JSON.stringify({ error: "No email" }), { status: 401, headers: cors });

    const { patient_id, fingerprint_missing } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await supabase.rpc("finalize_patient_uninsured", {
      p_patient_id: patient_id,
      p_fingerprint_missing: !!fingerprint_missing,
      actor_email: email,
    });
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), { headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 400, headers: cors });
  }
});
