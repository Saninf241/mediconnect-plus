// src/components/ui/assureur/ConsultationChat.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import { getMessages, sendMessage, Message } from "../../../lib/queries/messages";
import { supabase } from "../../../lib/supabase";

interface Props {
  consultationId: string;
  doctorStaffId: string | null;
  insurerAgentId: string | null;
}

export default function ConsultationChatAssureur({
  consultationId,
  doctorStaffId,
  insurerAgentId,
}: Props) {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchMessages = useCallback(async () => {
    const data = await getMessages(consultationId);
    setMessages(data);
  }, [consultationId]);

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel(`messages:consultation:${consultationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `consultation_id=eq.${consultationId}`,
        },
        (payload) => {
          const row = payload.new as Message;

          // ✅ append local (pas de reload / pas de refetch)
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, row];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [consultationId]);

  const handleSend = async () => {
    if (!insurerAgentId) {
      alert("Impossible d'envoyer : insurer_staff.id introuvable.");
      return;
    }
    if (!doctorStaffId) {
      alert("Impossible d'envoyer : doctorStaffId introuvable.");
      return;
    }
    if (!newMessage.trim()) return;

    setLoading(true);
    try {
      await sendMessage(consultationId, insurerAgentId, "insurer", newMessage, doctorStaffId);
      setNewMessage("");
      await fetchMessages();
    } catch (e) {
      console.error("[AssureurChat] erreur sendMessage :", e);
      alert("Impossible d'envoyer le message pour le moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-white">
      <h2 className="font-semibold text-lg">Discussion avec le médecin</h2>

      <div className="h-64 overflow-y-auto border p-2 bg-gray-50 rounded">
        {messages.length === 0 ? (
          <p className="text-center text-gray-400">Aucun message pour cette consultation.</p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`mb-2 ${m.sender_role === "insurer" ? "text-right" : "text-left"}`}
            >
              <div
                className={`inline-block px-4 py-2 rounded-lg text-sm ${
                  m.sender_role === "insurer"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-200 text-gray-900"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1 border p-2 rounded"
          placeholder="Votre message..."
        />
        <button
          onClick={handleSend}
          disabled={loading || !newMessage.trim()}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          Envoyer
        </button>
      </div>
    </div>
  );
}
