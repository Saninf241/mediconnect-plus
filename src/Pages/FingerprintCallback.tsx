// src/Pages/FingerprintCallback.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function FingerprintCallback() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Lecture en cours...");

  useEffect(() => {
    const url = new URL(window.location.href);
    const mode = url.searchParams.get("mode");
    const status = url.searchParams.get("status");
    const patientId = url.searchParams.get("patient_id");
    const templateHash = url.searchParams.get("template_hash");
    const error = url.searchParams.get("error");

    async function handleResult() {
      if (!mode) {
        setMessage("Paramètre 'mode' manquant.");
        return;
      }

      if (mode === "enroll") {
        if (status === "captured" && patientId) {
          // 🔹 Mise à jour Supabase : empreinte enregistrée
          await supabase
            .from("patients")
            .update({
              fingerprint_enrolled: true,
              fingerprint_missing: false,
              fingerprint_hash: templateHash || null,
            })
            .eq("id", patientId);

          // ✅ Message visuel
          setMessage("Empreinte enregistrée avec succès ✅");

          // ⏳ Attendre un peu, puis retourner à la page secrétaire
          setTimeout(() => {
            navigate("/multispecialist/secretary/new-patient?fp=captured");
          }, 1500);
        } else {
          setMessage(`Échec capture : ${error || "Aucune donnée reçue."}`);
        }
      } else if (mode === "identify") {
        // Pour plus tard
        setMessage("Mode identification reçu (non encore implémenté).");
      }
    }

    handleResult();
  }, [navigate]);

  return (
    <div className="p-6 text-center">
      <h1 className="text-2xl font-bold mb-3">Biométrie</h1>
      <p>{message}</p>
    </div>
  );
}

