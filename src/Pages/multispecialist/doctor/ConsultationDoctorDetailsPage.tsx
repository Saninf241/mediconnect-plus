//src/Pages/multispecialist/doctor/ConsultationDoctorDetailsPage.tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../../lib/supabase";
import { Button } from "../../../components/ui/button";
import jsPDF from "jspdf";

type ConsultationRecord = {
  id: string;
  created_at: string;
  status: string;
  amount: number | null;
  pdf_url: string | null;

  insurer_decision_at: string | null;
  insurer_comment: string | null;
  insurer_id: string | null;

  medications: string[] | null;

  // relations renvoyées comme tableaux
  patients?: { name?: string | null; phone?: string | null; date_of_birth?: string | null }[] | null;
  clinics?: { name?: string | null; address?: string | null }[] | null;
  clinic_staff?: { name?: string | null }[] | null;
};

export default function ConsultationDoctorDetailsPage() {
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState<ConsultationRecord | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchDetails = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("consultations")
        .select(
          `
          id,
          created_at,
          status,
          amount,
          pdf_url,
          insurer_decision_at,
          insurer_comment,
          insurer_id,
          medications,
          patients ( name, phone, date_of_birth ),
          clinics ( name, address ),
          clinic_staff ( name )
        `
        )
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error("[DoctorConsultationDetails] error:", error);
        setRecord(null);
      } else {
        setRecord(data as ConsultationRecord);
      }

      setLoading(false);
    };

    fetchDetails();
  }, [id]);

  const formatDateTime = (value: string | null) => {
    if (!value) return "—";
    return new Date(value).toLocaleString("fr-FR");
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "draft":
        return "Brouillon";
      case "sent":
        return "Envoyée à l’assureur";
      case "accepted":
        return "Acceptée par l’assureur";
      case "rejected":
        return "Rejetée par l’assureur";
      case "paid":
        return "Payée";
      default:
        return status;
    }
  };

  const handleGeneratePrescription = () => {
    if (!record) return;

    const patient = record.patients?.[0];
    const clinic = record.clinics?.[0];
    const doctor = record.clinic_staff?.[0];

    const patientName = patient?.name || "Patient inconnu";
    const clinicName = clinic?.name || "Établissement";
    const clinicAddress = clinic?.address || "";
    const doctorName = doctor?.name || "Médecin";
    const meds = record.medications || [];
    const dateText = formatDateTime(record.created_at);

    const doc = new jsPDF();

    // Titre
    doc.setFontSize(18);
    doc.text("Ordonnance médicale", 105, 20, { align: "center" });

    doc.setFontSize(11);
    let y = 35;

    // En-tête établissement / médecin
    doc.text(`Établissement : ${clinicName}`, 20, y);
    y += 6;
    if (clinicAddress) {
      doc.text(`Adresse : ${clinicAddress}`, 20, y);
      y += 6;
    }
    doc.text(`Médecin : ${doctorName}`, 20, y);
    y += 10;

    // Infos patient
    doc.setFontSize(12);
    doc.text("Informations patient", 20, y);
    y += 6;
    doc.setFontSize(11);
    doc.text(`Nom : ${patientName}`, 20, y);
    y += 6;
    if (patient?.date_of_birth) {
      const dob = new Date(patient.date_of_birth).toLocaleDateString("fr-FR");
      doc.text(`Date de naissance : ${dob}`, 20, y);
      y += 6;
    }
    if (patient?.phone) {
      doc.text(`Téléphone : ${patient.phone}`, 20, y);
      y += 6;
    }
    doc.text(`Date de la consultation : ${dateText}`, 20, y);
    y += 10;

    // Liste des médicaments
    doc.setFontSize(12);
    doc.text("Médicaments prescrits", 20, y);
    y += 8;
    doc.setFontSize(11);

    if (meds.length === 0) {
      doc.text("Aucun médicament enregistré dans le dossier.", 25, y);
      y += 6;
    } else {
      meds.forEach((m, idx) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(`• ${m}`, 25, y);
        y += 6;
      });
    }

    y += 15;
    doc.text("Signature du médecin :", 20, y);

    doc.save(`ordonnance-${record.id}.pdf`);
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">Chargement de la consultation…</p>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-500">
          Consultation introuvable ou inaccessible.
        </p>
      </div>
    );
  }

  const patient = record.patients?.[0];
  const clinic = record.clinics?.[0];
  const doctor = record.clinic_staff?.[0];

  const patientName = patient?.name || "—";
  const clinicName = clinic?.name || "—";
  const doctorName = doctor?.name || "—";

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold mb-4">Détails de la consultation</h1>

      {/* Bloc synthèse */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-2">
        <p className="text-sm text-gray-700">
          <span className="font-semibold">Patient :</span> {patientName}
        </p>
        <p className="text-sm text-gray-700">
          <span className="font-semibold">Établissement :</span> {clinicName}
        </p>
        <p className="text-sm text-gray-700">
          <span className="font-semibold">Médecin :</span> {doctorName}
        </p>
        <p className="text-sm text-gray-700">
          <span className="font-semibold">Date :</span>{" "}
          {formatDateTime(record.created_at)}
        </p>
        <p className="text-sm text-gray-700">
          <span className="font-semibold">Montant :</span>{" "}
          {record.amount != null
            ? `${record.amount.toLocaleString("fr-FR")} FCFA`
            : "—"}
        </p>
      </div>

      {/* Statut assureur */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-2">
        <h2 className="font-semibold text-lg mb-1">Statut auprès de l’assureur</h2>
        <p className="text-sm text-gray-700">
          <span className="font-semibold">Statut :</span>{" "}
          {statusLabel(record.status)}
        </p>
        <p className="text-sm text-gray-700">
          <span className="font-semibold">Décision le :</span>{" "}
          {formatDateTime(record.insurer_decision_at)}
        </p>
        <p className="text-sm text-gray-700">
          <span className="font-semibold">Commentaire de l’assureur :</span>{" "}
          {record.insurer_comment?.trim()
            ? record.insurer_comment
            : "— aucun commentaire —"}
        </p>

        {record.pdf_url ? (
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Rapport PDF (assureur) :</span>{" "}
            <a
              href={record.pdf_url}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 underline"
            >
              Ouvrir le rapport PDF
            </a>
          </p>
        ) : (
          <p className="text-sm text-gray-500">
            Aucun rapport PDF n’est disponible pour cette consultation.
          </p>
        )}
      </div>

      {/* Médicaments + ordonnance */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <h2 className="font-semibold text-lg">Médicaments prescrits</h2>
        {record.medications && record.medications.length > 0 ? (
          <ul className="list-disc pl-5 text-sm text-gray-700">
            {record.medications.map((m, idx) => (
              <li key={idx}>{m}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">
            Aucun médicament enregistré dans cette consultation.
          </p>
        )}

        <div className="pt-3">
          <Button onClick={handleGeneratePrescription}>
            Générer l’ordonnance PDF
          </Button>
        </div>
      </div>
    </div>
  );
}

