// src/lib/queries/messages.ts
import { supabase } from "../supabase";

export type MessageRole = "doctor" | "insurer";

export interface Message {
  id: string;
  consultation_id: string;
  sender_id: string;
  sender_role: MessageRole | string; // on reste souple au cas où
  content: string;
  created_at: string;
  read: boolean | null;
}

/**
 * Récupérer tous les messages d'une consultation.
 * RLS se charge de filtrer selon le rôle (docteur / assureur).
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

  return (data ?? []) as Message[];
}

/**
 * Envoyer un message.
 *
 * ⚠️ Très important :
 * - `senderId` est le **UUID interne** (clinic_staff.id ou insurer_staff.id)
 *   et PAS l'id Clerk ("user_...").
 * - `senderRole` = "doctor" ou "insurer"
 * - `receiverId` n'est plus utilisé, on le garde juste pour compatibilité.
 */
export async function sendMessage(
  consultationId: string,
  senderId: string,
  _receiverId: string | null, // gardé pour compatibilité, non utilisé
  senderRole: MessageRole,
  content: string
): Promise<Message | null> {
  if (!consultationId || !senderId || !content.trim()) {
    console.warn("[messages] sendMessage called with missing params", {
      consultationId,
      senderId,
      content,
    });
    return null;
  }

  const payload = {
    consultation_id: consultationId,
    sender_id: senderId,          // ✅ UUID interne (clinic_staff / insurer_staff)
    sender_role: senderRole,      // "doctor" ou "insurer"
    content: content.trim(),
    read: false,
  };

  const { data, error } = await supabase
    .from("messages")
    .insert(payload)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[messages] error sendMessage:", error);
    throw error;
  }

  return data as Message;
}

