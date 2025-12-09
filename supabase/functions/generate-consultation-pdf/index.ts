// supabase/functions/generate-consultation-pdf/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import jsPDF from "https://esm.sh/jspdf@2.5.1";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const body = await req.json().catch(() => ({}));
  const { consultationId } = body as { consultationId?: string };

  if (!consultationId) {
    return new Response(
      JSON.stringify({ error: "Missing consultationId" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // 1) Consultation de base
  const { data: consultation, error: cError } = await supabase
    .from("consultations")
    .select(
      "id, created_at, amount, status, insurer_id, patient_id, clinic_id, doctor_id"
    )
    .eq("id", consultationId)
    .single();

  if (cError || !consultation) {
    console.error("generate-consultation-pdf: consultation not found", cError);
    return new Response(
      JSON.stringify({ error: "Consultation not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  // 2) Infos patient
  const { data: patient } = await supabase
    .from("patients")
    .select("name, insurance_number, insurance_provider, is_assured")
    .eq("id", consultation.patient_id)
    .maybeSingle();

  // 3) Infos médecin
  const { data: doctor } = await supabase
    .from("clinic_staff")
    .select("name")
    .eq("id", consultation.doctor_id)
    .maybeSingle();

  // 4) Infos établissement
  const { data: clinic } = await supabase
    .from("clinics")
    .select("name")
    .eq("id", consultation.clinic_id)
    .maybeSingle();

  // --------- Génération du PDF (V1) ----------
  const doc = new jsPDF();
  let y = 10;

  doc.setFontSize(16);
  doc.text("Dossier de prestation - MediConnect+", 10, y);
  y += 8;

  doc.setFontSize(10);
  doc.text(`ID consultation : ${consultation.id}`, 10, y); y += 5;
  doc.text(
    `Date consultation : ${new Date(consultation.created_at).toLocaleString()}`,
    10,
    y
  ); y += 5;
  doc.text(`Statut : ${consultation.status}`, 10, y); y += 8;

  // Section 1 - Patient
  doc.setFontSize(12);
  doc.text("Section 1 - Patient", 10, y); y += 6;
  doc.setFontSize(10);
  doc.text(`Nom : ${patient?.name ?? "-"}`, 10, y); y += 5;
  doc.text(`N° assuré : ${patient?.insurance_number ?? "-"}`, 10, y); y += 5;
  doc.text(
    `Assureur : ${patient?.insurance_provider ?? "-"}`,
    10,
    y
  ); y += 5;
  doc.text(
    `Statut de couverture : ${patient?.is_assured ? "Assuré" : "Non précisé"}`,
    10,
    y
  ); y += 8;

  // Section 2 - Consultation
  doc.setFontSize(12);
  doc.text("Section 2 - Consultation", 10, y); y += 6;
  doc.setFontSize(10);
  doc.text(`Médecin : ${doctor?.name ?? "-"}`, 10, y); y += 5;
  doc.text(`Établissement : ${clinic?.name ?? "-"}`, 10, y); y += 5;
  doc.text(`Montant déclaré : ${consultation.amount ?? 0} FCFA`, 10, y); y += 8;

  // Placeholders pour la suite (on complètera plus tard)
  doc.setFontSize(12);
  doc.text("Section 3 - Symptômes", 10, y); y += 6;
  doc.setFontSize(10);
  doc.text("(Détails à compléter dans une V2 du PDF)", 10, y); y += 8;

  doc.setFontSize(12);
  doc.text("Section 4 - Diagnostic", 10, y); y += 6;
  doc.setFontSize(10);
  doc.text("(Détails à compléter dans une V2 du PDF)", 10, y); y += 8;

  doc.setFontSize(12);
  doc.text("Section 5 - Actes réalisés", 10, y); y += 6;
  doc.setFontSize(10);
  doc.text("(Tableau des actes à intégrer dans une V2)", 10, y); y += 8;

  doc.setFontSize(12);
  doc.text("Section 6 - Médicaments", 10, y); y += 6;
  doc.setFontSize(10);
  doc.text("(Médicaments prescrits à intégrer dans une V2)", 10, y); y += 8;

  doc.setFontSize(12);
  doc.text("Section 7 - Fichiers", 10, y); y += 6;
  doc.setFontSize(10);
  doc.text("(Ordonnance, imagerie, etc. à lier dans une V2)", 10, y); y += 8;

  doc.setFontSize(12);
  doc.text("Section 8 - Validation", 10, y); y += 6;
  doc.setFontSize(10);
  doc.text("Signature médecin : ____________________", 10, y); y += 5;
  doc.text("Cachet : _____________________________", 10, y); y += 5;

  // Sortie PDF → ArrayBuffer → Uint8Array
  const pdfArrayBuffer = doc.output("arraybuffer");
  const pdfBytes = new Uint8Array(pdfArrayBuffer);

  const bucket = "consultation-files";      // 🔴 adapte si ton bucket a un autre nom
  const filePath = `consultations/${consultation.id}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    console.error("generate-consultation-pdf: upload error", uploadError);
    return new Response(
      JSON.stringify({ error: "Upload failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const { data: publicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  const pdfUrl = publicUrlData.publicUrl;

  // Mise à jour de la consultation
  await supabase
    .from("consultations")
    .update({ pdf_url: pdfUrl })
    .eq("id", consultation.id);

  return new Response(
    JSON.stringify({ pdf_url: pdfUrl }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
