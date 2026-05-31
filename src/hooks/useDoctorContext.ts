// src/hooks/useDoctorContext.ts
import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { resolveAccessContext } from "../components/auth/access-context";

type DoctorContext = {
  clinic_id: string;
  doctor_id: string;
  area: "specialist_doctor" | "multispecialist_doctor";
} | null;

export function useDoctorContext(): DoctorContext {
  const { isLoaded, isSignedIn, user } = useUser();
  const [ctx, setCtx] = useState<DoctorContext>(null);

  const email = useMemo(
    () =>
      user?.primaryEmailAddress?.emailAddress ||
      user?.emailAddresses?.[0]?.emailAddress ||
      null,
    [user]
  );

  const roleFromClerk = useMemo(
    () => (user?.publicMetadata?.role as string | undefined) ?? null,
    [user]
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!isLoaded) return;

      if (!isSignedIn || !user) {
        if (!cancelled) setCtx(null);
        return;
      }

      try {
        const access = await resolveAccessContext({
          clerkUserId: user.id,
          email,
          roleFromClerk,
        });

        if (
          access &&
          (access.area === "specialist_doctor" ||
            access.area === "multispecialist_doctor") &&
          access.clinicId &&
          access.staffId
        ) {
          if (!cancelled) {
            setCtx({
              clinic_id: String(access.clinicId),
              doctor_id: String(access.staffId),
              area: access.area,
            });
          }
          return;
        }

        console.warn("useDoctorContext: aucun contexte médecin valide", access);
        if (!cancelled) setCtx(null);
      } catch (e) {
        console.error("useDoctorContext error", e);
        if (!cancelled) setCtx(null);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, user, email, roleFromClerk]);

  return ctx;
}