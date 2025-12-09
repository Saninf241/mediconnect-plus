// src/lib/api/generateConsultationPdf.ts
export async function generateConsultationPdf(consultationId: string) {
  const url =
    "https://zwxegqevthzfphdqtjew.supabase.co/functions/v1/generate-consultation-pdf";

  console.log("[generateConsultationPdf] call with", consultationId);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ consultationId }),
  });

  console.log("[generateConsultationPdf] HTTP status", res.status);

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(
      `Edge function error ${res.status}: ${txt || "no body"}`
    );
  }

  const data = await res.json().catch(() => ({}));
  console.log("[generateConsultationPdf] response body", data);
  return data;
}

