// src/lib/api/generateConsultationPdf.ts

/**
 * Appelle la Edge Function Supabase `generate-consultation-pdf`
 * pour générer / mettre à jour la fiche PDF d'une consultation.
 *
 * Effet attendu côté Edge Function :
 *   - génère un PDF (jsPDF / autre)
 *   - l'upload dans Supabase Storage
 *   - met à jour `consultations.pdf_url`
 *   - retourne éventuellement { pdf_url }
 */
export async function generateConsultationPdf(consultationId: string): Promise<void> {
  if (!consultationId) {
    console.warn("[generateConsultationPdf] consultationId manquant");
    return;
  }

  console.log("[generateConsultationPdf] start for", consultationId);

  try {
    const res = await fetch(
      "https://zwxegqevthzfphdqtjew.supabase.co/functions/v1/generate-consultation-pdf",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ consultation_id: consultationId }),
      }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(
        "[generateConsultationPdf] HTTP error",
        res.status,
        res.statusText,
        text
      );
      throw new Error(`generate-consultation-pdf failed: ${res.status}`);
    }

    let data: any = null;
    try {
      data = await res.json();
    } catch {
      // ce n'est pas grave si la fonction ne renvoie pas de JSON structuré
      data = null;
    }

    console.log("[generateConsultationPdf] edge response:", data);
  } catch (e) {
    console.error("[generateConsultationPdf] unexpected error:", e);
    throw e; // on relance pour que le catch dans createConsultation fasse le toast.warn
  }
}
