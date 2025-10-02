import React from "react";
import { buildZKDeeplink } from "../../lib/deeplink";

type Mode = "enroll" | "identify";

export type ScanFingerprintButtonProps = {
  mode: Mode;
  clinicId: string;
  operatorId: string;
  patientId: string;
  redirectOriginForPhone: string;   // ex: window.location.origin
  redirectPath?: string;            // défaut: "/fp-callback"
  className?: string;
  children?: React.ReactNode;       // libellé custom
};

export default function ScanFingerprintButton({
  mode,
  clinicId,
  operatorId,
  patientId,
  redirectOriginForPhone,
  redirectPath = "/fp-callback",
  className,
  children,
}: ScanFingerprintButtonProps) {
  const onClick = React.useCallback(() => {
    const { deeplink, intentUri } = buildZKDeeplink({
      mode,
      clinicId,
      operatorId,
      patientId,
      redirectOriginForPhone,
      redirectPath,
    });
    window.location.href = deeplink || intentUri;
  }, [mode, clinicId, operatorId, patientId, redirectOriginForPhone, redirectPath]);

  return (
    <button onClick={onClick} className={className ?? "px-4 py-2 rounded-lg bg-gray-900 text-white"}>
      {children ?? "Scanner l’empreinte"}
    </button>
  );
}

