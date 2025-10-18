// src/Pages/FingerprintCallback.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function FingerprintCallback() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Lecture en cours...");

  useEffect(() => {
    const url = new URL(window.location.href);
    const mode        = url.searchParams.get("mode");           // "enroll" | "identify"
    const status      = url.searchParams.get("status");         // "captured" | "error"
    const patientId   = url.searchParams.get("patient_id");
    const templateHash= url.searchParams.get("template_hash");
    const error       = url.searchParams.get("error");

    async function handleResult() {
      if (!mode) {
        setMessage("Paramètre 'mode' manquant.");
        return;
      }

      // Par défaut, on revient sur le wizard "Ajouter un patient"
      const fallbackPath = "/multispecialist/secretary/new";
      const back = sessionStorage.getItem("fp:return") || fallbackPath;

      if (mode === "enroll") {
        const ok = status === "captured" && !!patientId;

        // 1) Mémo pour le wizard
        sessionStorage.setItem(
          "fp:last",
          JSON.stringify({
            type: "enroll",
            ok,
            patient_id: patientId || null,
            template_hash: templateHash || null,
            error: error || null,
          })
        );

        // 2) Mise à jour Supabase côté patient si succès
        if (ok) {
          await supabase
            .from("patients")
            .update({
              fingerprint_enrolled: true,
              fingerprint_missing: false,
              fingerprint_hash: templateHash || null,
            })
            .eq("id", patientId!);
          setMessage("Empreinte enregistrée avec succès ✅");
        } else {
          setMessage(`Échec capture : ${error || "Aucune donnée reçue."}`);
        }

        // 3) Revenir à la page d'origine (ou fallback) avec un flag visuel
        const suffix = ok ? "?fp=captured" : "?fp=error";
        sessionStorage.removeItem("fp:return");
        setTimeout(() => {
          // navigate remplace l'historique pour éviter “back” qui rejoue le callback
          navigate(back + suffix, { replace: true });
        }, 800);
        return;
      }

      if (mode === "identify") {
        setMessage("Mode identification reçu (non encore implémenté).");
        return;
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

