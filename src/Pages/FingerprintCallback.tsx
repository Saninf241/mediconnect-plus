// src/Pages/FingerprintCallback.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function computeBack(scope: string, stored: string | null): string {
  const secretaryBaseMulti = "/multispecialist/secretary";
  const secretaryBaseSpecialist = "/specialist/secretary";
  const doctorMultiBase = "/multispecialist/doctor";
  const doctorSpecBase = "/doctor";

  console.log("[FP] computeBack scope=", scope, "stored=", stored);

  if (scope === "secretary") {
    if (
      stored &&
      (stored.startsWith(secretaryBaseMulti) || stored.startsWith(secretaryBaseSpecialist))
    )
      return stored;
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
    const consultationId = url.searchParams.get("consultation_id");

    const mode        = url.searchParams.get("mode");     // "enroll" | "identify"
    const status      = url.searchParams.get("status");
    const found       = url.searchParams.get("found");
    const patientId   = url.searchParams.get("patient_id");
    const userId      = url.searchParams.get("user_id");
    // Compat legacy: certains anciens flows renvoyaient le template brut sous "template_hash"
    const templateB64 = url.searchParams.get("template_b64") ||
                        url.searchParams.get("template_hash");
    const error       = url.searchParams.get("error");

    // fp:return (même onglet) sinon paramètre ?return= de l'URL (nouvel
    // onglet sur mobile). Chemin interne uniquement : navigate() reste sur
    // ce domaine, mais on refuse quand même tout ce qui n'est pas "/...".
    const urlReturnRaw = url.searchParams.get("return");
    const urlReturn =
      urlReturnRaw && urlReturnRaw.startsWith("/") && !urlReturnRaw.startsWith("//")
        ? urlReturnRaw
        : null;
    const storedReturn = sessionStorage.getItem("fp:return") || urlReturn;

    // 1️⃣ Déduire le scope : paramètre ?scope=… OU préfixe de fp:return
    let scope = url.searchParams.get("scope") || undefined;

    if (!scope && storedReturn) {
      if (storedReturn.startsWith("/multispecialist/doctor")) {
        scope = "doctor_multi";
      } else if (storedReturn.startsWith("/doctor")) {
        scope = "doctor_specialist";
      } else if (
        storedReturn.startsWith("/multispecialist/secretary") ||
        storedReturn.startsWith("/specialist/secretary")
      ) {
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
        // Page de secours de Chrome (S.browser_fallback_url) : l'appli de
        // capture n'a pas pu être ouverte. Pas de résultat ici ; on ramène
        // l'utilisateur vers sa page pour relancer.
        setMessage(
          "L'application de capture ne s'est pas ouverte (ou a été fermée). Retour à la page précédente…"
        );
        if (storedReturn) {
          setTimeout(() => navigate(storedReturn, { replace: true }), 1500);
        }
        return;
      }

      if (mode === "enroll") {
        // Defense en profondeur : le deep link de retour n'est pas
        // authentifie (n'importe qui peut construire une URL vers cette
        // page avec un patient_id de son choix). On verifie que ce
        // patient_id correspond bien a celui que CETTE session a demande
        // d'enroler (memorise par buildZKDeeplink au moment du depart),
        // en plus des policies RLS qui restent le rempart principal.
        let expectedPatientId: string | null = null;
        try {
          expectedPatientId = sessionStorage.getItem("fp:expected_patient_id");
          sessionStorage.removeItem("fp:expected_patient_id");
          // Nouvel onglet (mobile) : copie localStorage, valable 30 min.
          const shared = localStorage.getItem("fp:expected_patient_id");
          localStorage.removeItem("fp:expected_patient_id");
          if (!expectedPatientId && shared) {
            const parsed = JSON.parse(shared);
            if (parsed?.id && Date.now() - Number(parsed.ts) < 30 * 60 * 1000) {
              expectedPatientId = parsed.id;
            }
          }
        } catch {}

        const patientMismatch =
          !!patientId && !!expectedPatientId && patientId !== expectedPatientId;

        const ok = status === "captured" && !!patientId && !patientMismatch;

        try {
          sessionStorage.setItem(
            "fp:last",
            JSON.stringify({
              type: "enroll",
              ok,
              patient_id: patientId || null,
              template_b64: templateB64 || null,
              error: patientMismatch ? "patient_mismatch" : error || null,
            })
          );
        } catch {}

        if (patientMismatch) {
          console.error("[FP] patient_id du callback ne correspond pas à la demande envoyée", {
            patientId,
            expectedPatientId,
          });
        }

        if (ok) {
          // La colonne patients.fingerprint_hash n'existe pas : l'ancien
          // update échouait donc en entier (et fingerprint_enrolled restait
          // false). Le gabarit est stocké côté serveur dans
          // patient_biometrics par l'appli (biometrics-enroll).
          const { error: flagErr } = await supabase
            .from("patients")
            .update({
              fingerprint_enrolled: true,
              fingerprint_missing: false,
            })
            .eq("id", patientId!);
          if (flagErr) console.error("[FP] maj patients.fingerprint_enrolled échouée:", flagErr);

          setMessage("Empreinte enregistrée avec succès ✅");
        } else {
          setMessage(
            patientMismatch
              ? "Échec capture : réponse invalide (patient non concordant)."
              : `Échec capture : ${error || "Aucune donnée reçue."}`
          );
        }

        sessionStorage.removeItem("fp:return");
        // fp_reason : code d'échec renvoyé par l'appli (different_finger,
        // already_enrolled, enroll_fail...) pour un message précis côté wizard.
        const suffix = ok
          ? "?fp=captured"
          : `?fp=error${error ? `&fp_reason=${encodeURIComponent(error)}` : ""}`;
        // back peut déjà contenir une query string -> "&" au lieu de "?".
        const enrollTarget = back.includes("?") ? back + "&" + suffix.slice(1) : back + suffix;
        setTimeout(() => navigate(enrollTarget, { replace: true }), 600);
        return;
      }

       if (mode === "identify") {
        const identifiedPatientId = patientId || userId;
        const ok = found === "true" && !!identifiedPatientId;
        // L'appli renvoie error="identify_fail_ret_X" quand le doigt ne
        // correspond à personne (vrai "non trouvé"). Tout autre code
        // (templates_load_failed_...) est une erreur technique : on ne doit
        // PAS le présenter comme "aucun patient", sinon la secrétaire
        // créerait un doublon.
        const technicalError = !ok && !!error && !error.startsWith("identify_fail");
        const failParam = technicalError ? "id_error" : "id_not_found";
        const failMessage = technicalError
          ? "Vérification impossible (chargement des empreintes)."
          : "Aucun patient reconnu correspondant.";

        try {
          sessionStorage.setItem(
            "fp:last",
            JSON.stringify({
              type: "identify",
              ok,
              patient_id: ok ? identifiedPatientId : null,
              // snake_case : clé lue par NewConsultationPage (last.consultation_id)
              consultation_id: ok ? consultationId || null : null,
              error: error || null,
            })
          );
        } catch {}
        
        // récupère la page d'ou l'on vient
        if (scope === "doctor_multi") { 
          const dest = new URL( "/multispecialist/doctor/new-consultation", window.location.origin);

        if (ok) {
          setMessage("Patient reconnu ✅");

          dest.searchParams.set("patient_id", identifiedPatientId!);

        } else {
          setMessage(failMessage);

          dest.searchParams.set(failParam, "1");
              }

          sessionStorage.removeItem("fp:return");
          setTimeout(
            () =>
              navigate(
                dest.pathname + dest.search, { replace: true }),
            ok ? 600 : 900
          );
          return;
        }

        if (scope === "doctor_specialist") {
        const dest = new URL("/doctor/new-act", window.location.origin);

        if (ok) {
          setMessage("Patient reconnu ✅");
          dest.searchParams.set("patient_id", identifiedPatientId!);
        } else {
          setMessage(failMessage);
          dest.searchParams.set(failParam, "1");
        }

        sessionStorage.removeItem("fp:return");
        setTimeout(
          () => navigate(dest.pathname + dest.search, { replace: true }),
          ok ? 600 : 900
        );
        return;
      }

        const back = computeBack(scope!, storedReturn);
        const sep = back.includes("?") ? "&" : "?";

        if (ok) {
          setMessage("Patient reconnu ✅");
          sessionStorage.removeItem("fp:return");
          setTimeout(
            () => navigate(`${back}${sep}id_found=${encodeURIComponent(identifiedPatientId!)}`,
              { replace: true }),   
            600
          );
        } else {
          setMessage(failMessage);
          setTimeout(
            () => navigate(`${back}${sep}${failParam}=1`, 
              { replace: true }),
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