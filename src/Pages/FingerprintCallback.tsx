// src/Pages/FingerprintCallback.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function computeBack(scope: string, stored: string | null): string {
  const secretaryBase = "/multispecialist/secretary";
  const doctorMultiBase = "/multispecialist/doctor";
  const doctorSpecBase = "/doctor";

  console.log("[FP] computeBack scope=", scope, "stored=", stored);

  if (scope === "secretary") {
    if (stored && stored.startsWith(secretaryBase)) return stored;
    return "/multispecialist/secretary/new";
  }

  if (scope === "doctor_multi") {
    if (stored && stored.startsWith(doctorMultiBase)) return stored;
    return "/multispecialist/doctor/new-consultation";
  }

  if (scope === "doctor_specialist") {
    if (stored && stored.startsWith(doctorSpecBase)) return stored;
    return "/doctor/new-act";
  }

  // scope inconnu → on reste ultra sécure
  if (stored) return stored;
  return "/multispecialist/secretary/new";
}

export default function FingerprintCallback() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Lecture en cours...");

  useEffect(() => {
    const url = new URL(window.location.href);

    const mode        = url.searchParams.get("mode");     // "enroll" | "identify"
    const status      = url.searchParams.get("status");
    const found       = url.searchParams.get("found");
    const patientId   = url.searchParams.get("patient_id");
    const userId      = url.searchParams.get("user_id");
    const templateB64 = url.searchParams.get("template_b64") ||
                        url.searchParams.get("template_hash");
    const error       = url.searchParams.get("error");

    const storedReturn = sessionStorage.getItem("fp:return");

    // 1️⃣ Déduire le scope : paramètre ?scope=… OU préfixe de fp:return
    let scope = url.searchParams.get("scope") || undefined;

    if (!scope && storedReturn) {
      if (storedReturn.startsWith("/multispecialist/doctor")) {
        scope = "doctor_multi";
      } else if (storedReturn.startsWith("/doctor")) {
        scope = "doctor_specialist";
      } else if (storedReturn.startsWith("/multispecialist/secretary")) {
        scope = "secretary";
      }
    }
    if (!scope) scope = "secretary"; // valeur par défaut

    console.log("[FP] callback URL =", url.toString());
    console.log("[FP] params:", { mode, status, found, patientId, userId, scope, error });
    console.log("[FP] stored fp:return =", storedReturn);

    async function handleResult() {
      const back = computeBack(scope!, storedReturn);
      console.log("[FP] back destination =", back);

      if (!mode) {
        // On NE bouge pas de page, juste message (l'autre appel au callback fera le job)
        setMessage("Paramètre 'mode' manquant (appel partiel).");
        return;
      }

      if (mode === "enroll") {
        const ok = status === "captured" && !!patientId;

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

        sessionStorage.removeItem("fp:return");
        const suffix = ok ? "?fp=captured" : "?fp=error";
        setTimeout(() => navigate(back + suffix, { replace: true }), 600);
        return;
      }

      if (mode === "identify") {
        const ok = found === "true" && !!userId;

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
        
        // récupère la page d'ou l'on vient
        const back = computeBack(scope!, storedReturn);

        const dest = new URL(back, window.location.origin);

        if (ok) {
          setMessage("Patient reconnu ✅");
          sessionStorage.removeItem("fp:return");

          setTimeout(
            () =>
              navigate(
                dest.pathname + dest.search, { replace: true }),
            600
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