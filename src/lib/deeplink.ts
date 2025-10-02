// src/lib/deeplink.ts
export function buildZKDeeplink(opts: {
  mode: "enroll" | "identify";
  clinicId: string;
  operatorId: string;
  patientId: string;
  redirectOriginForPhone: string; 
  redirectPath: string;           // ex: /fp-callback
}) {
  const retUrl = `${opts.redirectOriginForPhone}${opts.redirectPath}` +
    `?status=pending&patientId=${encodeURIComponent(opts.patientId)}`;

  // Schéma custom (si l’app le gère)
  const deeplink = `medi-zk9500://${opts.mode}` +
    `?clinicId=${encodeURIComponent(opts.clinicId)}` +
    `&operatorId=${encodeURIComponent(opts.operatorId)}` +
    `&patientId=${encodeURIComponent(opts.patientId)}` +
    `&return=${encodeURIComponent(retUrl)}`;

  // INTENT Android avec package *de ton app ZK9500*
  // et fallback qui renvoie au même URL (au pire on revient sur le web proprement).
  const intentUri =
    `intent://${opts.mode}#Intent;` +
    `scheme=medi-zk9500;` +
    `package=com.mediconnect.zk9500;` + // ← remplace par le package réel de ton APK
    `S.clinicId=${encodeURIComponent(opts.clinicId)};` +
    `S.operatorId=${encodeURIComponent(opts.operatorId)};` +
    `S.patientId=${encodeURIComponent(opts.patientId)};` +
    `S.return=${encodeURIComponent(retUrl)};` +
    `S.mode=${opts.mode};` +
    `S.browser_fallback_url=${encodeURIComponent(retUrl)};` +
    `end`;

  return { deeplink, intentUri };
}

