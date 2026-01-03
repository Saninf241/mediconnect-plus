// src/lib/queries/notifications.ts
import { supabase } from "../supabase";

export type UnreadByConsultation = Record<string, number>;

export async function getUnreadMessageCounts(userId: string) {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, metadata, read")
    .eq("user_id", userId)
    .eq("type", "message")
    .eq("read", false);

  if (error) {
    console.error("[notifications] getUnreadMessageCounts error:", error);
    return {} as UnreadByConsultation;
  }

  const counts: UnreadByConsultation = {};
  for (const n of data ?? []) {
    const cid = (n as any).metadata?.consultation_id as string | undefined;
    if (!cid) continue;
    counts[cid] = (counts[cid] || 0) + 1;
  }
  return counts;
}
