// supabase/functions/generate-consultation-pdf/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import jsPDF from "https://esm.sh/jspdf@2.5.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const jsonHeaders = {
  "Content-Type": "application/json",
  ...corsHeaders,
};

// ✅ jsPDF n'aime pas les espaces insécables (NBSP/Narrow NBSP) -> remplace par espace normal
function cleanText(input: any): string {
  const s = input === null || input === undefined ? "" : String(input);
  return s.replace(/[\u00A0\u202F]/g, " "); // NBSP + narrow NBSP
}

function safe(v: any, fallback = "-") {
  const s = v === null || v === undefined || v === "" ? fallback : String(v);
  return cleanText(s);
}

function formatNumberFr(n: number): string {
  // toLocaleString("fr-FR") met souvent U+202F => on le normalise
  return cleanText(n.toLocaleString("fr-FR"));
}

function formatFCFA(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${formatNumberFr(value)} FCFA`;
}

function money(v: any): string {
  const n =
    typeof v === "number"
      ? v
      : Number(String(v ?? "").replace(/[^\d.-]/g, ""));
  if (Number.isFinite(n)) return formatNumberFr(n);
  return "—";
}

function ensurePage(pdf: jsPDF, y: number) {
  if (y > 280) {
    pdf.addPage();
    return 20;
  }
  return y;
}

// ✅ Statut biométrie dérivé (sans migration DB)
function getBiometricLabel(c: any): string {
  if (c?.biometric_verified_at) return "Vérifiée ✅";
  if (c?.fingerprint_missing) return "Empreinte manquante ⚠️";
  if (!c?.insurer_id) return "Non requis —";
  return "Non vérifiée ⏳";
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: jsonHeaders,
    });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const consultationId = body.consultationId as string | undefined;
  if (!consultationId) {
    return new Response(JSON.stringify({ error: "Missing consultationId" }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  // Supabase service role
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // ✅ IMPORTANT: virgules OK + pas de doublons
  const selectFields = `
    id,
    created_at,
    amount,
    status,

    pricing_status,
    pricing_total,
    insurer_amount,
    patient_amount,
    amount_delta,

    biometric_verified_at,
    biometric_operator_id,
    biometric_clinic_id,
    fingerprint_missing,
    insurer_id,

    acts,
    medications,

    diagnosis_code_text,
    diagnosis_code:diagnosis_codes(code,title),

    patients(name),
    clinic_staff(name),
    clinics(name)
  `;

  const { data: c, error: fetchError } = await supabase
    .from("consultations")
    .select(selectFields)
    .eq("id", consultationId)
    .maybeSingle();

  if (fetchError || !c) {
    console.error("[generate-consultation-pdf] fetch error", fetchError);
    return new Response(
      JSON.stringify({
        error: "Consultation fetch failed",
        details: fetchError?.message ?? fetchError,
      }),
      { status: 404, headers: jsonHeaders },
    );
  }

  // Diagnostic label
  const diagnosisLabel =
    safe((c as any).diagnosis_code_text, "").trim() ||
    (() => {
      const dcAny = (c as any).diagnosis_code;
      const dc = Array.isArray(dcAny) ? dcAny[0] : dcAny;
      const code = safe(dc?.code, "").trim();
      const title = safe(dc?.title, "").trim();
      const txt = `${code}${code && title ? " - " : ""}${title}`.trim();
      return txt;
    })();

  // PDF
  const pdf = new jsPDF();
  let y = 20;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text(cleanText("Fiche consultation Mediconnect+"), 10, y);
  y += 12;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);

  pdf.text(cleanText(`ID consultation : ${safe((c as any).id)}`), 10, y);
  y += 7;

  const dateStr = new Date((c as any).created_at).toLocaleString("fr-FR");
  pdf.text(cleanText(`Date : ${dateStr}`), 10, y);
  y += 7;

  pdf.text(cleanText(`Patient : ${safe((c as any).patients?.name)}`), 10, y);
  y += 7;
  pdf.text(cleanText(`Médecin : ${safe((c as any).clinic_staff?.name)}`), 10, y);
  y += 7;
  pdf.text(cleanText(`Établissement : ${safe((c as any).clinics?.name)}`), 10, y);
  y += 7;

  pdf.text(cleanText(`Montant déclaré : ${money((c as any).amount)} FCFA`), 10, y);
  y += 7;
  pdf.text(cleanText(`Statut : ${safe((c as any).status)}`), 10, y);
  y += 10;

  // ----- TARIFICATION (Mediconnect+) -----
  pdf.setFont("helvetica", "bold");
  pdf.text(cleanText("Tarification (calcul Mediconnect+)"), 10, y);
  y += 8;

  pdf.setFont("helvetica", "normal");

  pdf.text(cleanText(`Statut pricing : ${safe((c as any).pricing_status)}`), 12, y); y += 6;
  pdf.text(cleanText(`Total calculé : ${formatFCFA((c as any).pricing_total)}`), 12, y); y += 6;
  pdf.text(cleanText(`Part assureur : ${formatFCFA((c as any).insurer_amount)}`), 12, y); y += 6;
  pdf.text(cleanText(`Reste patient : ${formatFCFA((c as any).patient_amount)}`), 12, y); y += 6;
  pdf.text(
    cleanText(`Écart (déclaré - calculé) : ${formatFCFA((c as any).amount_delta)}`),
    12,
    y
  );
  y += 10;

  y = ensurePage(pdf, y);

  // ----- PREUVE BIOMÉTRIQUE -----
  pdf.setFont("helvetica", "bold");
  pdf.text(cleanText("Preuve biométrique"), 10, y);
  y += 8;

  pdf.setFont("helvetica", "normal");
  const bioLabel = getBiometricLabel(c);
  pdf.text(cleanText(`Statut : ${bioLabel}`), 12, y);
  y += 6;

  if ((c as any).biometric_verified_at) {
    const bioDate = new Date((c as any).biometric_verified_at).toLocaleString("fr-FR");
    pdf.text(cleanText(`Date vérification : ${bioDate}`), 12, y);
    y += 6;
  }

  y += 6;
  y = ensurePage(pdf, y);

  // --- Diagnosis ---
  pdf.setFont("helvetica", "bold");
  pdf.text(cleanText("Affection(s) / Diagnostic codifié :"), 10, y);
  y += 7;

  pdf.setFont("helvetica", "normal");
  if (!diagnosisLabel) {
    pdf.text(cleanText("- Non renseigné"), 12, y);
    y += 6;
  } else {
    const lines = pdf.splitTextToSize(cleanText(diagnosisLabel), 180);
    for (const line of lines) {
      pdf.text(cleanText(line), 12, y);
      y += 6;
      y = ensurePage(pdf, y);
    }
  }
  y += 4;

  // --- Acts ---
  pdf.setFont("helvetica", "bold");
  pdf.text(cleanText("Actes réalisés :"), 10, y);
  y += 7;

  pdf.setFont("helvetica", "normal");
  const acts = ((c as any).acts as any[]) || [];
  if (!acts.length) {
    pdf.text(cleanText("- Aucun acte déclaré"), 12, y);
    y += 6;
  } else {
    for (const act of acts) {
      const code = safe(act?.code, "").trim();
      const title = safe(act?.title, "").trim();
      const manual =
        safe(act?.label, "").trim() ||
        safe(act?.name, "").trim() ||
        safe(act?.type, "").trim();

      const label =
        (code || title)
          ? `${code}${code && title ? " - " : ""}${title}`.trim()
          : manual || cleanText(JSON.stringify(act));

      pdf.text(cleanText(`- ${label}`), 12, y);
      y += 6;
      y = ensurePage(pdf, y);
    }
  }

  y += 4;

  // --- Medications ---
  pdf.setFont("helvetica", "bold");
  pdf.text(cleanText("Médicaments :"), 10, y);
  y += 7;

  pdf.setFont("helvetica", "normal");
  const meds = ((c as any).medications as any[]) || [];
  if (!meds.length) {
    pdf.text(cleanText("- Aucun médicament déclaré"), 12, y);
    y += 6;
  } else {
    for (const m of meds) {
      const label =
        typeof m === "string" ? m : (m?.name || m?.label || JSON.stringify(m));
      pdf.text(cleanText(`- ${label}`), 12, y);
      y += 6;
      y = ensurePage(pdf, y);
    }
  }

  // Upload (nom unique pour éviter cache)
  const pdfBytes = pdf.output("arraybuffer");
  const version = Date.now();
  const fileName = `consultation-${consultationId}-${version}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from("consultation-files")
    .upload(fileName, pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
      cacheControl: "0",
    });

  if (uploadError) {
    console.error("[generate-consultation-pdf] upload error", uploadError);
    return new Response(
      JSON.stringify({ error: "Storage upload failed", details: uploadError }),
      { status: 500, headers: jsonHeaders },
    );
  }

  const publicUrl = supabase.storage
    .from("consultation-files")
    .getPublicUrl(fileName).data.publicUrl;

  const { error: updateError } = await supabase
    .from("consultations")
    .update({ pdf_url: publicUrl })
    .eq("id", consultationId);

  if (updateError) {
    console.error("[generate-consultation-pdf] update error", updateError);
    return new Response(
      JSON.stringify({ error: "DB update failed", details: updateError }),
      { status: 500, headers: jsonHeaders },
    );
  }

  return new Response(JSON.stringify({ pdfUrl: publicUrl }), {
    status: 200,
    headers: jsonHeaders,
  });
});

