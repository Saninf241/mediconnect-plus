// src/lib/api/generateConsultationPdf.ts
export async function generateConsultationPdf(consultationId: string) {
  const res = await fetch(
    "https://zwxegqevthzfphdqtjew.supabase.co/functions/v1/generate-consultation-pdf",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consultationId }),
    }
  );

  if (!res.ok) {
    console.error("Erreur génération PDF :", await res.text());
    return null;
  }

  const { pdf_url } = await res.json();
  console.log("✅ PDF généré :", pdf_url);
  return pdf_url;
}
