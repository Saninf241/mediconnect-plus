// src/lib/api/generateConsultationPdf.ts
import { supabase } from "../supabase";

/**
 * Appelle l’Edge Function generate-consultation-pdf
 * et retourne l’URL publique générée.
 */
export async function generateConsultationPdf(consultationId: string) {
  const { data, error } = await supabase.functions.invoke(
    "generate-consultation-pdf",
    {
      body: { consultationId },
    }
  );

  if (error) {
    console.error("[generateConsultationPdf] error", error);
    throw error;
  }

  // data = { ok: true, pdf_url: "https://..." }
  return data;
}

