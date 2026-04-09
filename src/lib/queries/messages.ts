import { supabase } from "../supabase";

export type Message = {
  id: string;
  consultation_id: string;
  sender_id: string;
  sender_role: "doctor" | "insurer";
  content: string;
  created_at: string;
  read: boolean | null;
};

export async function getMessages(consultationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("consultation_id", consultationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[messages] error getMessages:", error);
    return [];
  }

  return (data ?? []) as Message[];
}

export async function sendMessage(
  consultationId: string,
  senderId: string,
  senderRole: "doctor" | "insurer",
  content: string,
  receiverId?: string | null
): Promise<Message | null> {
  const trimmed = content.trim();
  if (!trimmed) return null;

  const { data: msg, error: msgErr } = await supabase
    .from("messages")
    .insert({
      consultation_id: consultationId,
      sender_id: senderId,
      sender_role: senderRole,
      content: trimmed,
      read: false,
    })
    .select("*")
    .single();

  if (msgErr) {
    console.error("[messages] error sendMessage:", msgErr);
    throw msgErr;
  }

  if (receiverId) {
    const title =
      senderRole === "doctor"
        ? "Nouveau message du médecin"
        : "Nouveau message de l’assureur";

    const { error: notifErr } = await supabase
      .from("notifications")
      .insert({
        user_id: receiverId,
        type: "message",
        title,
        content: trimmed.slice(0, 160),
        metadata: {
          consultation_id: consultationId,
          message_id: msg.id,
          sender_id: senderId,
          sender_role: senderRole,
        },
        read: false,
      });

    if (notifErr) {
      console.error("[messages] notification insert error:", notifErr);
    }
  }

  return msg as Message;
}