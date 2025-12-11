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
 * Insère un message.
 * ⚠️ senderId DOIT être un uuid interne (clinic_staff.id ou insurer_staff.id),
 * pas un user_… de Clerk.
 */
export async function sendMessage(
  consultationId: string,
  senderId: string,
  senderRole: "doctor" | "insurer",
  content: string
): Promise<Message | null> {
  const trimmed = content.trim();
  if (!trimmed) return null;

  const { data, error } = await supabase
    .from("messages")
    .insert({
      consultation_id: consultationId,
      sender_id: senderId,
      sender_role: senderRole,
      content: trimmed,
    })
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[messages] error sendMessage:", error);
    throw error;
  }

  return data as Message | null;
}

