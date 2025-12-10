// src/Pages/assureur/ConsultationDetailsPage.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import ConsultationChatAssureur from "../../components/ui/assureur/ConsultationChat";

export default function AssureurConsultationDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  // On reste pragmatique ici : any pour éviter les erreurs de typage
  const [consultation, setConsultation] = useState<any>(null);
  const [patient, setPatient] = useState<any>(null);
  const [membership, setMembership] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!id) return;

      // 1) Consultation + docteur + clinique
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
          insurer_comment,
          insurer_decision_at,
          clinic:clinics ( name ),
          doctor:clinic_staff ( id, name )
        `
        )
        .eq("id", id)
        .maybeSingle();

      if (cError || !consult) {
        console.error("[AssureurDetails] error consultation:", cError);
        setLoading(false);
        return;
      }

      setConsultation(consult);

      // 2) Patient
      if (consult.patient_id) {
        const { data: patientData, error: pError } = await supabase
          .from("patients")
          .select("id, name, name, is_assured")
          .eq("id", consult.patient_id)
          .maybeSingle();

        if (pError) {
          console.warn("[AssureurDetails] error patient:", pError);
        }

        setPatient(patientData || null);

        // 3) Dernière affiliation assureur
        const { data: membershipData, error: mError } = await supabase
          .from("insurer_memberships")
          .select(
            `
            member_no,
            plan_code,
            insurer:insurers ( name )
          `
          )
          .eq("patient_id", consult.patient_id)
          .order("last_verified_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (mError) {
          console.warn("[AssureurDetails] error membership:", mError);
        }

        setMembership(membershipData || null);
      }

      setLoading(false);
    };

    fetchDetails();
  }, [id]);

  if (loading) return <p className="p-6">Chargement...</p>;
  if (!consultation) return <p className="p-6">Consultation introuvable</p>;

  // --------- Dérivés affichage ---------
  const patientName =
    patient?.name || patient?.name || "—";

  const insurerName = membership?.insurer?.name || "—";
  const memberNo = membership?.member_no || "—";
  const planCode = membership?.plan_code || "—";

  const decisionDate = consultation.insurer_decision_at
    ? new Date(consultation.insurer_decision_at).toLocaleString()
    : "—";

  return (
    <div className="p-6 space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-blue-600 underline mb-4"
      >
        ← Retour aux rapports
      </button>

      <h1 className="text-2xl font-bold mb-4">
        Fiche consultation #{consultation.id}
      </h1>

      {/* Bloc infos principales */}
      <section className="bg-white shadow rounded p-4 space-y-2 border">
        <p>
          <strong>Date :</strong>{" "}
          {new Date(consultation.created_at).toLocaleString()}
        </p>
        <p>
          <strong>Montant :</strong>{" "}
          {consultation.amount != null
            ? `${consultation.amount.toLocaleString("fr-FR")} FCFA`
            : "—"}
        </p>
        <p>
          <strong>Statut :</strong> {consultation.status}
        </p>
        <p>
          <strong>Établissement :</strong>{" "}
          {consultation.clinic?.name || "—"}
        </p>
        <p>
          <strong>Médecin :</strong>{" "}
          {consultation.doctor?.name || "—"}
        </p>
        <p>
          <strong>Patient :</strong> {patientName}
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
        <p>
          <strong>Date de décision :</strong> {decisionDate}
        </p>
        <p>
          <strong>Commentaire saisi :</strong>{" "}
          {consultation.insurer_comment?.trim()
            ? consultation.insurer_comment
            : "— aucun commentaire —"}
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
      </section>

      {/* Bloc messagerie */}
      {consultation.doctor?.id ? (
        <section className="mt-8">
          <h2 className="text-xl font-semibold mb-2">
            Messagerie avec le médecin
          </h2>
          <ConsultationChatAssureur
            consultationId={consultation.id}
            doctorId={consultation.doctor.id}
          />
        </section>
      ) : (
        <section className="mt-8 bg-white shadow rounded p-4 text-sm text-gray-500">
          Aucun médecin n’est associé à cette consultation – messagerie
          indisponible.
        </section>
      )}
    </div>
  );
}
