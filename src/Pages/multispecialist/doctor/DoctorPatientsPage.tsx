// src/Pages/multispecialist/doctor/DoctorPatientsPage.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import { supabase } from "../../../lib/supabase";
import { Button } from "../../../components/ui/button";

type Patient = {
  id: string;
  full_name: string;
  dob: string | null;
  phone: string | null;
  email: string | null;
  is_assured: boolean | null;
  insurer_id: string | null;
  fingerprint_enrolled: boolean | null;
  fingerprint_missing: boolean | null;
};

type Consultation = {
  id: string;
  created_at: string;
  diagnosis: string | null;
  amount: number | null;
  status: string;
  pdf_url: string | null;
};

export default function DoctorPatientsPage() {
  const { id } = useParams();                    // vient de /patients/:id
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);

  const returnUrl = searchParams.get("return");

  useEffect(() => {
    // Cas /patients simple sans ID : on ne charge rien
    if (!id) {
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);

      // 1) Infos patient
      const { data: p, error: pErr } = await supabase
        .from("patients")
        .select(
          "id, full_name, dob, phone, email, is_assured, insurer_id, fingerprint_enrolled, fingerprint_missing"
        )
        .eq("id", id)
        .maybeSingle();

      if (pErr) {
        console.error(pErr);
      }
      setPatient(p || null);

      // 2) Historique consultations
      const { data: cons, error: cErr } = await supabase
        .from("consultations")
        .select("id, created_at, diagnosis, amount, status, pdf_url")
        .eq("patient_id", id)
        .order("created_at", { ascending: false });

      if (cErr) {
        console.error(cErr);
        setConsultations([]);
      } else {
        setConsultations(cons || []);
      }

      setLoading(false);
    })();
  }, [id]);

  // -------- Cas /patients (sans :id) --------
  if (!id) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Mes patients</h1>
        <p className="text-sm text-gray-600">
          Sélectionnez un patient depuis la page de consultation (via empreinte) pour voir son dossier,
          ou utilisez la future liste des patients.
        </p>
      </div>
    );
  }

  // -------- État chargement --------
  if (loading) {
    return (
      <div className="p-6">
        <p>Chargement du dossier patient...</p>
      </div>
    );
  }

  // -------- Patient introuvable --------
  if (!patient) {
    return (
      <div className="p-6 space-y-3">
        <h1 className="text-2xl font-bold">Dossier patient</h1>
        <p className="text-red-600 text-sm">Patient introuvable.</p>
        {returnUrl && (
          <Button onClick={() => navigate(returnUrl)}>
            Revenir à la consultation
          </Button>
        )}
      </div>
    );
  }

  const hasHistory = consultations.length > 0;

  // -------- Dossier patient complet --------
  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{patient.full_name}</h1>
          <p className="text-sm text-gray-600">
            {patient.dob && <>Né(e) le {patient.dob} · </>}
            {patient.phone && <>📞 {patient.phone} · </>}
            {patient.email && <>{patient.email}</>}
          </p>

          <div className="flex flex-wrap gap-2 mt-2 text-xs">
            <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
              {patient.is_assured ? "Assuré" : "Non assuré"}
            </span>

            {patient.fingerprint_enrolled && !patient.fingerprint_missing && (
              <span className="px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-100">
                Empreinte enregistrée
              </span>
            )}

            {patient.fingerprint_missing && (
              <span className="px-2 py-1 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-100">
                Empreinte manquante / à compléter
              </span>
            )}
          </div>
        </div>

        {returnUrl && (
          <Button onClick={() => navigate(returnUrl)}>
            ← Revenir à la consultation
          </Button>
        )}
      </header>

      {/* Bloc “dossier en cours de complétude” */}
      {!hasHistory && (
        <div className="p-4 rounded-lg border border-dashed border-gray-300 bg-gray-50">
          <p className="text-sm text-gray-700">
            Dossier en cours de complétude — aucune consultation enregistrée pour le moment.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Les prochaines consultations liées à ce patient apparaîtront automatiquement ici.
          </p>
        </div>
      )}

      {/* Historique si présent */}
      {hasHistory && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Historique des consultations</h2>

          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Date</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Diagnostic</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Montant</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Statut</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {consultations.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="px-3 py-2">
                      {new Date(c.created_at).toLocaleString("fr-FR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-3 py-2 max-w-xs truncate">
                      {c.diagnosis || (
                        <span className="text-gray-400 italic">Non renseigné</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {typeof c.amount === "number"
                        ? `${c.amount.toLocaleString("fr-FR")} FCFA`
                        : "-"}
                    </td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs">
                        {c.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {/* Adapte le path si ton route pour ConsultationDetails n'est pas celui-ci */}
                      <Link
                        to={`/multispecialist/doctor/consultations/${c.id}`}
                        className="text-blue-600 underline text-xs"
                      >
                        Voir la consultation
                      </Link>
                      {c.pdf_url && (
                        <a
                          href={c.pdf_url}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-2 text-xs text-gray-600 underline"
                        >
                          PDF
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}