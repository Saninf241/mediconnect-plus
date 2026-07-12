// Deno / Edge Runtime
// Recoit un Database Webhook Supabase (Studio > Database > Webhooks) sur :
//   - INSERT support_tickets           -> notifie le dev d'un nouveau ticket
//   - INSERT support_ticket_messages   -> notifie le dev d'une nouvelle
//     reponse d'un cabinet/assureur (on ignore les messages dont
//     author_role = 'developer', ce sont ses propres reponses)
//
// Necessite les secrets Edge Function suivants (Studio > Edge Functions >
// Secrets, ou `supabase secrets set`) :
//   RESEND_API_KEY        cle API Resend (https://resend.com)
//   RESEND_FROM_EMAIL      ex: "MediConnect+ <notifications@ton-domaine.com>"
//   DEV_NOTIFICATION_EMAIL  adresse qui recoit les notifications
//
// Si RESEND_API_KEY n'est pas configure, la fonction repond 200 sans rien
// envoyer (pour ne jamais faire echouer le webhook / bloquer la creation
// du ticket cote appelant).
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type WebhookPayload = {
  type: "INSERT";
  table: "support_tickets" | "support_ticket_messages";
  record: Record<string, unknown>;
};

async function sendEmail(subject: string, text: string) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_FROM_EMAIL");
  const to = Deno.env.get("DEV_NOTIFICATION_EMAIL");
  if (!apiKey || !from || !to) {
    console.warn("[notify-ticket-email] secrets manquants, envoi ignore");
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, text }),
  });

  if (!res.ok) {
    console.error("[notify-ticket-email] Resend error:", await res.text());
  }
}

serve(async (req) => {
  try {
    const payload = (await req.json()) as WebhookPayload;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (payload.table === "support_tickets") {
      const t = payload.record as {
        id: string;
        subject: string;
        message: string;
        created_by_role: string;
        created_by_name: string | null;
        callback_phone: string | null;
        priority: string;
      };

      await sendEmail(
        `[MediConnect+] Nouveau ticket (${t.priority}) : ${t.subject}`,
        [
          `Rôle : ${t.created_by_role}`,
          `De : ${t.created_by_name ?? "inconnu"}`,
          t.callback_phone ? `Téléphone de rappel : ${t.callback_phone}` : null,
          "",
          t.message,
          "",
          `Ticket : ${t.id}`,
        ]
          .filter(Boolean)
          .join("\n")
      );
    }

    if (payload.table === "support_ticket_messages") {
      const m = payload.record as {
        ticket_id: string;
        author_role: string;
        author_name: string | null;
        body: string;
      };

      if (m.author_role !== "developer") {
        const { data: ticket } = await supabase
          .from("support_tickets")
          .select("subject")
          .eq("id", m.ticket_id)
          .single();

        await sendEmail(
          `[MediConnect+] Nouvelle réponse sur "${ticket?.subject ?? m.ticket_id}"`,
          [`De : ${m.author_name ?? m.author_role}`, "", m.body, "", `Ticket : ${m.ticket_id}`].join("\n")
        );
      }
    }

    return new Response(JSON.stringify({ ok: true }));
  } catch (e) {
    console.error("[notify-ticket-email] error:", e);
    // On repond toujours 200 pour ne pas faire echouer le webhook Supabase.
    return new Response(JSON.stringify({ ok: false }));
  }
});
