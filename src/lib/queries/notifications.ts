import { supabase } from "../supabase";

export type UnreadByConsultation = Record<string, number>;

export async function getUnreadMessageCounts(userId: string): Promise<UnreadByConsultation> {
  const { data, error } = await supabase
    .from("notifications_unread_messages_by_consultation")
    .select("consultation_id, unread_count")
    .eq("user_id", userId);

  if (error) {
    console.error("[notifications] getUnreadMessageCounts error:", error);
    return {};
  }

  const counts: UnreadByConsultation = {};
  for (const row of data ?? []) {
    counts[row.consultation_id] = row.unread_count;
  }
  return counts;
}

export async function markConsultationNotificationsAsRead(
  userId: string,
  consultationId: string
): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("type", "message")
    .eq("read", false)
    .contains("metadata", { consultation_id: consultationId });

  if (error) {
    console.error("[notifications] markConsultationNotificationsAsRead error:", error);
  }
}