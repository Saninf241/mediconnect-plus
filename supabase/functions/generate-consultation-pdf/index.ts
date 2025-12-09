// supabase/functions/generate-consultation-pdf/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import jsPDF from "https://esm.sh/jspdf@2.5.1";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const consultationId = body.consultationId as string | undefined;

  if (!consultationId) {
    return new Response("Missing consultationId", { status: 400 });
  }

  // 1) Récupérer la consultation + jointures
  const { data: cons, error } = await supabase
    .from("consultations")
    .select(
      `
        id,
        created_at,
        amount,
        status,
        acts,
        medications,
        patient_id,
        doctor_id,
        clinic_id,
        patients ( name, insurance_number ),
        clinic_staff ( name ),
        clinics ( name )
      `
    )
    .eq("id", consultationId)
    .maybeSingle();

  if (error || !cons) {
    console.error("generate-consultation-pdf: consultation not found", error);
    return new Response("Consultation not found", { status: 404 });
  }

  // 2) Préparer les champs utiles
  const patientName = cons.patients?.name ?? "-";
  const insuranceNumber = cons.patients?.insurance_number ?? "-";
  const doctorName = cons.clinic_staff?.name ?? "-";
  const clinicName = cons.clinics?.name ?? "-";
  const amount = cons.amount ?? 0;
  const status = cons.status ?? "-";
  const createdAt = cons.created_at
    ? new Date(cons.created_at).toLocaleString("fr-FR")
    : "-";

  const acts = (cons.acts ?? []) as Array<{ type?: string }>;
  const meds = (cons.medications ?? []) as Array<string | { name?: string }>;

  // 3) Création du PDF
  const doc = new jsPDF();
  let y = 20;
  const lineHeight = 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Fiche consultation Mediconnect+", 20, y);
  y += 2 * lineHeight;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  doc.text(`ID consultation : ${cons.id}`, 20, y);
  y += lineHeight;

  doc.text(`Date : ${createdAt}`, 20, y);
  y += lineHeight * 1.5;

  doc.text(`Patient : ${patientName}`, 20, y);
  y += lineHeight;

  doc.text(`N° assuré : ${insuranceNumber || "-"}`, 20, y);
  y += lineHeight * 1.5;

  doc.text(`Médecin : ${doctorName}`, 20, y);
  y += lineHeight;

  doc.text(`Établissement : ${clinicName}`, 20, y);
  y += lineHeight * 1.5;

  doc.text(`Montant : ${amount} FCFA`, 20, y);
  y += lineHeight;

  doc.text(`Statut : ${status}`, 20, y);
  y += lineHeight * 2;

  // ---------- Section Actes ----------
  doc.setFont("helvetica", "bold");
  doc.text("Actes médicaux :", 20, y);
  y += lineHeight;
  doc.setFont("helvetica", "normal");

  if (acts && acts.length > 0) {
    for (const a of acts) {
      const label = a?.type || JSON.stringify(a);
      doc.text(`- ${label}`, 25, y);
      y += lineHeight;

      // gestion simple de saut de page
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    }
  } else {
    doc.text("- Aucun acte renseigné", 25, y);
    y += lineHeight;
  }

  y += lineHeight; // espace avant médicaments

  // ---------- Section Médicaments ----------
  doc.setFont("helvetica", "bold");
  doc.text("Médicaments :", 20, y);
  y += lineHeight;
  doc.setFont("helvetica", "normal");

  if (meds && meds.length > 0) {
    for (const m of meds) {
      const label =
        typeof m === "string" ? m : m?.name || JSON.stringify(m);
      doc.text(`- ${label}`, 25, y);
      y += lineHeight;

      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    }
  } else {
    doc.text("- Aucun médicament renseigné", 25, y);
    y += lineHeight;
  }

  // 4) Export en blob
  const pdfBytes = doc.output("arraybuffer");
  const fileName = `consultation-${consultationId}.pdf`;

  // 5) Upload dans Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("consultation-files")
    .upload(fileName, pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    console.error("upload error", uploadError);
    return new Response("Upload failed", { status: 500 });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("consultation-files").getPublicUrl(fileName);

  // 6) Mise à jour de la colonne pdf_url
  const { error: updateError } = await supabase
    .from("consultations")
    .update({ pdf_url: publicUrl })
    .eq("id", consultationId);

  if (updateError) {
    console.error("update pdf_url error", updateError);
    return new Response("Update pdf_url failed", { status: 500 });
  }

  return new Response(
    JSON.stringify({ pdf_url: publicUrl }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
});
