// src/Pages/multispecialist/doctor/DoctorPatientDetailsPage.tsx
import { useEffect, useMemo, useState } from "react";
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
  clinic_id?: string | null;
  [key: string]: any;
};

type Consultation = {
  id: string;
  created_at: string;
  diagnosis?: string | null;
  symptoms?: string | null;
  amount?: number | null;
  status?: string | null;
  medications?: string[] | null;
  pdf_url?: string | null;
  icd_codes?: any;  // souvent array/json
  ccam_codes?: any; // souvent array/json
};

function calcAge(dateOfBirth?: string | null) {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return null;
  const diff = Date.now() - dob.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

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

      // 1) Patient
      const { data: p, error: patientError } = await supabase
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
      // ✅ IMPORTANT : pas de "actes" ici, car colonne n'existe pas
      const { data: c, error: consError } = await supabase
        .from("consultations")
        .select(
          "id,created_at,diagnosis,symptoms,amount,status,medications,pdf_url,icd_codes,ccam_codes"
        )
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

  const displayName =
    patient?.full_name || patient?.name || "Patient sans nom";

  const age = useMemo(() => calcAge(patient?.date_of_birth), [patient]);

  const lastConsult = consultations?.[0];

  const lastCcam: string[] =
    Array.isArray(lastConsult?.ccam_codes) ? lastConsult!.ccam_codes : [];

  const lastIcd: string[] =
    Array.isArray(lastConsult?.icd_codes) ? lastConsult!.icd_codes : [];

  if (loading) return <div className="p-6">Chargement…</div>;

  if (!patient) {
    return (
      <div className="p-6 space-y-3">
        <h1 className="text-2xl font-bold mb-2">Dossier patient</h1>
        <p>Patient introuvable pour l’ID : {id}</p>

        {errorText && (
          <p className="text-sm text-red-600 whitespace-pre-wrap">
            {errorText}
          </p>
        )}

        <Link
          to={returnUrl}
          className="inline-block mt-4 px-4 py-2 rounded bg-blue-600 text-white"
        >
          Revenir à la consultation
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{displayName}</h1>
          <p className="text-sm text-gray-500">
            Dossier médical – ID : {patient.id}
          </p>

          <div className="flex gap-6 mt-2 text-sm text-gray-700">
            <div>Âge : {age !== null ? `${age} ans` : "—"}</div>
            <div>
              {patient.is_assured ? "Assuré" : "Non assuré"}
            </div>
            <div>
              Consultations : {consultations.length}
            </div>
          </div>
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

      {/* GRID */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Identité */}
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

          {consultations.length === 0 && (
            <p className="text-sm text-gray-500">
              Aucune consultation encore enregistrée pour ce patient.
            </p>
          )}

          <div className="divide-y">
            {consultations.map((c) => (
              <div key={c.id} className="py-3 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs text-gray-500">
                    {new Date(c.created_at).toLocaleString()}
                  </div>

                  <div className="font-medium text-sm truncate">
                    {c.diagnosis || "Diagnostic non renseigné"}
                  </div>

                  {c.symptoms && (
                    <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                      Symptômes : {c.symptoms}
                    </div>
                  )}

                  {/* Codes */}
                  {(Array.isArray(c.icd_codes) || Array.isArray(c.ccam_codes)) && (
                    <div className="text-xs text-gray-600 mt-1">
                      {Array.isArray(c.icd_codes) && c.icd_codes.length > 0 && (
                        <span className="mr-3">
                          ICD : {c.icd_codes.join(", ")}
                        </span>
                      )}
                      {Array.isArray(c.ccam_codes) && c.ccam_codes.length > 0 && (
                        <span>
                          CCAM : {c.ccam_codes.join(", ")}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Médicaments */}
                  {Array.isArray(c.medications) && c.medications.length > 0 && (
                    <div className="text-xs text-gray-700 mt-1">
                      Médicaments : {c.medications.join(", ")}
                    </div>
                  )}
                </div>

                <div className="text-right text-sm shrink-0">
                  <div className="uppercase text-gray-500">
                    {c.status || "—"}
                  </div>
                  <div className="font-semibold">
                    {c.amount ? `${c.amount.toLocaleString()} FCFA` : "—"}
                  </div>

                  {c.pdf_url && (
                    <a
                      href={c.pdf_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 underline mt-1 inline-block"
                    >
                      PDF
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Résumé dernière consultation */}
      {lastConsult && (
        <section className="p-4 bg-white rounded shadow space-y-3">
          <h2 className="font-semibold">Dernière consultation (résumé rapide)</h2>

          <div className="text-sm text-gray-700">
            <div><b>Date :</b> {new Date(lastConsult.created_at).toLocaleString()}</div>
            <div><b>Diagnostic :</b> {lastConsult.diagnosis || "—"}</div>
            <div><b>Symptômes :</b> {lastConsult.symptoms || "—"}</div>
          </div>

          {/* Actes = CCAM */}
          <div>
            <h3 className="font-semibold mb-1">Actes réalisés (CCAM)</h3>
            {lastCcam.length > 0 ? (
              <ul className="list-disc pl-5 text-sm text-gray-700">
                {lastCcam.map((code, i) => (
                  <li key={i}>{code}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">Aucun acte CCAM saisi.</p>
            )}
          </div>

          {/* ICD */}
          <div>
            <h3 className="font-semibold mb-1">Codes diagnostics (ICD)</h3>
            {lastIcd.length > 0 ? (
              <ul className="list-disc pl-5 text-sm text-gray-700">
                {lastIcd.map((code, i) => (
                  <li key={i}>{code}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">Aucun code ICD saisi.</p>
            )}
          </div>

          {/* Médicaments */}
          <div>
            <h3 className="font-semibold mb-1">Médicaments</h3>
            {Array.isArray(lastConsult.medications) &&
            lastConsult.medications.length > 0 ? (
              <ul className="list-disc pl-5 text-sm text-gray-700">
                {lastConsult.medications.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">Aucun médicament saisi.</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}