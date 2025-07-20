import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";

interface SupportMessage {
  id: string;
  subject: string;
  message: string;
  sender_role: string;
  sender_name?: string;
  created_at: string;
  status: "open" | "resolved" | "archived";
  clinic_id: string;
  target: string;
}

export default function SupportInboxPage() {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"all" | "open" | "resolved" | "archived">("all");
  const [search, setSearch] = useState("");
  const [replyText, setReplyText] = useState<{ [id: string]: string }>({});

  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("support_messages")
        .select("*")
        .eq("target", "support")
        .order("created_at", { ascending: false });

      if (!error && data) setMessages(data as SupportMessage[]);
      setLoading(false);
    };

    fetchMessages();
  }, []);

  const filteredMessages = messages.filter((msg) => {
    const matchesStatus = filterStatus === "all" || msg.status === filterStatus;
    const matchesSearch = msg.subject.toLowerCase().includes(search.toLowerCase()) ||
      msg.sender_name?.toLowerCase().includes(search.toLowerCase()) ||
      msg.message.toLowerCase().includes(search.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const handleReply = async (id: string) => {
    const content = replyText[id];
    if (!content) return;

    await supabase.from("support_responses").insert({
      message_id: id,
      response: content,
      responder: "support",
    });

    setReplyText((prev) => ({ ...prev, [id]: "" }));
    alert("Réponse envoyée !");
  };

  const archiveMessage = async (id: string) => {
    await supabase.from("support_messages").update({ status: "archived" }).eq("id", id);
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: "archived" } : m))
    );
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">📨 Inbox Support Global - Mediconnect+</h1>

      <div className="flex gap-4 mb-4">
        <Input
          placeholder="🔍 Rechercher par sujet ou expéditeur"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-1/2"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="border px-2 py-1 rounded"
        >
          <option value="all">Tous les statuts</option>
          <option value="open">Ouvert</option>
          <option value="resolved">Traité</option>
          <option value="archived">Archivé</option>
        </select>
      </div>

      {loading ? (
        <p>Chargement...</p>
      ) : filteredMessages.length === 0 ? (
        <p className="text-gray-500">Aucun message trouvé.</p>
      ) : (
        <div className="space-y-4">
          {filteredMessages.map((msg) => (
            <Card key={msg.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>📅 {new Date(msg.created_at).toLocaleString()}</span>
                  <span className="capitalize">
                    Statut :{" "}
                    <span
                      className={`px-2 py-1 rounded ${
                        msg.status === "open"
                          ? "bg-yellow-100 text-yellow-700"
                          : msg.status === "resolved"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {msg.status}
                    </span>
                  </span>
                </div>

                <div>
                  <p className="font-semibold">{msg.subject}</p>
                  <p className="text-sm text-gray-700">{msg.message}</p>
                  <p className="text-xs text-gray-400">
                    ✉️ {msg.sender_name || "Inconnu"} ({msg.sender_role}) — Clinique ID: {msg.clinic_id}
                  </p>
                </div>

                {msg.status !== "archived" && (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Répondre..."
                      value={replyText[msg.id] || ""}
                      onChange={(e) =>
                        setReplyText((prev) => ({ ...prev, [msg.id]: e.target.value }))
                      }
                    />
                    <div className="flex gap-2">
                      <Button onClick={() => handleReply(msg.id)}>Envoyer</Button>
                      <Button onClick={() => archiveMessage(msg.id)}>
                        Archiver
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
