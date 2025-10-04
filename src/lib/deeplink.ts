// src/lib/deeplink.ts
type BuildArgs = {
  mode: "enroll" | "identify";      // au besoin
  clinicId: string;
  operatorId: string;
  patientId: string;
  redirectOriginForPhone: string;   // ex: window.location.origin (prod) ou VITE_LAN_ORIGIN (dev sur S24)
  redirectPath: string;             // ex: "/fp-callback"
};

export function buildZKDeeplink(args: BuildArgs) {
  const {
    mode, clinicId, operatorId, patientId,
    redirectOriginForPhone, redirectPath
  } = args;

  // la page callback publique que l’app va rouvrir après scan
  const callbackUrl = `${redirectOriginForPhone}${redirectPath}`;

  // ⚠️ FAIRE CORRESPONDRE AU MANIFEST
  const SCHEME = "mediconnect";
  const HOST   = "scanfingerprint";
  const PKG    = "com.example.zkfinger10demo";

  const q = new URLSearchParams({
    mode,
    clinic_id: clinicId,
    operator_id: operatorId,
    patient_id: patientId,
    redirect_url: callbackUrl,   // l’app renverra ?...&status=...&patient_id=...
  }).toString();

  const deeplink  = `${SCHEME}://${HOST}?${q}`;
  const intentUri = `intent://${HOST}?${q}#Intent;scheme=${SCHEME};package=${PKG};end`;

  return { deeplink, intentUri };
}

