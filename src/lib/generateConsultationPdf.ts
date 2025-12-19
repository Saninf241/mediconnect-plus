import { supabase, getSupabaseAnonKey } from "./supabase";

export async function generateConsultationPdf(consultationId: string) {
  const { data, error } = await supabase.functions.invoke(
    "generate-consultation-pdf",
    {
      body: { consultationId },
      headers: {
        apikey: getSupabaseAnonKey(),
      },
    }
  );

  if (error) throw error;
  return data as { pdfUrl?: string };
}
