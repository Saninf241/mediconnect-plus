// src/Pages/FingerprintCallback.tsx
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function FingerprintCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [msg, setMsg] = useState("Traitement en cours...");

  useEffect(() => {
    (async () => {
      const status = params.get("status") || "ok";
      const mode = (params.get("mode") || "enroll") as "enroll" | "verify" | "match";
      const clinicId = params.get("clinic_id") || "";
      const operatorId = params.get("operator_id") || "";
      const patientId = params.get("patient_id") || undefined;
      const matchPatientId = params.get("match_patient_id") || undefined;

      const fpToken = params.get("fp_token") || params.get("fp_template_id"); // selon ton app

      if (status !== "ok") {
        setMsg(params.get("message") || "Opération annulée");
        return;
      }
      if (!fpToken) {
        setMsg("Aucune empreinte reçue.");
        return;
      }

      try {
        if (mode === "enroll") {
          // Cas 1 : on vient d’enrôler une empreinte pour un NOUVEAU patient.
          // L’UI secrétaire doit avoir créé le patient AVANT de cliquer “Scanner”.
          // Si patientId est présent → on attache l’empreinte à ce patient,
          // sinon on stocke dans un “staging” puis on associe après création (optionnel).
          if (!patientId) {
            setMsg("Patient inconnu (patient_id manquant).");
            return;
          }

          const { error } = await supabase
            .from("patient_fingerprints")
            .insert({ patient_id: patientId, fp_external_id: fpToken });
          if (error) throw error;

          setMsg("Empreinte enregistrée avec succès.");
          navigate(`/multispecialist/secretary/patients?added=${patientId}`, { replace: true });
          return;
        }

        if (mode === "verify") {
          // Cas 2 : on vérifie que l’empreinte correspond au patientId.
          // Ici c’est plutôt l’app mobile qui renvoie ok/ko, mais à défaut
          // tu peux juste enregistrer la tentative.
          setMsg("Vérification effectuée.");
          navigate(`/multispecialist/secretary/patients/${patientId}`, { replace: true });
          return;
        }

        if (mode === "match") {
          // Cas 3 : l’app a trouvé un patient existant
          if (!matchPatientId) {
            setMsg("Aucun patient correspondant.");
            return;
          }
          setMsg("Patient existant retrouvé.");
          navigate(`/multispecialist/secretary/patients/${matchPatientId}`, { replace: true });
          return;
        }
      } catch (e: any) {
        console.error(e);
        setMsg(e.message || "Erreur lors du traitement de l’empreinte.");
      }
    })();
  }, [params, navigate]);

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-2">Biométrie</h2>
      <p>{msg}</p>
    </div>
  );
}
