// src/lib/api/generateConsultationPdf.ts
import { supabase } from "../supabase";

/**
 * Appelle la Edge Function generate-consultation-pdf
 * et retourne la réponse brute.
 *
 * - consultationId : id de la ligne dans `consultations`
 */
export async function generateConsultationPdf(consultationId: string) {
  try {
    console.log("[generateConsultationPdf] start for", consultationId);

    const { data, error } = await supabase.functions.invoke(
      "generate-consultation-pdf",
      {
        body: { consultation_id: consultationId },
      }
    );

    if (error) {
      console.error("[generateConsultationPdf] edge error", error);
      throw error;
    }

    console.log("[generateConsultationPdf] edge response:", data);
    return data;
  } catch (e) {
    console.error("[generateConsultationPdf] exception:", e);
    throw e;
  }
}
