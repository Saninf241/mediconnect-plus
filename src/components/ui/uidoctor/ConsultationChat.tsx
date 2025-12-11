// src/components/ui/uidoctor/ConsultationChat.tsx
import { useEffect, useState } from "react";
import { getMessages, sendMessage, Message } from "../../../lib/queries/messages";
import { supabase } from "../../../lib/supabase";

interface ConsultationChatProps {
  consultationId: string;
  senderId: string;                    // clinic_staff.id
  senderRole: "doctor" | "insurer";    // ici : "doctor"
  receiverId: string | null;           // insurer_staff.id (optionnel)
}

export default function ConsultationChatDoctor({
  consultationId,
  senderId,
  senderRole,
}: ConsultationChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchMessages = async () => {
    const data = await getMessages(consultationId);
    setMessages(data);
  };

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel("messages-doctor")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload) => {
          const newRow = payload.new as { consultation_id?: string };
          if (newRow.consultation_id === consultationId) {
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
    if (!senderId) {
      alert(
        "Impossible d'envoyer un message : aucun identifiant interne de médecin (clinic_staff.id) n’est associé à cette consultation."
      );
      return;
    }
    if (!newMessage.trim()) return;

    setLoading(true);
    try {
      await sendMessage(consultationId, senderId, senderRole, newMessage);
      setNewMessage("");
      await fetchMessages();
    } catch (e) {
      console.error("[DoctorChat] erreur sendMessage :", e);
      alert("Impossible d'envoyer le message pour le moment.");
    } finally {
      setLoading(false);
    }
  };

  const isDraft = false; // tu peux rebrancher ton contrôle sur status si tu veux

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-white">
      <h2 className="font-semibold text-lg">Discussion liée à cette consultation</h2>

      <div className={`h-64 overflow-y-auto border p-2 bg-gray-50 rounded`}>
        {messages.length > 0 ? (
          messages.map((m) => (
            <div
              key={m.id}
              className={`mb-2 ${
                m.sender_role === senderRole ? "text-right" : "text-left"
              }`}
            >
              <div
                className={`inline-block px-4 py-2 rounded-lg text-sm ${
                  m.sender_role === senderRole
                    ? "bg-blue-500 text-white"
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
          disabled={isDraft}
        />
        <button
          onClick={handleSend}
          disabled={loading || !newMessage.trim() || isDraft}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Envoyer
        </button>
      </div>
    </div>
  );
}
