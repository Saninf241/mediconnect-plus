// Deno / Edge Runtime
// Espace developpeur : lecture/reponse/changement de statut sur TOUS les
// tickets (tous cabinets/assureurs confondus). support_tickets n'a aucune
// policy RLS pour le role "developer" (voir migration 20260712160000),
// donc cette route utilise la service role key et verifie elle-meme que
// l'appelant a bien publicMetadata.role === "developer" cote Clerk, comme
// dev-create-clinic / dev-create-insurer.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyToken } from "https://esm.sh/@clerk/backend@1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CLERK_API = "https://api.clerk.com/v1";

async function clerkFetch(path: string, init: RequestInit, secretKey: string) {
  const res = await fetch(`${CLERK_API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secretKey}`,
      ...(init.headers || {}),
    },
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.errors?.[0]?.message || `Clerk API error (${res.status})`);
  }
  return body;
}

type Action =
  | { action: "list"; status?: "open" | "in_progress" | "resolved" }
  | { action: "get"; ticket_id: string }
  | { action: "reply"; ticket_id: string; body: string; mark_status?: "open" | "in_progress" | "resolved" }
  | { action: "update_status"; ticket_id: string; status: "open" | "in_progress" | "resolved" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const clerkSecret = Deno.env.get("CLERK_SECRET_KEY")!;
    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace("Bearer ", "");

    const verifyResult = await verifyToken(token, { secretKey: clerkSecret });
    // verifyToken renvoie soit { payload }, soit le payload directement,
    // selon la version exacte que esm.sh resout pour "@clerk/backend@1".
    const payload = (verifyResult as any)?.payload ?? verifyResult;
    const callerId = payload.sub as string;

    const caller = await clerkFetch(`/users/${callerId}`, { method: "GET" }, clerkSecret);
    if (caller?.public_metadata?.role !== "developer") {
      return new Response(
        JSON.stringify({ error: "Accès refusé : réservé aux développeurs" }),
        { status: 403, headers: cors }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const input = (await req.json()) as Action;

    if (input.action === "list") {
      let query = supabase
        .from("support_tickets")
        .select("*, clinics:clinic_id(name), insurers:insurer_id(name)")
        .order("updated_at", { ascending: false });
      if (input.status) query = query.eq("status", input.status);
      const { data, error } = await query;
      if (error) throw error;
      return new Response(JSON.stringify({ tickets: data }), { headers: cors });
    }

    if (input.action === "get") {
      const { data: ticket, error: ticketErr } = await supabase
        .from("support_tickets")
        .select("*, clinics:clinic_id(name), insurers:insurer_id(name)")
        .eq("id", input.ticket_id)
        .single();
      if (ticketErr) throw ticketErr;

      const { data: messages, error: msgErr } = await supabase
        .from("support_ticket_messages")
        .select("*")
        .eq("ticket_id", input.ticket_id)
        .order("created_at", { ascending: true });
      if (msgErr) throw msgErr;

      return new Response(JSON.stringify({ ticket, messages }), { headers: cors });
    }

    if (input.action === "reply") {
      const { error: msgErr } = await supabase.from("support_ticket_messages").insert({
        ticket_id: input.ticket_id,
        author_clerk_user_id: callerId,
        author_role: "developer",
        author_name: caller?.first_name
          ? `${caller.first_name} ${caller.last_name ?? ""}`.trim()
          : "Développeur",
        body: input.body,
      });
      if (msgErr) throw msgErr;

      if (input.mark_status) {
        const { error: statusErr } = await supabase
          .from("support_tickets")
          .update({
            status: input.mark_status,
            resolved_at: input.mark_status === "resolved" ? new Date().toISOString() : null,
          })
          .eq("id", input.ticket_id);
        if (statusErr) throw statusErr;
      }

      return new Response(JSON.stringify({ ok: true }), { headers: cors });
    }

    if (input.action === "update_status") {
      const { error } = await supabase
        .from("support_tickets")
        .update({
          status: input.status,
          resolved_at: input.status === "resolved" ? new Date().toISOString() : null,
        })
        .eq("id", input.ticket_id);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), { headers: cors });
    }

    return new Response(JSON.stringify({ error: "Action inconnue" }), { status: 400, headers: cors });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String((e as Error).message ?? e) }),
      { status: 400, headers: cors }
    );
  }
});
