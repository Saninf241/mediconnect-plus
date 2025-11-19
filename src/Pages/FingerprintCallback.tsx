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

  // scope inconnu → on reste ultra sécure : secrétaire
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
    const scope       = url.searchParams.get("scope") || "secretary";

    console.log("[FP] callback URL =", url.toString());
    console.log("[FP] params:", { mode, status, found, patientId, userId, scope, error });

    async function handleResult() {
      if (!mode) {
        setMessage("Paramètre 'mode' manquant.");
        return;
      }

      const stored = sessionStorage.getItem("fp:return");
      const back   = computeBack(scope, stored);

      console.log("[FP] back destination =", back);

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

        const sep = back.includes("?") ? "&" : "?";

        if (ok) {
          setMessage("Patient reconnu ✅");
          sessionStorage.removeItem("fp:return");

          setTimeout(
            () =>
              navigate(
                `${back}${sep}id_found=${encodeURIComponent(userId!)}`,
                { replace: true }
              ),
            600
          );
        } else {
          setMessage("Aucun patient correspondant.");
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