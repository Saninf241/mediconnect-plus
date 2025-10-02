// src/lib/deeplink.ts
export function buildZKDeeplink(params: {
  mode: "enroll" | "match" | "verify"; // ton app mobile peut choisir quoi faire
  clinicId: string;
  operatorId: string;            // l'id staff (secrétaire), si utile côté app
  patientId?: string;            // pour verify/match d'un existant
  redirectOriginForPhone: string; // ex: http://192.168.1.42:5173 ou ton ngrok/public
  redirectPath: string;          // ex: "/fp-callback"
  extra?: Record<string, string | number | boolean>;
}) {
  const { mode, clinicId, operatorId, patientId, redirectOriginForPhone, redirectPath, extra } = params;

  const redirectTarget = `${redirectOriginForPhone}${redirectPath}`;
  const q = new URLSearchParams({
    mode,
    clinic_id: clinicId,
    operator_id: operatorId,
    ...(patientId ? { patient_id: patientId } : {}),
  });

  // tu peux ajouter des meta si besoin
  if (extra) {
    Object.entries(extra).forEach(([k, v]) => q.append(k, String(v)));
  }

  const redirectUrl = encodeURIComponent(`${redirectTarget}?${q.toString()}`);

  const apiKey = "mediconnect-prod-999-XyZ"; // si tu veux sécuriser côté app

  const deeplink =
    `mediconnect://scanfingerprint` +
    `?mode=${encodeURIComponent(mode)}` +
    `&clinic_id=${encodeURIComponent(clinicId)}` +
    `&operator_id=${encodeURIComponent(operatorId)}` +
    (patientId ? `&patient_id=${encodeURIComponent(patientId)}` : "") +
    `&redirect_url=${redirectUrl}` +
    `&api_key=${encodeURIComponent(apiKey)}`;

  const intentUri =
    `intent://scanfingerprint` +
    `?mode=${encodeURIComponent(mode)}` +
    `&clinic_id=${encodeURIComponent(clinicId)}` +
    `&operator_id=${encodeURIComponent(operatorId)}` +
    (patientId ? `&patient_id=${encodeURIComponent(patientId)}` : "") +
    `&redirect_url=${redirectUrl}` +
    `&api_key=${encodeURIComponent(apiKey)}` +
    `#Intent;scheme=mediconnect;package=com.example.zkfinger10demo;end`;

  return { deeplink, intentUri };
}
