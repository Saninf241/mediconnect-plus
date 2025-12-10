// src/lib/queries/messages.ts
import { supabase } from "../supabase";

export type Message = {
  id: string;
  consultation_id: string;
  sender_role: "doctor" | "insurer";
  sender_id: string;
  content: string;
  created_at: string;
  read: boolean | null;
};

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

  return (data ?? []) as Message[];
}

export async function sendMessage(
  consultationId: string,
  senderId: string,                 // ⚠️ doit être UN UUID DE staff (clinic_staff.id ou insurer_staff.id)
  senderRole: "doctor" | "insurer",
  content: string
): Promise<void> {
  const payload = {
    consultation_id: consultationId,
    sender_id: senderId,
    sender_role: senderRole,
    content,
  };

  const { error } = await supabase.from("messages").insert(payload);

  if (error) {
    console.error("[messages] error sendMessage:", error);
    throw error;
  }
}

