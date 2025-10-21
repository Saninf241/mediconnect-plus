// src/lib/deeplink.ts
export function buildZKDeeplink(opts: {
  mode: "enroll" | "identify";
  clinicId: string;
  operatorId: string;
  patientId?: string;
  redirectOriginForPhone: string;
  redirectPath: string;
}) {
  const redirectUrl = `${opts.redirectOriginForPhone}${opts.redirectPath}`;

  const qp = new URLSearchParams({
    redirect_url: redirectUrl,
    clinic_id: opts.clinicId,
    operator_id: opts.operatorId,
    source: "web",
    v: "1", // version de protocole, pour évoluer sans casse
  });
  if (opts.patientId) qp.set("patient_id", opts.patientId);

  const deeplink   = `mediconnect://fingerprint/${opts.mode}?${qp.toString()}`;
  const intentUri  =
    `intent://fingerprint/${opts.mode}?${qp.toString()}` +
    `#Intent;scheme=mediconnect;package=com.example.zkfinger10demo;` +
    `S.browser_fallback_url=${encodeURIComponent(redirectUrl)};end`;

  return { deeplink, intentUri };
}
