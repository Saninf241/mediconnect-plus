// src/components/auth/RoleRedirect.tsx
import { useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";

const normalize = (r?: string | null) =>
  (r || "").toString().trim().toLowerCase();

export default function RoleRedirect() {
  const { isLoaded, isSignedIn, user } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn || !user) {
      navigate("/sign-in", { replace: true });
      return;
    }

    // 🔑 Rôle = source de vérité Clerk (publicMetadata.role)
    const role = normalize(user.publicMetadata?.role as string | undefined);

    // Debug utile la 1ère fois
    console.log("[RoleRedirect] email=", user.primaryEmailAddress?.emailAddress, "role=", role);

    switch (role) {
      case "admin":
      case "owner":
      case "manager":
        navigate("/multispecialist/admin/dashboard", { replace: true });
        return;
      case "doctor":
        navigate("/doctor/patients", { replace: true });
        return;
      case "secretary":
        navigate("/multispecialist/secretary/patients", { replace: true });
        return;
      case "assurer":
      case "assureur":
        navigate("/assureur/reports", { replace: true });
        return;
      case "pharmacist":
      case "pharmacien":
        navigate("/pharmacy", { replace: true });
        return;
      default:
        navigate("/unauthorized", { replace: true });
        return;
    }
  }, [isLoaded, isSignedIn, user, navigate]);

  return <div style={{ padding: 24 }}>Connexion…</div>;
}
