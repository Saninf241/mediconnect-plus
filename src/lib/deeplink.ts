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
  const redirectUrl = `${opts.redirectOriginForPhone}${opts.redirectPath}`;

  const qp = new URLSearchParams({
    redirect_url: redirectUrl,
    clinic_id: opts.clinicId,
    operator_id: opts.operatorId,
    source: "web",
    v: "1",
  });
  if (opts.patientId) qp.set("patient_id", opts.patientId);
  if (opts.consultationId) qp.set("consultation_id", opts.consultationId);

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
