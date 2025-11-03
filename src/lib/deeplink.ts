// src/lib/deeplink.ts
export function buildZKDeeplink(opts: {
  mode: "enroll" | "identify";
  clinicId: string;
  operatorId?: string;
  patientId?: string;            // pour enroll
  consultationId?: string;       // pour identify
  redirectOriginForPhone: string;
  redirectPath: string;
}) {
  const redirectUrl = `${opts.redirectOriginForPhone}${opts.redirectPath}`;
  const qp = new URLSearchParams({
    redirect_url: redirectUrl,
    clinic_id: opts.clinicId,
    source: "web",
    v: "1",
  });
  if (opts.operatorId)   qp.set("operator_id", opts.operatorId);
  if (opts.patientId)    qp.set("patient_id", opts.patientId);
  if (opts.consultationId) qp.set("consultation_id", opts.consultationId);

  const deeplink  = `mediconnect://fingerprint/${opts.mode}?${qp.toString()}`;
  const intentUri =
    `intent://fingerprint/${opts.mode}?${qp.toString()}` +
    `#Intent;scheme=mediconnect;package=com.example.zkfinger10demo;` +
    `S.browser_fallback_url=${encodeURIComponent(redirectUrl)};end`;

  return { deeplink, intentUri };
}
