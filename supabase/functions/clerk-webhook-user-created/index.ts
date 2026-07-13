// Deno / Edge Runtime
// Recoit le webhook Clerk "user.created" (Clerk Dashboard > Webhooks).
// Quand une invitation (dev-create-clinic / dev-create-insurer) est
// acceptee, Clerk cree le compte et declenche cet evenement -> on
// remplit automatiquement clerk_user_id sur la ligne clinic_staff ou
// insurer_staff correspondante (matchee par email), sans jamais
// necessiter que le developpeur touche Supabase a la main.
//
// Verification de signature manuelle (Svix, format utilise par Clerk)
// via Web Crypto plutot qu'une dependance externe incertaine sous Deno.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decode as base64Decode, encode as base64Encode } from "https://deno.land/std@0.177.0/encoding/base64.ts";

const MAX_TIMESTAMP_SKEW_SECONDS = 5 * 60;

async function verifySvixSignature(
  payload: string,
  svixId: string,
  svixTimestamp: string,
  svixSignature: string,
  secret: string
): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const ts = parseInt(svixTimestamp, 10);
  if (!ts || Math.abs(now - ts) > MAX_TIMESTAMP_SKEW_SECONDS) return false;

  const secretBytes = base64Decode(secret.startsWith("whsec_") ? secret.slice(6) : secret);
  const signedContent = `${svixId}.${svixTimestamp}.${payload}`;

  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedContent));
  const expected = base64Encode(new Uint8Array(sigBytes));

  const candidates = svixSignature
    .split(" ")
    .map((s) => s.split(",")[1])
    .filter(Boolean);

  return candidates.includes(expected);
}

serve(async (req) => {
  try {
    const payload = await req.text();
    const svixId = req.headers.get("svix-id") ?? "";
    const svixTimestamp = req.headers.get("svix-timestamp") ?? "";
    const svixSignature = req.headers.get("svix-signature") ?? "";
    const webhookSecret = Deno.env.get("CLERK_WEBHOOK_SECRET")!;

    const valid = await verifySvixSignature(payload, svixId, svixTimestamp, svixSignature, webhookSecret);
    if (!valid) {
      return new Response(JSON.stringify({ error: "Signature invalide" }), { status: 401 });
    }

    const evt = JSON.parse(payload);
    if (evt.type !== "user.created") {
      return new Response(JSON.stringify({ ok: true, skipped: true }), { status: 200 });
    }

    const clerkUserId = evt.data?.id as string | undefined;
    const emails: string[] = (evt.data?.email_addresses ?? []).map((e: any) => e.email_address).filter(Boolean);

    if (!clerkUserId || emails.length === 0) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), { status: 200 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const results: Record<string, unknown> = {};

    for (const email of emails) {
      const clinicRes = await supabase
        .from("clinic_staff")
        .update({ clerk_user_id: clerkUserId })
        .is("clerk_user_id", null)
        .eq("email", email)
        .select("id");

      const insurerRes = await supabase
        .from("insurer_staff")
        .update({ clerk_user_id: clerkUserId })
        .is("clerk_user_id", null)
        .eq("email", email)
        .select("id");

      results[email] = {
        clinic_staff_updated: clinicRes.data?.length ?? 0,
        insurer_staff_updated: insurerRes.data?.length ?? 0,
      };
    }

    return new Response(JSON.stringify({ ok: true, clerk_user_id: clerkUserId, results }), { status: 200 });
  } catch (e) {
    console.error("[clerk-webhook-user-created] error:", e);
    // 200 pour eviter que Clerk ne re-essaie en boucle sur une erreur
    // cote nettoyage ; l'echec reste visible dans les logs de la fonction.
    return new Response(JSON.stringify({ ok: false, error: String((e as Error).message ?? e) }), { status: 200 });
  }
});
