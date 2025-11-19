// src/Pages/FingerprintCallback.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function FingerprintCallback() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Lecture en cours...");

  useEffect(() => {
    const url = new URL(window.location.href);

    const mode        = url.searchParams.get("mode");            // "enroll" | "identify"
    const status      = url.searchParams.get("status");          // "captured" | "error"
    const found       = url.searchParams.get("found");           // "true" | "false"
    const patientId   = url.searchParams.get("patient_id");
    const userId      = url.searchParams.get("user_id");         // = patient_id renvoyé en identify
    const templateB64 = url.searchParams.get("template_b64") ||
                        url.searchParams.get("template_hash");
    const error       = url.searchParams.get("error");

    // ⚠️ NOUVEAU : scope indique d’où on vient
    // secretary | doctor_multi | doctor_specialist
    const scope       = url.searchParams.get("scope") || "secretary";

    // Choix du fallback par scope (si fp:return absent, ou autre navigateur)
    let fallbackPath = "/multispecialist/secretary/new";
    if (scope === "doctor_multi") {
      fallbackPath = "/multispecialist/doctor/new-consultation";
    } else if (scope === "doctor_specialist") {
      // adapte ce path à ta vraie route docteur simple si besoin
      fallbackPath = "/doctor/new-act";
    }

    async function handleResult() {
      if (!mode) {
        setMessage("Paramètre 'mode' manquant.");
        return;
      }

      // route de retour : sessionStorage > fallback calculé
      const back = sessionStorage.getItem("fp:return") || fallbackPath;

      if (mode === "enroll") {
        const ok = status === "captured" && !!patientId;

        // 1) mémo pour le wizard
        try {
          sessionStorage.setItem(
            "fp:last",
            JSON.stringify({
              type: "enroll",
              ok,
              patient_id: patientId || null,
              template_b64: templateB64 || null,
              error: error || null,
            })
          );
        } catch {}

        // 2) mise à jour patient
        if (ok) {
          await supabase
            .from("patients")
            .update({
              fingerprint_enrolled: true,
              fingerprint_missing: false,
              fingerprint_hash: templateB64 || null,
            })
            .eq("id", patientId!);

          setMessage("Empreinte enregistrée avec succès ✅");
        } else {
          setMessage(`Échec capture : ${error || "Aucune donnée reçue."}`);
        }

        // 3) retour
        sessionStorage.removeItem("fp:return");
        const suffix = ok ? "?fp=captured" : "?fp=error";
        setTimeout(() => navigate(back + suffix, { replace: true }), 600);
        return;
      }

      if (mode === "identify") {
        const ok = found === "true" && !!userId;

        // 1) mémo d’identification
        try {
          sessionStorage.setItem(
            "fp:last",
            JSON.stringify({
              type: "identify",
              ok,
              patient_id: ok ? userId : null,
              error: error || null,
            })
          );
        } catch {}

        // 2) message + redirection
        if (ok) {
          setMessage("Patient reconnu ✅");
          sessionStorage.removeItem("fp:return");

          // on ajoute un flag dans l’URL de retour
          const sep = back.includes("?") ? "&" : "?";
          setTimeout(
            () => navigate(`${back}${sep}id_found=${encodeURIComponent(userId!)}`, { replace: true }),
            600
          );
        } else {
          setMessage("Aucun patient correspondant.");
          const sep = back.includes("?") ? "&" : "?";
          setTimeout(
            () => navigate(`${back}${sep}id_not_found=1`, { replace: true }),
            900
          );
        }
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
