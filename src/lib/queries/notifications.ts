// src/lib/queries/notifications.ts
import { supabase } from "../supabase";

export type ConsultationNotificationInfo = {
  count: number;
  hasDecision: boolean;
  hasMessage: boolean;
  hasDispute: boolean;
  hasProposal: boolean;
};

export type UnreadByConsultation = Record<string, ConsultationNotificationInfo>;

const DEFAULT_TYPES = ["message"];

// "message" reste retro-compatible avec la messagerie medecin<->assureur
// (event=insurer_decision distingue "decision" de "message"). Les 4 types
// ajoutes 2026-07-27 servent le circuit litige/tarification manuelle :
// payment_dispute (cabinet -> assureur), manual_pricing_proposal
// (agent -> admin assureur), manual_pricing_decision (admin -> agent),
// payment_dispute_resolved (assureur -> cabinet).
export async function getUnreadMessageCounts(
  userId: string,
  types: string[] = DEFAULT_TYPES
): Promise<UnreadByConsultation> {
  const { data, error } = await supabase
    .from("notifications")
    .select("type, metadata")
    .eq("user_id", userId)
    .eq("read", false)
    .in("type", types);

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
        hasDispute: false,
        hasProposal: false,
      };
    }

    counts[consultationId].count += 1;

    if (row.type === "payment_dispute" || row.type === "payment_dispute_resolved") {
      counts[consultationId].hasDispute = true;
    } else if (row.type === "manual_pricing_proposal" || row.type === "manual_pricing_decision") {
      counts[consultationId].hasProposal = true;
    } else if (row?.metadata?.event === "insurer_decision") {
      counts[consultationId].hasDecision = true;
    } else {
      counts[consultationId].hasMessage = true;
    }
  }

  return counts;
}

export async function markConsultationNotificationsAsRead(
  userId: string,
  consultationId: string,
  types: string[] = DEFAULT_TYPES
): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .in("type", types)
    .eq("read", false)
    .contains("metadata", { consultation_id: consultationId });

  if (error) {
    console.error("[notifications] markConsultationNotificationsAsRead error:", error);
  }
}
