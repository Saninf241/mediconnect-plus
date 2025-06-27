// src/lib/queries/messages.ts
import { supabase } from '@/lib/supabase';

export interface Message {
  id: string;
  consultation_id: string;
  sender_id: string;
  receiver_id: string;
  sender_role: 'doctor' | 'assurer';
  message: string;
  created_at: string;
}

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
    message
  });

  if (error) {
    console.error('Erreur envoi message :', error);
    throw error;
  }
}
