// src/Pages/FingerprintCallback.tsx
import React from "react";
import { buildZKDeeplink } from "../../lib/deeplink";

export type ScanMode = "enroll" | "verify";

export interface ScanFingerprintButtonProps {
  mode: ScanMode;
  clinicId: string;
  operatorId: string;
  patientId: string;
  redirectOriginForPhone?: string;
  redirectPath?: string; // défaut "/fp-callback"
  className?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}

const ScanFingerprintButton: React.FC<ScanFingerprintButtonProps> = ({
  mode,
  clinicId,
  operatorId,
  patientId,
  redirectOriginForPhone,
  redirectPath = "/fp-callback",
  className = "px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50",
  disabled,
  children,
}) => {
  const origin =
    redirectOriginForPhone ||
    (window.location.origin.includes("localhost")
      ? (import.meta.env.VITE_LAN_ORIGIN as string) || window.location.origin
      : (import.meta.env.VITE_PROD_ORIGIN as string) || window.location.origin);

  const handleClick = () => {
    const { deeplink, intentUri } = buildZKDeeplink({
      mode,
      clinicId,
      operatorId,
      patientId,
      redirectOriginForPhone: origin,
      redirectPath,
    });
    window.location.href = deeplink || intentUri;
  };

  return (
    <button onClick={handleClick} className={className} disabled={disabled}>
      {children ?? (mode === "enroll" ? "Scanner l’empreinte" : "Vérifier l’empreinte")}
    </button>
  );
};

export default ScanFingerprintButton;
