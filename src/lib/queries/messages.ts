// src/lib/queries/messages.ts
import { supabase } from '../../lib/supabase';

export interface Message {
  id: string;
  consultation_id: string;
  sender_id: string;
  receiver_id: string;
  sender_role: 'doctor' | 'assurer';
  message: string;
  read: boolean;
  created_at: string;
}

// ✅ Récupérer les messages d'une consultation
export async function getMessages(consultationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('consultation_id', consultationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Erreur récupération messages :', error);
    return [];
  }

  return data;
}

// ✅ Marquer tous les messages comme lus pour un receiver
export async function markMessagesAsRead(consultationId: string, receiverId: string) {
  const { error } = await supabase
    .from('messages')
    .update({ read: true })
    .eq('consultation_id', consultationId)
    .eq('receiver_id', receiverId)
    .eq('read', false); // uniquement ceux non lus

  if (error) {
    console.error('Erreur mise à jour read = true :', error);
  }
}

// ✅ Envoyer un message
export async function sendMessage(
  consultationId: string,
  senderId: string,
  receiverId: string,
  senderRole: 'doctor' | 'assurer',
  message: string
) {
  const { error } = await supabase.from('messages').insert({
    consultation_id: consultationId,
    sender_id: senderId,
    receiver_id: receiverId,
    sender_role: senderRole,
    message,
    read: false, // ✅ important
  });

  if (error) {
    console.error('Erreur envoi message :', error);
    throw error;
  }
}
