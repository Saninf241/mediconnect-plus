// src/lib/queries/messages.ts
import { supabase } from "../supabase";

export interface Message {
  id: string;
  consultation_id: string;
  sender_role: "doctor" | "insurer";
  sender_id: string;
  content: string;
  created_at: string;
  read: boolean;
}

export async function getMessages(
  consultationId: string
): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select(
      "id, consultation_id, sender_role, sender_id, content, created_at, read"
    )
    .eq("consultation_id", consultationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[messages] error getMessages:", error);
    return [];
  }

  return (data || []) as Message[];
}

export async function sendMessage(
  consultationId: string,
  senderId: string,
  senderRole: "doctor" | "insurer",
  content: string
): Promise<void> {
  const { error } = await supabase.from("messages").insert({
    consultation_id: consultationId,
    sender_id: senderId,
    sender_role: senderRole,
    content,      // ✅ colonne correcte
    read: false,
  });

  if (error) {
    console.error("[messages] error sendMessage:", error);
    throw error;
  }
}

