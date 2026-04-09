import { supabase } from "../supabase";

export type UnreadByConsultation = Record<string, number>;

export async function getUnreadMessageCounts(
  userId: string
): Promise<UnreadByConsultation> {
  const { data, error } = await supabase
    .from("notifications")
    .select("type, metadata")
    .eq("user_id", userId)
    .eq("read", false)
    .eq("type", "message");

  if (error) {
    console.error("[notifications] getUnreadMessageCounts error:", error);
    return {};
  }

  const counts: UnreadByConsultation = {};

  for (const row of data ?? []) {
    const consultationId = row?.metadata?.consultation_id;
    if (!consultationId || typeof consultationId !== "string") continue;
    counts[consultationId] = (counts[consultationId] || 0) + 1;
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
