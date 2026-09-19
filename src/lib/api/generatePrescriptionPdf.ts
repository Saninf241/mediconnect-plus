// src/lib/api/generatePrescriptionPdf.ts
import jsPDF from "jspdf";
import QRCode from "qrcode";

export interface PrescriptionPdfParams {
  consultationId: string;
  patientName: string;
  clinicName: string;
  doctorName: string;
  medications: string[];
  consultationDate: string; // ISO string (created_at)
  dispenseCode?: string | null;
}

/**
 * Génère une ordonnance PDF côté navigateur et déclenche le téléchargement.
 *
 * Quand un code de retrait est disponible, il est imprimé en clair et sous
 * forme de QR : n'importe quelle pharmacie du réseau peut alors le
 * retrouver, en le tapant à la main ou en le scannant avec la douchette
 * code-barres/QR qu'elle utilise déjà pour son stock (elle se comporte
 * comme un clavier — aucune intégration ni matériel supplémentaire requis).
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
    dispenseCode,
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

  // Bloc code de retrait pharmacie
  if (dispenseCode) {
    y += 20;
    if (y > 220) {
      doc.addPage();
      y = 20;
    }

    doc.setDrawColor(180);
    doc.rect(20, y, 170, 45);

    try {
      const qrDataUrl = await QRCode.toDataURL(dispenseCode, { margin: 0 });
      doc.addImage(qrDataUrl, "PNG", 26, y + 6, 33, 33);
    } catch (e) {
      console.error("[generatePrescriptionPdf] QR generation failed:", e);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Code de retrait pharmacie", 66, y + 14);
    doc.setFontSize(18);
    doc.text(dispenseCode.replace(/(.{4})/g, "$1 ").trim(), 66, y + 26);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(
      "À présenter dans n'importe quelle pharmacie (saisie ou scan).",
      66,
      y + 36
    );
  }

  const fileName = `ordonnance-${consultationId}.pdf`;
  doc.save(fileName);
}
