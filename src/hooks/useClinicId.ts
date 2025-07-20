import { useEffect, useState } from "react";

export function useClinicId(): string | null {
  const [clinicId, setClinicId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("establishmentUserSession");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setClinicId(parsed?.clinic_id || null);
      } catch (e) {
        console.error("Erreur de parsing clinic_id :", e);
      }
    }
  }, []);

  return clinicId;
}
