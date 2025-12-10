// src/lib/api/generateConsultationPdf.ts
export async function generateConsultationPdf(consultationId: string) {
  const url = `${
    import.meta.env.VITE_SUPABASE_URL
  }/functions/v1/generate-consultation-pdf`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ consultationId }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[generateConsultationPdf] HTTP error", res.status, text);
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  const data = await res.json().catch(() => ({}));
  console.log("[generateConsultationPdf] réponse fonction", data);
  return data;
}
