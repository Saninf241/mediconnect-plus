// src/Pages/patient/Support.tsx
import { useEffect, useState } from "react";
import { supabasePatient, getSupabaseFunctionsUrl } from "../../lib/supabasePatient";
import { usePatientSession } from "../../hooks/usePatientSession";

type Status = "open" | "in_progress" | "resolved";

type Ticket = {
  id: string;
  created_at: string;
  updated_at: string;
  subject: string;
  message: string;
  status: Status;
  priority: string;
};

type TicketMessage = {
  id: string;
  created_at: string;
  author_role: string;
  author_name: string | null;
  body: string;
};

const STATUS_LABEL: Record<Status, string> = {
  open: "Ouvert",
  in_progress: "En cours",
  resolved: "Résolu",
};

const STATUS_COLOR: Record<Status, string> = {
  open: "bg-red-100 text-red-700",
  in_progress: "bg-amber-100 text-amber-700",
  resolved: "bg-green-100 text-green-700",
};

const WHATSAPP_NUMBER = "33782525687";

export default function PatientSupportPage() {
  const { session } = usePatientSession();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [selected, setSelected] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [reply, setReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function call(body: unknown) {
    if (!session) throw new Error("Session expirée, reconnectez-vous.");
    const res = await fetch(getSupabaseFunctionsUrl("patient-support-tickets"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Erreur");
    return json;
  }

  async function loadTickets() {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const data = await call({ action: "list" });
      setTickets(data.tickets ?? []);
    } catch (e: any) {
      setError(e.message || "Impossible de charger vos demandes");
    } finally {
      setLoading(false);
    }
  }

  async function openTicket(ticket: Ticket) {
    setSelected(ticket);
    setMessages([]);
    try {
      const data = await call({ action: "get", ticket_id: ticket.id });
      setMessages(data.messages ?? []);
    } catch (e: any) {
      setError(e.message || "Impossible de charger cette demande");
    }
  }

  async function handleCreate() {
    if (!subject.trim() || !message.trim()) {
      setError("Sujet et message requis.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await call({ action: "create", subject: subject.trim(), message: message.trim() });
      setSubject("");
      setMessage("");
      await loadTickets();
    } catch (e: any) {
      setError(e.message || "Échec de l'envoi");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReply() {
    if (!selected || !reply.trim()) return;
    setSendingReply(true);
    try {
      await call({ action: "reply", ticket_id: selected.id, body: reply.trim() });
      setReply("");
      await openTicket(selected);
      await loadTickets();
    } catch (e: any) {
      setError(e.message || "Échec de l'envoi");
    } finally {
      setSendingReply(false);
    }
  }

  useEffect(() => {
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">Besoin d'aide ?</h1>
        <p className="text-sm text-gray-500">
          Une question sur votre dossier, un problème de connexion ? Écrivez-nous ci-dessous, ou
          contactez-nous directement.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
            "Bonjour, j'ai besoin d'aide avec mon espace santé MediConnect+."
          )}`}
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          WhatsApp
        </a>
        <a
          href="mailto:contact@ndoungconsulting.com"
          className="px-4 py-2 border rounded-lg hover:bg-gray-50"
        >
          contact@ndoungconsulting.com
        </a>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
          {error}
        </div>
      )}

      <div className="bg-white border rounded-xl p-4 shadow space-y-3">
        <h2 className="font-semibold text-gray-800">Envoyer un message</h2>
        <input
          className="border rounded-lg p-3 w-full"
          placeholder="Sujet"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
        <textarea
          className="border rounded-lg p-3 w-full"
          rows={4}
          placeholder="Décrivez votre problème ou votre question…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button
          onClick={handleCreate}
          disabled={submitting}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
        >
          {submitting ? "Envoi…" : "Envoyer"}
        </button>
      </div>

      <div className="grid md:grid-cols-[1fr_1.3fr] gap-4">
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-800">Mes demandes</h3>
          {loading && <p className="text-sm text-gray-500">Chargement…</p>}
          {!loading && tickets.length === 0 && (
            <p className="text-sm text-gray-500">Aucune demande envoyée pour le moment.</p>
          )}
          {tickets.map((t) => (
            <div
              key={t.id}
              onClick={() => openTicket(t)}
              className={`cursor-pointer bg-white border rounded-lg p-3 shadow-sm hover:shadow transition ${
                selected?.id === t.id ? "ring-2 ring-emerald-500" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLOR[t.status]}`}>
                  {STATUS_LABEL[t.status]}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(t.updated_at).toLocaleDateString("fr-FR")}
                </span>
              </div>
              <p className="font-medium text-sm">{t.subject}</p>
            </div>
          ))}
        </div>

        <div>
          {!selected && (
            <div className="bg-white border rounded-lg p-4 text-sm text-gray-500">
              Sélectionnez une demande à gauche pour voir la conversation.
            </div>
          )}
          {selected && (
            <div className="bg-white border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{selected.subject}</h3>
                <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLOR[selected.status]}`}>
                  {STATUS_LABEL[selected.status]}
                </span>
              </div>

              <div className="border rounded p-3 bg-gray-50 max-h-72 overflow-y-auto space-y-3">
                <div className="text-sm">
                  <div className="font-medium">Vous</div>
                  <div className="whitespace-pre-wrap">{selected.message}</div>
                </div>
                {messages.map((m) => (
                  <div key={m.id} className="text-sm border-t pt-2">
                    <div className="font-medium">
                      {m.author_role === "developer" ? "Support MediConnect+" : "Vous"}
                    </div>
                    <div className="whitespace-pre-wrap">{m.body}</div>
                  </div>
                ))}
              </div>

              <textarea
                className="w-full border rounded p-2 text-sm"
                rows={3}
                placeholder="Répondre…"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
              />
              <button
                onClick={handleReply}
                disabled={sendingReply || !reply.trim()}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {sendingReply ? "Envoi…" : "Envoyer"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
