// src/components/fp/ScanFingerprintButton.tsx
import React from "react";
import { buildZKDeeplink, launchZKDeeplink } from "../../lib/deeplink";

type Mode = "enroll" | "identify";

export type ScanFingerprintButtonProps = {
  mode: Mode;
  clinicId: string;
  operatorId: string;
  patientId: string;
  redirectOriginForPhone: string;   // ex: window.location.origin
  redirectPath?: string;            // défaut "/fp-callback"
  className?: string;
  children?: React.ReactNode;
};

export default function ScanFingerprintButton(props: ScanFingerprintButtonProps) {
  const {
    mode,
    clinicId,
    operatorId,
    patientId,
    redirectOriginForPhone,
    redirectPath = "/fp-callback",
    className,
    children,
  } = props;

  const openDeeplink = React.useCallback(() => {
    const { deeplink, intentUri } = buildZKDeeplink({
      mode,
      clinicId,
      operatorId,
      patientId,
      redirectOriginForPhone,
      redirectPath,
    });

    launchZKDeeplink({ deeplink, intentUri });
  }, [mode, clinicId, operatorId, patientId, redirectOriginForPhone, redirectPath]);

  return (
    <button onClick={openDeeplink} className={className ?? "px-4 py-2 rounded-lg bg-gray-900 text-white"}>
      {children ?? "Scanner l’empreinte"}
    </button>
  );
}

