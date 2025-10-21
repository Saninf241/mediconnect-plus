// src/lib/deeplink.ts
type DeeplinkArgs = {
  mode: "enroll" | "identify";
  clinicId: string;
  operatorId: string;
  patientId: string;
  redirectOriginForPhone: string; // ex: https://mediconnect-plus.com
  redirectPath: string;           // ex: /fp-callback
};

export function buildZKDeeplink(args: DeeplinkArgs) {
  const {
    mode, clinicId, operatorId, patientId,
    redirectOriginForPhone, redirectPath,
  } = args;

  // 1) URL de retour complète vers le web (ex: https://mediconnect-plus.com/fp-callback)
  const redirectUrl = new URL(redirectPath, redirectOriginForPhone).toString();
  const encRedirect = encodeURIComponent(redirectUrl);

  // 2) DEEPLINK (nouveau schéma/host que ton Manifest attend)
  const deeplink =
    `zkfinger://open?mode=${encodeURIComponent(mode)}` +
    `&patient_id=${encodeURIComponent(patientId)}` +
    `&operator_id=${encodeURIComponent(operatorId)}` +
    `&clinic_id=${encodeURIComponent(clinicId)}` +
    `&redirect_url=${encRedirect}`;

  // 3) (optionnel) Intent URI Android — utile sur certains navigateurs
  // NB: les "S.xxx" transportent des extras String.
  const intentUri =
    `intent://open` +
    `?mode=${encodeURIComponent(mode)}` +
    `&patient_id=${encodeURIComponent(patientId)}` +
    `&operator_id=${encodeURIComponent(operatorId)}` +
    `&clinic_id=${encodeURIComponent(clinicId)}` +
    `&redirect_url=${encRedirect}` +
    `#Intent;scheme=zkfinger;action=android.intent.action.VIEW;end`;

  return { deeplink, intentUri };
}
