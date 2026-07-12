// src/Pages/developer/TicketsPage.tsx
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "react-toastify";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";

const FUNCTIONS_BASE =
  (import.meta.env.VITE_SUPABASE_URL as string).replace(/\/+$/, "") +
  "/functions/v1";

type Status = "open" | "in_progress" | "resolved";

type Ticket = {
  id: string;
  created_at: string;
  updated_at: string;
  created_by_role: string;
  created_by_name: string | null;
  created_by_email: string | null;
  callback_phone: string | null;
  subject: string;
  message: string;
  status: Status;
  priority: string;
  clinics: { name: string } | null;
  insurers: { name: string } | null;
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

export default function TicketsPage() {
  const { getToken } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<Status | "all">("open");

  const [selected, setSelected] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  async function call(body: unknown) {
    const token = await getToken();
    const res = await fetch(`${FUNCTIONS_BASE}/dev-support-tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Erreur");
    return data;
  }

  async function loadTickets() {
    setLoading(true);
    try {
      const data = await call({
        action: "list",
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
      });
      setTickets(data.tickets ?? []);
    } catch (err: any) {
      toast.error(err.message || "Impossible de charger les tickets");
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
    } catch (err: any) {
      toast.error(err.message || "Impossible de charger le ticket");
    }
  }

  async function sendReply(markStatus?: Status) {
    if (!selected) return;
    if (!reply.trim() && !markStatus) return;
    setSending(true);
    try {
      await call({
        action: "reply",
        ticket_id: selected.id,
        body: reply.trim() || `(statut changé en ${markStatus ? STATUS_LABEL[markStatus] : ""})`,
        ...(markStatus ? { mark_status: markStatus } : {}),
      });
      setReply("");
      await openTicket(selected);
      await loadTickets();
      toast.success("Réponse envoyée");
    } catch (err: any) {
      toast.error(err.message || "Échec de l'envoi");
    } finally {
      setSending(false);
    }
  }

  async function updateStatus(status: Status) {
    if (!selected) return;
    try {
      await call({ action: "update_status", ticket_id: selected.id, status });
      setSelected({ ...selected, status });
      await loadTickets();
    } catch (err: any) {
      toast.error(err.message || "Échec de la mise à jour");
    }
  }

  useEffect(() => {
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tickets support</h1>
        <p className="text-gray-600">
          Demandes des cabinets et assureurs (blocages, questions, suggestions).
        </p>
      </div>

      <div className="flex gap-2">
        {(["open", "in_progress", "resolved", "all"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded text-sm border ${
              statusFilter === s ? "bg-slate-800 text-white" : "bg-white text-gray-700"
            }`}
          >
            {s === "all" ? "Tous" : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-[1fr_1.3fr] gap-4">
        <div className="space-y-2">
          {loading && <p className="text-sm text-gray-500">Chargement…</p>}
          {!loading && tickets.length === 0 && (
            <p className="text-sm text-gray-500">Aucun ticket.</p>
          )}
          {tickets.map((t) => (
            <Card
              key={t.id}
              onClick={() => openTicket(t)}
              className={`cursor-pointer hover:shadow-md transition ${
                selected?.id === t.id ? "ring-2 ring-indigo-500" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLOR[t.status]}`}>
                  {STATUS_LABEL[t.status]}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(t.updated_at).toLocaleString("fr-FR")}
                </span>
              </div>
              <h3 className="font-semibold">{t.subject}</h3>
              <p className="text-sm text-gray-500">
                {t.clinics?.name || t.insurers?.name || "—"} · {t.created_by_role} ·{" "}
                {t.created_by_name}
              </p>
            </Card>
          ))}
        </div>

        <div>
          {!selected && (
            <Card className="text-sm text-gray-500">Sélectionne un ticket à gauche.</Card>
          )}
          {selected && (
            <Card className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-lg">{selected.subject}</h2>
                  <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLOR[selected.status]}`}>
                    {STATUS_LABEL[selected.status]}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  {selected.clinics?.name || selected.insurers?.name || "—"} ·{" "}
                  {selected.created_by_role} · {selected.created_by_name} (
                  {selected.created_by_email})
                </p>
                {selected.callback_phone && (
                  <p className="text-sm font-medium mt-1">
                    📞 Rappel :{" "}
                    <a href={`tel:${selected.callback_phone}`} className="text-indigo-600 underline">
                      {selected.callback_phone}
                    </a>
                  </p>
                )}
              </div>

              <div className="border rounded p-3 bg-gray-50 max-h-80 overflow-y-auto space-y-3">
                <div className="text-sm">
                  <div className="font-medium">{selected.created_by_name} · {selected.created_by_role}</div>
                  <div className="whitespace-pre-wrap">{selected.message}</div>
                </div>
                {messages.map((m) => (
                  <div key={m.id} className="text-sm border-t pt-2">
                    <div className="font-medium">
                      {m.author_name} · {m.author_role === "developer" ? "Toi (dev)" : m.author_role}
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

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => sendReply()} disabled={sending || !reply.trim()}>
                  Envoyer
                </Button>
                <Button onClick={() => sendReply("in_progress")} disabled={sending}>
                  Répondre + marquer en cours
                </Button>
                <Button onClick={() => sendReply("resolved")} disabled={sending}>
                  Répondre + résoudre
                </Button>
                {selected.status !== "open" && (
                  <button
                    onClick={() => updateStatus("open")}
                    className="text-sm text-gray-600 underline"
                  >
                    Rouvrir
                  </button>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
