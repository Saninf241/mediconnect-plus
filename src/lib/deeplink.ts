// src/lib/deeplink.ts
type DeeplinkOpts = {
  mode: "enroll" | "identify";
  clinicId: string;
  operatorId: string;
  patientId: string;
  redirectOriginForPhone: string; // ex: https://app.mediconnect.plus ou http://192.168.1.42:5173
  redirectPath: string;           // ex: /fp-callback
};

const ANDROID_PACKAGE = "com.example.zkfinger10demo"; // ← ton package

export function buildZKDeeplink(opts: DeeplinkOpts) {
  const {
    mode,
    clinicId,
    operatorId,
    patientId,
    redirectOriginForPhone,
    redirectPath,
  } = opts;

  const q = new URLSearchParams({
    clinic_id: clinicId,
    operator_id: operatorId,
    patient_id: patientId,
    redirect_url: `${redirectOriginForPhone.replace(/\/$/, "")}${redirectPath}`,
  }).toString();

  // 1) Schéma custom (si ton appli a bien `intent-filter` sur le scheme "zkfp")
  const deeplink = `zkfp://${mode}?${q}`;

  // 2) Fallback Chrome: intent:// + package EXACT
  const intentUri =
    `intent://${mode}?${q}` +
    `#Intent;scheme=zkfp;package=${ANDROID_PACKAGE};end`;

  return { deeplink, intentUri };
}

