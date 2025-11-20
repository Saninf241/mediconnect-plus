import { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { supabase } from "../../../lib/supabase";

type Patient = {
  id: string;
  name?: string | null;
  full_name?: string | null;
  date_of_birth?: string | null;
  is_assured?: boolean | null;
  insurance_number?: string | null;
  medical_history?: string | null;
  [key: string]: any; // pour ne pas crasher si d'autres colonnes existent
};

type Consultation = {
  id: string;
  created_at: string;
  diagnosis?: string | null;
  amount?: number | null;
  status?: string | null;
};

export default function DoctorPatientDetailsPage() {
  const { id } = useParams(); // patient_id
  const [searchParams] = useSearchParams();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  const returnUrl =
    searchParams.get("return") ||
    "/multispecialist/doctor/new-consultation";

  useEffect(() => {
    (async () => {
      if (!id) {
        setErrorText("Aucun id patient dans l’URL.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorText(null);

      // 1) Patient : on prend * pour éviter les erreurs de colonnes qui manquent
      const {
        data: p,
        error: patientError,
      } = await supabase
        .from("patients")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (patientError) {
        console.error("[DoctorPatientDetailsPage] patientError", patientError);
        setErrorText(
          `Erreur chargement patient : ${patientError.message ?? "inconnue"}`
        );
      }

      // 2) Consultations
      const {
        data: c,
        error: consError,
      } = await supabase
        .from("consultations")
        .select("id,created_at,diagnosis,amount,status")
        .eq("patient_id", id)
        .order("created_at", { ascending: false });

      if (consError) {
        console.error("[DoctorPatientDetailsPage] consError", consError);
        setErrorText((prev) =>
          prev
            ? prev + " | " + consError.message
            : `Erreur chargement consultations : ${consError.message}`
        );
      }

      setPatient((p as Patient) || null);
      setConsultations((c as Consultation[]) || []);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="p-6">Chargement…</div>;

  if (!patient) {
    return (
      <div className="p-6 space-y-3">
        <h1 className="text-2xl font-bold mb-2">Dossier patient</h1>
        <p className="text-gray-700">
          Aucun patient trouvé pour l’ID :{" "}
          <span className="font-mono text-blue-600">{id}</span>
        </p>
        {errorText && (
          <p className="text-sm text-red-600 whitespace-pre-wrap">
            {errorText}
          </p>
        )}
        <p className="text-sm text-gray-500">
          (Vérifie que la colonne <code>id</code> ou <code>patient_id</code> contient bien cette valeur dans Supabase)
        </p>
        <Link
          to={returnUrl}
          className="inline-block mt-4 px-4 py-2 rounded bg-blue-600 text-white"
        >
          Revenir à la consultation
        </Link>
      </div>
    );
  }

  const displayName =
    patient.full_name || patient.name || "Patient sans nom";

  return (
    <div className="p-6 space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{displayName}</h1>
          <p className="text-sm text-gray-500">
            Dossier médical – ID : {patient.id}
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            to={returnUrl}
            className="px-4 py-2 rounded border border-gray-300 text-sm"
          >
            ⬅︎ Retour à la consultation
          </Link>
          <Link
            to={`/multispecialist/doctor/new-consultation?patient_id=${patient.id}`}
            className="px-4 py-2 rounded bg-blue-600 text-white text-sm"
          >
            Nouvelle consultation
          </Link>
        </div>
      </header>

      {errorText && (
        <div className="p-3 rounded bg-red-50 text-red-700 text-sm whitespace-pre-wrap">
          {errorText}
        </div>
      )}

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Identité / résumé */}
        <div className="p-4 bg-white rounded shadow space-y-2">
          <h2 className="font-semibold mb-2">Identité & assurance</h2>
          <p>
            Assuré :{" "}
            {patient.is_assured === true
              ? "Oui"
              : patient.is_assured === false
              ? "Non"
              : "Inconnu"}
          </p>
          <p>N° assuré : {patient.insurance_number || "—"}</p>
          <p>
            Date de naissance :{" "}
            {patient.date_of_birth
              ? new Date(patient.date_of_birth).toLocaleDateString()
              : "—"}
          </p>
          <p>Antécédents : {patient.medical_history || "—"}</p>
        </div>

        {/* Historique consultations */}
        <div className="p-4 bg-white rounded shadow md:col-span-2">
          <h2 className="font-semibold mb-2">Historique des consultations</h2>
          <div className="divide-y">
            {consultations.length === 0 && (
              <p className="text-sm text-gray-500">
                Aucune consultation encore enregistrée pour ce patient.
              </p>
            )}

            {consultations.map((c) => (
              <div
                key={c.id}
                className="py-2 flex items-center justify-between"
              >
                <div>
                  <div className="text-xs text-gray-500">
                    {new Date(c.created_at).toLocaleString()}
                  </div>
                  <div className="font-medium text-sm">
                    {c.diagnosis || "Diagnostic non renseigné"}
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="uppercase text-gray-500">
                    {c.status || "—"}
                  </div>
                  <div className="font-semibold">
                    {c.amount ? `${c.amount} FCFA` : "—"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}