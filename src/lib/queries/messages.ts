// src/lib/queries/messages.ts
import { supabase } from "../supabase";

export type Message = {
  id: string;
  consultation_id: string;
  sender_id: string;
  receiver_id: string;
  sender_role: "doctor" | "assurer";
  message: string;
  created_at: string;
};

/**
 * Récupère tous les messages liés à une consultation,
 * triés du plus ancien au plus récent.
 */
export async function getMessages(
  consultationId: string
): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("consultation_id", consultationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[messages] error getMessages:", error);
    return [];
  }

  return (data as Message[]) ?? [];
}

/**
 * Envoie un message entre médecin et assureur.
 */
export async function sendMessage(
  consultationId: string,
  senderId: string,
  receiverId: string,
  senderRole: "doctor" | "assurer",
  content: string
) {
  const { error } = await supabase.from("messages").insert([
    {
      consultation_id: consultationId,
      sender_id: senderId,
      receiver_id: receiverId,
      sender_role: senderRole,
      message: content,
    },
  ]);

  if (error) {
    console.error("[messages] error sendMessage:", error);
    throw error;
  }
}

