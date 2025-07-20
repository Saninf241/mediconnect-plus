import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { useClinicId } from "../../../hooks/useClinicId";

interface SupportMessage {
  id: string;
  subject: string;
  message: string;
  sender_role: string;
  sender_name?: string;
  created_at: string;
  status: "open" | "resolved";
  target: "admin" | "support";
  clinic_id: string;
}

export default function SupportInboxPage() {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "resolved">("all");
  const [roleFilter, setRoleFilter] = useState<"all" | "doctor" | "secretaire">("all");
  const [recentOnly, setRecentOnly] = useState(false);
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const clinicId = useClinicId();

  useEffect(() => {
    const fetchMessages = async () => {
      if (!clinicId) return;
      setLoading(true);

      let query = supabase
        .from("support_messages")
        .select("*")
        .eq("clinic_id", clinicId)
        .eq("target", "admin")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (roleFilter !== "all") query = query.eq("sender_role", roleFilter);
      if (recentOnly) {
        const since = new Date();
        since.setDate(since.getDate() - 7);
        query = query.gte("created_at", since.toISOString());
      }

      const { data, error } = await query;
      if (!error && data) setMessages(data as SupportMessage[]);
      setLoading(false);
    };

    fetchMessages();
  }, [clinicId, statusFilter, roleFilter, recentOnly]);

  const markAsResolved = async (id: string) => {
    await supabase.from("support_messages").update({ status: "resolved" }).eq("id", id);
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, status: "resolved" } : msg))
    );
  };

  const sendReply = async (msg: SupportMessage) => {
    if (!replyText[msg.id]) return;

    await supabase.from("support_replies").insert({
      message_id: msg.id,
      reply: replyText[msg.id],
      responder_role: "admin",
      responder_name: "Administrateur",
      clinic_id: clinicId,
    });

    setReplyText((prev) => ({ ...prev, [msg.id]: "" }));
    alert("Réponse envoyée.");
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-semibold">📬 Boîte de réception – Support interne</h2>

      <div className="flex gap-4">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="border p-1 rounded">
          <option value="all">Tous les statuts</option>
          <option value="open">Ouverts</option>
          <option value="resolved">Traités</option>
        </select>

        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as any)} className="border p-1 rounded">
          <option value="all">Tous les rôles</option>
          <option value="doctor">Médecins</option>
          <option value="secretaire">Secrétaires</option>
        </select>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={recentOnly} onChange={() => setRecentOnly(!recentOnly)} />
          7 derniers jours
        </label>
      </div>

      {loading ? (
        <p>Chargement…</p>
      ) : messages.length === 0 ? (
        <p className="text-gray-500">Aucun message à afficher.</p>
      ) : (
        messages.map((msg) => (
          <Card key={msg.id}>
            <CardContent className="space-y-2 p-4">
              <div className="flex justify-between text-sm text-gray-500">
                <span>{new Date(msg.created_at).toLocaleString()}</span>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    msg.status === "resolved"
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {msg.status === "resolved" ? "Traité" : "Ouvert"}
                </span>
              </div>

              <h3 className="font-semibold">{msg.subject}</h3>
              <p>{msg.message}</p>
              <p className="text-xs text-gray-400">
                Envoyé par {msg.sender_name || "Utilisateur inconnu"} ({msg.sender_role})
              </p>

              {msg.status === "open" && (
                <div className="space-y-2 mt-2">
                  <Textarea
                    placeholder="Répondre à ce message..."
                    value={replyText[msg.id] || ""}
                    onChange={(e) =>
                      setReplyText((prev) => ({ ...prev, [msg.id]: e.target.value }))
                    }
                  />
                  <div className="flex gap-2">
                    <Button onClick={() => sendReply(msg)}>
                      Envoyer la réponse
                    </Button>
                    <Button onClick={() => markAsResolved(msg.id)}>
                      Marquer comme traité
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
