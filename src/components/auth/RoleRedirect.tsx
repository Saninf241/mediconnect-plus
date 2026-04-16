// src/components/auth/RoleRedirect.tsx
import { useEffect, useMemo } from "react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { resolveAccessContext } from "./access-context";

export default function RoleRedirect() {
  const { isLoaded, isSignedIn, user } = useUser();
  const navigate = useNavigate();

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
    if (!isLoaded) return;

    if (!isSignedIn || !user) {
      navigate("/sign-in", { replace: true });
      return;
    }

    (async () => {
      const ctx = await resolveAccessContext({
        clerkUserId: user.id,
        email,
        roleFromClerk,
      });

      const intendedTo = sessionStorage.getItem("auth:intended_to");
      sessionStorage.removeItem("auth:intended_to");

      if (!ctx) {
        navigate("/unauthorized", { replace: true });
        return;
      }

      let resolvedPath = "/unauthorized";

      switch (ctx.area) {
        case "specialist_doctor":
          resolvedPath = "/doctor";
          break;
        case "multispecialist_doctor":
          resolvedPath = "/multispecialist/doctor";
          break;
        case "multispecialist_secretary":
          resolvedPath = "/multispecialist/secretary/patients";
          break;
        case "multispecialist_admin":
          resolvedPath = "/multispecialist/admin/dashboard";
          break;
        case "assureur":
          resolvedPath = "/assureur/reports";
          break;
        case "pharmacy":
          resolvedPath = "/pharmacy";
          break;
      }

      if (intendedTo) {
        const sameArea =
          (ctx.area === "specialist_doctor" && intendedTo.startsWith("/doctor")) ||
          (ctx.area === "multispecialist_doctor" && intendedTo.startsWith("/multispecialist/doctor")) ||
          (ctx.area === "multispecialist_secretary" && intendedTo.startsWith("/multispecialist/secretary")) ||
          (ctx.area === "multispecialist_admin" && intendedTo.startsWith("/multispecialist/admin")) ||
          (ctx.area === "assureur" && intendedTo.startsWith("/assureur")) ||
          (ctx.area === "pharmacy" && intendedTo.startsWith("/pharmacy"));

        navigate(sameArea ? intendedTo : resolvedPath, { replace: true });
        return;
      }

      navigate(resolvedPath, { replace: true });
    })();
  }, [isLoaded, isSignedIn, user, email, roleFromClerk, navigate]);

  return <div style={{ padding: 24 }}>Connexion…</div>;
}