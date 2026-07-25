// src/components/ui/uidoctor/PatientRecordModal.tsx
// Consultation d'un dossier patient EN COURS de saisie d'une nouvelle
// consultation, sans quitter le formulaire en cours (non sauvegardé tant
// que le médecin n'a pas soumis). Remplace l'ancien window.open(_blank)
// qui laissait le dossier (données médicales) affiché indéfiniment dans un
// onglet séparé, y compris après la soumission — risque de confidentialité
// sur un poste partagé. Une modale se démonte proprement à la fermeture et
// ne fetch rien tant qu'elle n'est pas ouverte.
import { Fragment, useEffect, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { supabase } from "../../../lib/supabase";

interface Props {
  patientId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

type Patient = {
  id: string;
  name?: string | null;
  date_of_birth?: string | null;
  is_assured?: boolean | null;
  medical_history?: string | null;
};

type Consultation = {
  id: string;
  created_at: string;
  diagnosis: string | null;
  symptoms: string | null;
  amount: number | null;
  status: string | null;
  diagnosis_code_text: string | null;
};

type ActiveMembership = {
  member_no: string | null;
  plan_code: string | null;
  insurers?: { name?: string | null } | null;
};

function calcAge(dateOfBirth?: string | null) {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return null;
  const diff = Date.now() - dob.getTime();
  return Math.abs(new Date(diff).getUTCFullYear() - 1970);
}

export default function PatientRecordModal({ patientId, isOpen, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [membership, setMembership] = useState<ActiveMembership | null>(null);

  useEffect(() => {
    if (!isOpen || !patientId) return;

    let alive = true;
    setLoading(true);

    (async () => {
      const [patientRes, consultationsRes, membershipRes] = await Promise.all([
        supabase.from("patients").select("id, name, date_of_birth, is_assured, medical_history").eq("id", patientId).maybeSingle(),
        supabase
          .from("consultations")
          .select("id, created_at, diagnosis, symptoms, amount, status, diagnosis_code_text")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("insurer_memberships")
          .select("member_no, plan_code, insurers(name)")
          .eq("patient_id", patientId)
          .eq("is_active", true)
          .eq("status", "active")
          .order("last_verified_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (!alive) return;
      setPatient((patientRes.data as Patient) ?? null);
      setConsultations((consultationsRes.data as Consultation[]) ?? []);
      setMembership((membershipRes.data as ActiveMembership) ?? null);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [isOpen, patientId]);

  // Rien ne doit rester en mémoire une fois la modale fermée.
  useEffect(() => {
    if (!isOpen) {
      setPatient(null);
      setConsultations([]);
      setMembership(null);
    }
  }, [isOpen]);

  const age = calcAge(patient?.date_of_birth);
  const isAssured = !!membership || patient?.is_assured === true;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl max-h-[85vh] overflow-y-auto transform rounded-xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title as="h3" className="text-lg font-semibold text-gray-900">
                    Dossier patient
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-sm text-gray-500 hover:text-gray-800"
                  >
                    Fermer ✕
                  </button>
                </div>

                {loading ? (
                  <p className="text-sm text-gray-500">Chargement…</p>
                ) : !patient ? (
                  <p className="text-sm text-gray-500">Patient introuvable.</p>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xl font-bold text-gray-900">{patient.name || "Patient sans nom"}</h4>
                      <div className="flex gap-4 mt-1 text-sm text-gray-600">
                        <span>{age !== null ? `${age} ans` : "Âge inconnu"}</span>
                        <span>{isAssured ? "Assuré" : "Non assuré"}</span>
                        <span>{consultations.length} consultation(s) récente(s)</span>
                      </div>
                    </div>

                    {isAssured && (
                      <div className="rounded-lg bg-gray-50 border p-3 text-sm space-y-1">
                        <p><span className="font-medium">Assureur :</span> {membership?.insurers?.name || "—"}</p>
                        <p><span className="font-medium">N° adhérent :</span> {membership?.member_no || "—"}</p>
                        <p><span className="font-medium">Plan :</span> {membership?.plan_code || "—"}</p>
                      </div>
                    )}

                    {patient.medical_history && (
                      <div className="rounded-lg bg-gray-50 border p-3 text-sm">
                        <span className="font-medium">Antécédents :</span> {patient.medical_history}
                      </div>
                    )}

                    <div>
                      <h5 className="font-semibold text-sm mb-2">Historique récent</h5>
                      {consultations.length === 0 ? (
                        <p className="text-sm text-gray-500">Aucune consultation enregistrée.</p>
                      ) : (
                        <div className="divide-y border rounded-lg">
                          {consultations.map((c) => (
                            <div key={c.id} className="p-3 text-sm">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">
                                  {new Date(c.created_at).toLocaleDateString("fr-FR")}
                                </span>
                                <span className="text-xs uppercase text-gray-500">{c.status || "—"}</span>
                              </div>
                              <div className="font-medium">{c.diagnosis || c.diagnosis_code_text || "Diagnostic non renseigné"}</div>
                              {c.symptoms && <div className="text-xs text-gray-600 mt-0.5 line-clamp-2">{c.symptoms}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
