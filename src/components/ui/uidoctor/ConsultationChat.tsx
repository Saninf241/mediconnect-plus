// src/components/ui/uidoctor/ConsultationChat.tsx
import { useEffect, useState, useCallback } from "react";
import { getMessages, sendMessage, Message } from "../../../lib/queries/messages";
import { markConsultationNotificationsAsRead } from "../../../lib/queries/notifications";
import { supabase } from "../../../lib/supabase";

interface ConsultationChatProps {
  consultationId: string;
  senderId: string;                 // clinic_staff.id du médecin connecté
  senderRole: "doctor" | "insurer"; // ici : "doctor"
  receiverId: string | null;        // insurer_staff.id
}

export default function ConsultationChatDoctor({
  consultationId,
  senderId,
  senderRole,
  receiverId,
}: ConsultationChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchMessages = useCallback(async () => {
    const data = await getMessages(consultationId);
    setMessages(data);
  }, [consultationId]);

  const markAsRead = useCallback(async () => {
    if (!senderId) return;
    await markConsultationNotificationsAsRead(senderId, consultationId);
  }, [senderId, consultationId]);

  useEffect(() => {
    fetchMessages();
    markAsRead();

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
        async (payload) => {
          const row = payload.new as Message;

          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, row];
          });

          if (row.sender_role !== senderRole) {
            await markAsRead();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [consultationId, fetchMessages, markAsRead, senderRole]);

  const handleSend = async () => {
    if (!senderId) {
      alert("Impossible d'envoyer : clinic_staff.id introuvable.");
      return;
    }
    if (!receiverId) {
      alert("Impossible d'envoyer : insurer_staff.id introuvable.");
      return;
    }

    const trimmed = newMessage.trim();
    if (!trimmed) return;

    setLoading(true);
    try {
      const createdMessage = await sendMessage(
        consultationId,
        senderId,
        senderRole,
        trimmed,
        receiverId
      );

      if (createdMessage) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === createdMessage.id)) return prev;
          return [...prev, createdMessage];
        });
      }

      setNewMessage("");
    } catch (e) {
      console.error("[DoctorChat] erreur sendMessage :", e);
      alert("Impossible d'envoyer le message pour le moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-white">
      <h2 className="font-semibold text-lg">Discussion liée à cette consultation</h2>

      <div className="h-64 overflow-y-auto border p-2 bg-gray-50 rounded">
        {messages.length > 0 ? (
          messages.map((m) => (
            <div
              key={m.id}
              className={`mb-2 ${m.sender_role === senderRole ? "text-right" : "text-left"}`}
            >
              <div
                className={`inline-block px-4 py-2 rounded-lg text-sm ${
                  m.sender_role === senderRole
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-900"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-400">Aucun message pour cette consultation.</p>
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
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Envoyer
        </button>
      </div>
    </div>
  );
}