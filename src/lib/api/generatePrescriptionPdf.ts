// src/lib/api/generatePrescriptionPdf.ts
import jsPDF from "jspdf";

export interface PrescriptionPdfParams {
  consultationId: string;
  patientName: string;
  clinicName: string;
  doctorName: string;
  medications: string[];
  consultationDate: string; // ISO string (created_at)
}

/**
 * Génère une ordonnance PDF côté navigateur et déclenche le téléchargement.
 */
export async function generatePrescriptionPdf(
  params: PrescriptionPdfParams
): Promise<void> {
  const {
    consultationId,
    patientName,
    clinicName,
    doctorName,
    medications,
    consultationDate,
  } = params;

  const doc = new jsPDF();
  let y = 20;

  // Titre
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Ordonnance médicale", 105, y, { align: "center" });

  // Bloc établissement / médecin
  y += 20;
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`Établissement : ${clinicName}`, 20, y);
  y += 7;
  doc.text(`Médecin : ${doctorName}`, 20, y);

  // Bloc patient
  y += 15;
  doc.setFont("helvetica", "bold");
  doc.text("Informations patient", 20, y);

  y += 7;
  doc.setFont("helvetica", "normal");
  doc.text(`Nom : ${patientName}`, 20, y);

  const dateStr = new Date(consultationDate).toLocaleString("fr-FR");
  y += 7;
  doc.text(`Date de la consultation : ${dateStr}`, 20, y);

  // Bloc médicaments
  y += 15;
  doc.setFont("helvetica", "bold");
  doc.text("Médicaments prescrits", 20, y);

  y += 7;
  doc.setFont("helvetica", "normal");
  if (!medications || medications.length === 0) {
    doc.text("- Aucun médicament renseigné", 25, y);
    y += 7;
  } else {
    medications.forEach((med) => {
      doc.text(`• ${med}`, 25, y);
      y += 7;

      // gestion bas de page
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });
  }

  // Signature
  y += 20;
  doc.text("Signature du médecin :", 20, y);

  const fileName = `ordonnance-${consultationId}.pdf`;
  doc.save(fileName);
}
