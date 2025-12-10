// src/Pages/multispecialist/doctor/ConsultationDoctorDetailsPage.tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../../lib/supabase";
import { Button } from "../../../components/ui/button";
import { generatePrescriptionPdf } from "../../../lib/api/generatePrescriptionPdf";
import ConsultationChatDoctor from "../../../components/ui/uidoctor/ConsultationChat";

interface ConsultationRecord {
  id: string;
  created_at: string;
  amount: number | null;
  status: string;
  pdf_url: string | null;
  insurer_decision_at: string | null;
  insurer_comment: string | null;
  insurer_id: string | null;
  medications: string[] | null;

  // jointures
  patients?: {
    name?: string | null;
    phone?: string | null;
    date_of_birth?: string | null;
  } | null;

  clinics?: {
    name?: string | null;
  } | null;

  clinic_staff?: {
    name?: string | null;
  } | null;
}

export default function ConsultationDoctorDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [record, setRecord] = useState<ConsultationRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchConsultation = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("consultations")
        .select(
          `
          id,
          created_at,
          amount,
          status,
          pdf_url,
          insurer_decision_at,
          insurer_comment,
          insurer_id,
          medications,
          patients ( name, phone, date_of_birth ),
          clinics ( name ),
          clinic_staff:clinic_staff!consultations_doctor_id_fkey ( name )
        `
        )
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error("[DoctorDetails] error fetching consultation:", error);
      } else if (data) {
        setRecord(data as ConsultationRecord);
      }
      setLoading(false);
    };

    fetchConsultation();
  }, [id]);

  if (loading || !record) {
    return (
      <div className="p-6">
        <p>Chargement des détails de la consultation…</p>
      </div>
    );
  }

  // 🧩 Noms à afficher
  const patientName =
    record.patients?.name ||
    // sécurité au cas où la colonne serait différente
    (record as any).patient_name ||
    "—";

  const clinicName =
    record.clinics?.name ||
    (record as any).clinic_name ||
    "—";

  const doctorName =
    record.clinic_staff?.name ||
    (record as any).doctor_name ||
    "—";

  const decisionDate = record.insurer_decision_at
    ? new Date(record.insurer_decision_at).toLocaleString()
    : "—";

  const createdDate = new Date(record.created_at).toLocaleString();

  const meds = record.medications ?? [];

  // 👉 Génération de l’ordonnance
  const handleGeneratePrescription = async () => {
    try {
      await generatePrescriptionPdf({
        consultationId: record.id,
        patientName: patientName === "—" ? "Patient inconnu" : patientName,
        clinicName: clinicName === "—" ? "Établissement" : clinicName,
        doctorName: doctorName === "—" ? "Médecin" : doctorName,
        medications: meds,
        consultationDate: record.created_at,
      });
    } catch (e) {
      console.error("[DoctorDetails] erreur génération ordonnance :", e);
      alert(
        "Impossible de générer l’ordonnance pour le moment. Réessayez plus tard."
      );
    }
  };

  const hasInsurer = !!record.insurer_id;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold mb-4">Détails de la consultation</h1>

      {/* Bloc infos générales */}
      <section className="bg-white rounded-xl shadow-sm p-4 space-y-1">
        <h2 className="font-semibold mb-2">Informations générales</h2>
        <p>
          <span className="font-medium">Patient :</span> {patientName}
        </p>
        <p>
          <span className="font-medium">Établissement :</span> {clinicName}
        </p>
        <p>
          <span className="font-medium">Médecin :</span> {doctorName}
        </p>
        <p>
          <span className="font-medium">Date :</span> {createdDate}
        </p>
        <p>
          <span className="font-medium">Montant :</span>{" "}
          {record.amount != null
            ? `${record.amount.toLocaleString("fr-FR")} FCFA`
            : "—"}
        </p>
      </section>

      {/* Bloc statut assureur */}
      <section className="bg-white rounded-xl shadow-sm p-4 space-y-1">
        <h2 className="font-semibold mb-2">Statut auprès de l’assureur</h2>
        <p>
          <span className="font-medium">Statut :</span>{" "}
          {record.status === "accepted"
            ? "Acceptée par l’assureur"
            : record.status === "rejected"
            ? "Rejetée par l’assureur"
            : record.status === "sent"
            ? "Envoyée – en attente de décision"
            : record.status}
        </p>
        <p>
          <span className="font-medium">Décision le :</span> {decisionDate}
        </p>
        <p>
          <span className="font-medium">Commentaire de l’assureur :</span>{" "}
          {record.insurer_comment?.trim()
            ? record.insurer_comment
            : "— aucun commentaire —"}
        </p>
        <p>
          <span className="font-medium">Rapport PDF (assureur) :</span>{" "}
          {record.pdf_url ? (
            <a
              href={record.pdf_url}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 underline"
            >
              Ouvrir le rapport PDF
            </a>
          ) : (
            <span className="text-gray-500">Non disponible</span>
          )}
        </p>
      </section>

      {/* Bloc médicaments + ordonnance */}
      <section className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <h2 className="font-semibold mb-2">Médicaments prescrits</h2>
        {meds.length === 0 ? (
          <p className="text-sm text-gray-500">
            Aucun médicament enregistré pour cette consultation.
          </p>
        ) : (
          <ul className="list-disc pl-5">
            {meds.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        )}

        <Button
          className="mt-3 bg-green-600 hover:bg-green-700"
          onClick={handleGeneratePrescription}
          disabled={meds.length === 0}
        >
          Générer l’ordonnance PDF
        </Button>
      </section>

      {/* Bloc messagerie médecin ↔ assureur */}
      {hasInsurer ? (
        <ConsultationChatDoctor
          consultationId={record.id}
          receiverId={record.insurer_id as string}
        />
      ) : (
        <section className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-semibold mb-2">Messagerie</h2>
          <p className="text-sm text-gray-500">
            Aucun assureur n’est associé à cette consultation — la messagerie
            n’est pas disponible.
          </p>
        </section>
      )}
    </div>
  );
}
