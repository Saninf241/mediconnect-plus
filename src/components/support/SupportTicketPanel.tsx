// src/components/support/SupportTicketPanel.tsx
//
// Panneau "Support" partage entre secretaire / admin / medecin (specialiste
// et multi-specialiste) / assureur : creer un ticket vers le developpeur,
// voir ses propres tickets (RLS scope au cabinet ou a l'assureur, voir
// migration 20260712160000_support_tickets.sql) et repondre dans le fil.
// Le developpeur repond depuis /developer/tickets (Edge Function
// dev-support-tickets), pas depuis cet ecran.
import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { toast } from "react-toastify";
import { supabase } from "../../lib/supabase";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

type Role = "doctor" | "secretary" | "admin" | "assureur";
type Status = "open" | "in_progress" | "resolved";

type Ticket = {
  id: string;
  created_at: string;
  updated_at: string;
  subject: string;
  message: string;
  status: Status;
  priority: string;
  callback_phone: string | null;
  created_by_name: string | null;
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

export default function SupportTicketPanel({
  role,
  clinicId,
  insurerId,
}: {
  role: Role;
  clinicId?: string | null;
  insurerId?: string | null;
}) {
  const { user } = useUser();
  const ownerId = clinicId || insurerId || null;

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("normal");
  const [callbackPhone, setCallbackPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [selected, setSelected] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [reply, setReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  async function loadTickets() {
    if (!ownerId) return;
    setLoading(true);
    let query = supabase
      .from("support_tickets")
      .select("id, created_at, updated_at, subject, message, status, priority, callback_phone, created_by_name")
      .order("updated_at", { ascending: false });
    query = clinicId ? query.eq("clinic_id", clinicId) : query.eq("insurer_id", insurerId!);
    const { data, error } = await query;
    if (error) {
      console.error("[SupportTicketPanel] loadTickets error:", error);
      toast.error("Impossible de charger les tickets");
    } else {
      setTickets((data ?? []) as Ticket[]);
    }
    setLoading(false);
  }

  async function openTicket(ticket: Ticket) {
    setSelected(ticket);
    const { data, error } = await supabase
      .from("support_ticket_messages")
      .select("id, created_at, author_role, author_name, body")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("[SupportTicketPanel] openTicket error:", error);
      toast.error("Impossible de charger le fil");
      return;
    }
    setMessages((data ?? []) as TicketMessage[]);
  }

  async function handleCreate() {
    if (!ownerId || !user) return;
    if (!subject.trim() || !message.trim()) {
      toast.error("Sujet et message requis.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("support_tickets").insert({
      created_by_clerk_user_id: user.id,
      created_by_role: role,
      created_by_name: user.fullName || user.firstName || user.primaryEmailAddress?.emailAddress || null,
      created_by_email: user.primaryEmailAddress?.emailAddress ?? null,
      callback_phone: callbackPhone.trim() || null,
      clinic_id: clinicId ?? null,
      insurer_id: insurerId ?? null,
      subject: subject.trim(),
      message: message.trim(),
      priority,
    });
    setSubmitting(false);
    if (error) {
      console.error("[SupportTicketPanel] create error:", error);
      toast.error("Échec de l'envoi du ticket");
      return;
    }
    toast.success("Ticket envoyé au support");
    setSubject("");
    setMessage("");
    setCallbackPhone("");
    setPriority("normal");
    loadTickets();
  }

  async function handleReply() {
    if (!selected || !user || !reply.trim()) return;
    setSendingReply(true);
    const { error } = await supabase.from("support_ticket_messages").insert({
      ticket_id: selected.id,
      author_clerk_user_id: user.id,
      author_role: role,
      author_name: user.fullName || user.firstName || user.primaryEmailAddress?.emailAddress || null,
      body: reply.trim(),
    });
    setSendingReply(false);
    if (error) {
      console.error("[SupportTicketPanel] reply error:", error);
      toast.error("Échec de l'envoi");
      return;
    }
    setReply("");
    openTicket(selected);
    loadTickets();
  }

  useEffect(() => {
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId, insurerId]);

  if (!ownerId) {
    return <Card className="text-sm text-gray-500">Chargement du contexte…</Card>;
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-3">
        <h2 className="font-semibold text-lg">Contacter le support</h2>
        <Input
          placeholder="Sujet"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
        <textarea
          className="w-full border rounded p-2 text-sm"
          rows={4}
          placeholder="Décris le blocage, la question ou la suggestion…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <div className="grid sm:grid-cols-2 gap-3">
          <select
            className="border rounded p-2 text-sm"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="low">Priorité basse</option>
            <option value="normal">Priorité normale</option>
            <option value="high">Priorité haute</option>
            <option value="urgent">Urgent (blocage)</option>
          </select>
          <Input
            placeholder="Téléphone de rappel (optionnel)"
            value={callbackPhone}
            onChange={(e) => setCallbackPhone(e.target.value)}
          />
        </div>
        <Button onClick={handleCreate} disabled={submitting}>
          {submitting ? "Envoi…" : "Envoyer au support"}
        </Button>
      </Card>

      <div className="grid md:grid-cols-[1fr_1.3fr] gap-4">
        <div className="space-y-2">
          <h3 className="font-semibold">Mes tickets</h3>
          {loading && <p className="text-sm text-gray-500">Chargement…</p>}
          {!loading && tickets.length === 0 && (
            <p className="text-sm text-gray-500">Aucun ticket pour l'instant.</p>
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
              <h4 className="font-medium">{t.subject}</h4>
            </Card>
          ))}
        </div>

        <div>
          {!selected && <Card className="text-sm text-gray-500">Sélectionne un ticket à gauche.</Card>}
          {selected && (
            <Card className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{selected.subject}</h3>
                <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLOR[selected.status]}`}>
                  {STATUS_LABEL[selected.status]}
                </span>
              </div>

              <div className="border rounded p-3 bg-gray-50 max-h-72 overflow-y-auto space-y-3">
                <div className="text-sm">
                  <div className="font-medium">{selected.created_by_name}</div>
                  <div className="whitespace-pre-wrap">{selected.message}</div>
                </div>
                {messages.map((m) => (
                  <div key={m.id} className="text-sm border-t pt-2">
                    <div className="font-medium">
                      {m.author_role === "developer" ? "Support MediConnect+" : m.author_name}
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
              <Button onClick={handleReply} disabled={sendingReply || !reply.trim()}>
                Envoyer
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
