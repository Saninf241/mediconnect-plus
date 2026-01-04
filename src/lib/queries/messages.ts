// src/lib/queries/messages.ts
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

/**
 * Insère un message + crée une notification "message" pour le receiver (si fourni).
 * senderId / receiverId = UUID internes (clinic_staff.id / insurer_staff.id)
 */
export async function sendMessage(
  consultationId: string,
  senderId: string,
  senderRole: "doctor" | "insurer",
  content: string,
  receiverId?: string | null
): Promise<Message | null> {
  const trimmed = content.trim();
  if (!trimmed) return null;

  // 1) insert message
  const { data: msg, error: msgErr } = await supabase
    .from("messages")
    .insert({
      consultation_id: consultationId,
      sender_id: senderId,
      sender_role: senderRole,
      content: trimmed,
    })
    .select("*")
    .maybeSingle();

  if (msgErr) {
    console.error("[messages] error sendMessage:", msgErr);
    throw msgErr;
  }

  // 2) create notification for receiver
  if (receiverId) {
    const title =
      senderRole === "doctor"
        ? "Nouveau message du médecin"
        : "Nouveau message de l’assureur";

    const { error: notifErr } = await supabase.from("notifications").insert({
      user_id: receiverId, // ✅ UUID interne ONLY
      type: "message",
      title,
      content: trimmed.slice(0, 160),
      metadata: {
        consultation_id: consultationId,
        sender_role: senderRole,
      },
      read: false,
    });

    if (notifErr) {
      // on ne bloque pas l’envoi du message si notif KO
      console.error("[messages] notification insert error:", notifErr);
    }
  }

  return msg as Message | null;
}
