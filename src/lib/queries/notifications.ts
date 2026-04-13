// src/lib/queries/notifications.ts
import { supabase } from "../supabase";

export type ConsultationNotificationInfo = {
  count: number;
  hasDecision: boolean;
  hasMessage: boolean;
};

export type UnreadByConsultation = Record<string, ConsultationNotificationInfo>;

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

    if (!counts[consultationId]) {
      counts[consultationId] = {
        count: 0,
        hasDecision: false,
        hasMessage: false,
      };
    }

    counts[consultationId].count += 1;

    const event = row?.metadata?.event;

    if (event === "insurer_decision") {
      counts[consultationId].hasDecision = true;
    } else {
      counts[consultationId].hasMessage = true;
    }
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