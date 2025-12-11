// src/components/ui/assureur/ConsultationChat.tsx
import { useEffect, useState } from "react";
import {
  getMessages,
  sendMessage,
  Message,
} from "../../../lib/queries/messages";
import { supabase } from "../../../lib/supabase";

interface Props {
  consultationId: string;
  doctorStaffId: string | null;   // clinic_staff.id du médecin
  insurerAgentId: string;         // insurer_staff.id de l'agent connecté
}

export default function ConsultationChatAssureur({
  consultationId,
  doctorStaffId,
  insurerAgentId,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchMessages = async () => {
    const data = await getMessages(consultationId);
    setMessages(data);
  };

  useEffect(() => {
    fetchMessages();
  }, [consultationId]);

  // abonnement realtime
  useEffect(() => {
    const channel = supabase
      .channel("messages-assureur")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload) => {
          if (
            (payload.new as { consultation_id?: string })?.consultation_id ===
            consultationId
          ) {
            fetchMessages();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [consultationId]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    if (!doctorStaffId) {
      alert(
        "Impossible d’envoyer un message : médecin introuvable pour cette consultation."
      );
      return;
    }

    setLoading(true);
    try {
      // ⚠️ ICI : sender_id = insurerAgentId (insurer_staff.id UUID)
      await sendMessage(
        consultationId,
        insurerAgentId,
        doctorStaffId,
        "insurer",
        newMessage.trim()
      );
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
      <h2 className="font-semibold text-lg">Messagerie avec le médecin</h2>

      <div className="h-64 overflow-y-auto border p-2 bg-gray-50 rounded">
        {messages.length > 0 ? (
          messages.map((m) => (
            <div
              key={m.id}
              className={`mb-2 ${
                m.sender_role === "insurer" ? "text-right" : "text-left"
              }`}
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
        ) : (
          <p className="text-center text-gray-400">
            Aucun message pour cette consultation.
          </p>
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
