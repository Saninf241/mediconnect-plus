// src/lib/deeplink.ts
const PKG = "com.example.zkfinger10demo"; // ✨ ton package APK actuel

export function buildZKDeeplink(opts: {
  mode: "enroll" | "identify";
  clinicId: string;
  operatorId: string;
  patientId?: string;     // pour enroll
  consultationId?: string;    // pour identify 
  redirectOriginForPhone: string;
  redirectPath: string;
}) {
  // Page à laquelle revenir, aussi transmise DANS l'URL de retour : sur
  // mobile (ex. Samsung S25), Android rouvre le callback dans un NOUVEL
  // onglet, où le sessionStorage (fp:return) est vide. Sans ce paramètre,
  // FingerprintCallback retombait sur un espace par défaut
  // (/multispecialist/secretary/new) -> "accès refusé" pour un secrétaire
  // de cabinet spécialiste. L'appli Android conserve les paramètres
  // existants de redirect_url (Uri.buildUpon).
  const returnPath = window.location.pathname + window.location.search;
  const redirectBase = `${opts.redirectOriginForPhone}${opts.redirectPath}`;
  const redirectUrl =
    redirectBase +
    (redirectBase.includes("?") ? "&" : "?") +
    `return=${encodeURIComponent(returnPath)}`;

  const qp = new URLSearchParams({
    redirect_url: redirectUrl,
    clinic_id: opts.clinicId,
    operator_id: opts.operatorId,
    source: "web",
    v: "1",
  });
  if (opts.patientId) qp.set("patient_id", opts.patientId);
  if (opts.consultationId) qp.set("consultation_id", opts.consultationId);

  // Defense en profondeur (en plus des policies RLS) : FingerprintCallback
  // fait confiance a patient_id lu depuis l'URL de retour pour ecrire en
  // base. Comme ce retour transite par un deep link non authentifie, on
  // memorise ici le patient_id que CETTE session a reellement demande
  // d'enroler, pour que le callback puisse verifier que la reponse
  // correspond bien a la demande envoyee, pas a une URL forgee a la main.
  if (opts.mode === "enroll" && opts.patientId) {
    try {
      sessionStorage.setItem("fp:expected_patient_id", opts.patientId);
      // Copie partagée entre onglets (retour dans un nouvel onglet sur mobile).
      localStorage.setItem(
        "fp:expected_patient_id",
        JSON.stringify({ id: opts.patientId, ts: Date.now() })
      );
    } catch {}
  }

  // schéma custom
  const deeplink = `mediconnect://fingerprint/${opts.mode}?${qp.toString()}`;

  // Intent URI avec EXTRAS (S.<key>=string)
  const intentUri =
    `intent://fingerprint/${opts.mode}?${qp.toString()}` +
    `#Intent;scheme=mediconnect;package=${PKG};` +
    `S.mode=${opts.mode};` +
    (opts.patientId ? `S.patient_id=${opts.patientId};` : "") +
    `S.operator_id=${opts.operatorId};` +
    `S.clinic_id=${opts.clinicId};` +
    `S.redirect_url=${encodeURIComponent(redirectUrl)};` +
    `S.browser_fallback_url=${encodeURIComponent(redirectUrl)};end`;

  return { deeplink, intentUri };
}
