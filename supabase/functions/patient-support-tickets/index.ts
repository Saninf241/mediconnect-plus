// supabase/functions/patient-support-tickets/index.ts
// Support cote espace patient : creer un ticket, voir ses propres tickets,
// repondre dans le fil. Les patients utilisent Supabase Auth natif
// (telephone+OTP), pas Clerk, donc aucune policy RLS existante sur
// support_tickets/support_ticket_messages (toutes scopees clinic_staff/
// insurer_staff via clerk_user_id) ne peut les couvrir -- cette fonction
// utilise la service role et verifie elle-meme que l'appelant a une
// session Supabase Auth valide reliee a une fiche patient, comme
// patient-portal-data / patient-activate-account.
//
// Le ticket cree ici tombe dans la meme table que les tickets staff, donc
// le webhook notify-ticket-email existant notifie deja le developpeur
// (aucun changement necessaire cote dev-support-tickets / TicketsPage.tsx,
// qui affichent deja clinics/insurers comme "-" si absents).
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Action =
  | { action: "create"; subject: string; message: string; priority?: string }
  | { action: "list" }
  | { action: "get"; ticket_id: string }
  | { action: "reply"; ticket_id: string; body: string };

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
      return new Response(JSON.stringify({ error: "Session invalide" }), { status: 401, headers: cors });
    }

    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("id, name, phone")
      .eq("auth_user_id", userData.user.id)
      .maybeSingle();

    if (patientError || !patient) {
      return new Response(
        JSON.stringify({ error: "Aucun dossier patient relié à ce compte" }),
        { status: 404, headers: cors }
      );
    }

    const input = (await req.json()) as Action;

    if (input.action === "create") {
      if (!input.subject?.trim() || !input.message?.trim()) {
        return new Response(JSON.stringify({ error: "Sujet et message requis" }), { status: 400, headers: cors });
      }

      const { data: ticket, error } = await supabase
        .from("support_tickets")
        .insert({
          created_by_patient_id: patient.id,
          created_by_role: "patient",
          created_by_name: patient.name,
          callback_phone: patient.phone,
          subject: input.subject.trim(),
          message: input.message.trim(),
          priority: input.priority && ["low", "normal", "high", "urgent"].includes(input.priority)
            ? input.priority
            : "normal",
        })
        .select("id")
        .single();

      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, ticket_id: ticket.id }), {
        headers: { "Content-Type": "application/json", ...cors },
      });
    }

    if (input.action === "list") {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("id, created_at, updated_at, subject, message, status, priority")
        .eq("created_by_patient_id", patient.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ tickets: data ?? [] }), {
        headers: { "Content-Type": "application/json", ...cors },
      });
    }

    if (input.action === "get") {
      const { data: ticket, error: ticketErr } = await supabase
        .from("support_tickets")
        .select("id, created_at, updated_at, subject, message, status, priority, created_by_patient_id")
        .eq("id", input.ticket_id)
        .maybeSingle();

      if (ticketErr || !ticket || ticket.created_by_patient_id !== patient.id) {
        return new Response(JSON.stringify({ error: "Ticket introuvable" }), { status: 404, headers: cors });
      }

      const { data: messages, error: msgErr } = await supabase
        .from("support_ticket_messages")
        .select("id, created_at, author_role, author_name, body")
        .eq("ticket_id", input.ticket_id)
        .order("created_at", { ascending: true });
      if (msgErr) throw msgErr;

      return new Response(JSON.stringify({ ticket, messages: messages ?? [] }), {
        headers: { "Content-Type": "application/json", ...cors },
      });
    }

    if (input.action === "reply") {
      const { data: ticket, error: ticketErr } = await supabase
        .from("support_tickets")
        .select("id, created_by_patient_id, status")
        .eq("id", input.ticket_id)
        .maybeSingle();

      if (ticketErr || !ticket || ticket.created_by_patient_id !== patient.id) {
        return new Response(JSON.stringify({ error: "Ticket introuvable" }), { status: 404, headers: cors });
      }
      if (!input.body?.trim()) {
        return new Response(JSON.stringify({ error: "Message requis" }), { status: 400, headers: cors });
      }

      const { error: msgErr } = await supabase.from("support_ticket_messages").insert({
        ticket_id: input.ticket_id,
        author_role: "patient",
        author_name: patient.name,
        body: input.body.trim(),
      });
      if (msgErr) throw msgErr;

      // Une reponse du patient rouvre un ticket resolu -- sinon elle
      // atterrirait dans un ticket marque "resolu" que le dev ne consulte
      // plus par defaut (TicketsPage.tsx filtre sur "open" par defaut).
      if (ticket.status === "resolved") {
        await supabase.from("support_tickets").update({ status: "open" }).eq("id", input.ticket_id);
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json", ...cors },
      });
    }

    return new Response(JSON.stringify({ error: "Action inconnue" }), { status: 400, headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), { status: 400, headers: cors });
  }
});
