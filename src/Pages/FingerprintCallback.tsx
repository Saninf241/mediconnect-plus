// src/Pages/FingerprintCallback.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function FingerprintCallback() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Lecture en cours...");

  useEffect(() => {
    const url = new URL(window.location.href);

    const mode         = url.searchParams.get("mode");            // "enroll" | "identify"
    const status       = url.searchParams.get("status");          // "captured" | "error"
    const found        = url.searchParams.get("found");           // "true" | "false"
    const patientId    = url.searchParams.get("patient_id");
    const userId       = url.searchParams.get("user_id");         // = patient_id renvoyé par l’app en identify
    // compat: l’app peut envoyer template_b64 dans template_hash pour MVP
    const templateB64  = url.searchParams.get("template_b64")
                      || url.searchParams.get("template_hash");
    const error        = url.searchParams.get("error");

    async function handleResult() {
      if (!mode) {
        setMessage("Paramètre 'mode' manquant.");
        return;
      }

      // route de retour
      const fallbackPath = "/multispecialist/secretary/new";
      const back = sessionStorage.getItem("fp:return") || fallbackPath;

      if (mode === "enroll") {
        const ok = status === "captured" && !!patientId;

        // 1) mémo pour le wizard
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

        // 2) mise à jour patient (flags UI/DB)
        if (ok) {
          await supabase
            .from("patients")
            .update({
              fingerprint_enrolled: true,
              fingerprint_missing: false,
              // on garde fingerprint_hash pour compat si tu veux afficher quelque chose
              fingerprint_hash: templateB64 || null,
            })
            .eq("id", patientId!);

          setMessage("Empreinte enregistrée avec succès ✅");
        } else {
          setMessage(`Échec capture : ${error || "Aucune donnée reçue."}`);
        }

        // 3) retour
        const suffix = ok ? "?fp=captured" : "?fp=error";
        sessionStorage.removeItem("fp:return");
        setTimeout(() => navigate(back + suffix, { replace: true }), 600);
        return;
      }

      if (mode === "identify") {
        // expected: ?found=true&user_id=<patient_id>
        const ok = found === "true" && !!userId;

        // 1) mémo d’identification
        sessionStorage.setItem(
          "fp:last",
          JSON.stringify({
            type: "identify",
            ok,
            patient_id: ok ? userId : null,
            error: error || null,
          })
        );

        if (ok) {
          setMessage("Patient reconnu ✅");
          // Ici 2 options :
          // (a) retour au back (secrétaire) avec flag
          // (b) rediriger vers la page médecin/consultation pour ouvrir le dossier
          // Par défaut: retour avec flag
          sessionStorage.removeItem("fp:return");
          setTimeout(() => navigate(back + "?id_found=" + userId, { replace: true }), 600);
        } else {
          setMessage("Aucun patient correspondant.");
          setTimeout(() => navigate(back + "?id_not_found=1", { replace: true }), 900);
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

