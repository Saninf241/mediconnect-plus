// src/components/ui/uidoctor/ConsultationChat.tsx
import { useEffect, useState } from "react";
import {
  getMessages,
  sendMessage,
  Message,
} from "../../../lib/queries/messages";
import { supabase } from "../../../lib/supabase";

interface ConsultationChatProps {
  consultationId: string;
  senderId: string;                     // uuid de clinic_staff.id
  senderRole: "doctor" | "insurer";     // ici ce sera "doctor"
  receiverId: string | null;            // uuid de insurer_staff.id (optionnel)
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
  const [consultationStatus, setConsultationStatus] = useState<string | null>(
    null
  );

  const fetchMessages = async () => {
    const data = await getMessages(consultationId);
    setMessages(data);
  };

  const fetchConsultationStatus = async () => {
    const { data, error } = await supabase
      .from("consultations")
      .select("status")
      .eq("id", consultationId)
      .maybeSingle();

    if (!error && data?.status) {
      setConsultationStatus(data.status);
    }
  };

  useEffect(() => {
    fetchMessages();
    fetchConsultationStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultationId]);

  useEffect(() => {
    const channel = supabase
      .channel("messages-doctor")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload) => {
          const row = payload.new as { consultation_id?: string } | null;
          if (row?.consultation_id === consultationId) {
            fetchMessages();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultationId]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    setLoading(true);

    try {
      await sendMessage(
        consultationId,
        senderId,                 // ✅ uuid clinic_staff.id
        receiverId ?? null,       // non utilisé côté DB mais ok
        senderRole,               // "doctor"
        newMessage.trim()
      );
      setNewMessage("");
      await fetchMessages();
    } catch (e) {
      console.error("[DoctorChat] error sendMessage:", e);
      alert("Impossible d'envoyer le message pour le moment.");
    } finally {
      setLoading(false);
    }
  };

  const isDraft = consultationStatus === "draft";

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-white">
      <h2 className="font-semibold text-lg">Discussion liée à cette consultation</h2>

      {isDraft && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-3 rounded">
          💬 La messagerie est désactivée tant que la consultation n’a pas été
          envoyée à l’assureur.
        </div>
      )}

      <div
        className={`h-64 overflow-y-auto border p-2 bg-gray-50 rounded ${
          isDraft ? "opacity-50" : ""
        }`}
      >
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
          placeholder={
            isDraft ? "Fonction désactivée (brouillon)" : "Votre message..."
          }
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

