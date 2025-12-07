// src/Pages/assureur/ConsultationDetailsPage.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import ConsultationChat from "../../components/ui/assureur/ConsultationChat";

export default function AssureurConsultationDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [consultation, setConsultation] = useState<any>(null);
  const [patient, setPatient] = useState<any>(null);
  const [membership, setMembership] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!id) return;

      // 1) Consultation
      const { data: consult, error: cError } = await supabase
        .from("consultations")
        .select(
          `
          id,
          created_at,
          amount,
          status,
          pdf_url,
          patient_id,
          clinic:clinics(name),
          doctor:clinic_staff(id, name)
        `
        )
        .eq("id", id)
        .single();

      if (cError || !consult) {
        setLoading(false);
        return;
      }
      setConsultation(consult);

      // 2) Patient
      if (consult.patient_id) {
        const { data: patientData } = await supabase
          .from("patients")
          .select("id, full_name, is_assured")
          .eq("id", consult.patient_id)
          .single();
        setPatient(patientData || null);

        // 3) Dernière affiliation assureur
        const { data: membershipData } = await supabase
          .from("insurer_memberships")
          .select(
            `
            member_no,
            plan_code,
            insurer:insurers(name)
          `
          )
          .eq("patient_id", consult.patient_id)
          .order("last_verified_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        setMembership(membershipData || null);
      }

      // 4) User courant (pour la messagerie)
      const { data: currentUser } = await supabase.auth.getUser();
      if (currentUser?.user?.id) setCurrentUserId(currentUser.user.id);

      setLoading(false);
    };

    fetchDetails();
  }, [id]);

  if (loading) return <p className="p-6">Chargement...</p>;
  if (!consultation) return <p className="p-6">Consultation introuvable</p>;

  const insurerName = membership?.insurer?.name || "—";
  const memberNo = membership?.member_no || "—";
  const planCode = membership?.plan_code || "—";

  return (
    <div className="p-6 space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-blue-600 underline mb-4"
      >
        ← Retour aux rapports
      </button>

      <h1 className="text-2xl font-bold">
        Fiche consultation #{consultation.id}
      </h1>

      <div className="bg-white shadow rounded p-4 space-y-2 border">
        <p>
          <strong>Date :</strong>{" "}
          {new Date(consultation.created_at).toLocaleString()}
        </p>
        <p>
          <strong>Montant :</strong> {consultation.amount} FCFA
        </p>
        <p>
          <strong>Statut :</strong> {consultation.status}
        </p>
        <p>
          <strong>Établissement :</strong> {consultation.clinic?.name}
        </p>
        <p>
          <strong>Médecin :</strong> {consultation.doctor?.name}
        </p>
        <p>
          <strong>Patient :</strong> {patient?.full_name || "—"}
        </p>
        <p>
          <strong>Assureur :</strong> {insurerName}
        </p>
        <p>
          <strong>N° adhérent :</strong> {memberNo}
        </p>
        <p>
          <strong>Code plan :</strong> {planCode}
        </p>

        {consultation.pdf_url ? (
          <a
            href={consultation.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            📄 Télécharger le rapport PDF de la prestation
          </a>
        ) : (
          <p className="text-gray-500 italic">
            Aucun PDF disponible pour cette consultation.
          </p>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">
          Messagerie avec le médecin
        </h2>
        <ConsultationChat
          consultationId={consultation.id}
          senderRole="insurer"
          senderId={currentUserId}
          doctorId={consultation.doctor?.id || ""}
        />
      </div>
    </div>
  );
}

