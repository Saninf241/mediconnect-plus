// src/pages/RedirectByRolePage.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";

export default function RedirectByRolePage() {
  const navigate = useNavigate();
  const { isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded) return;

    const sessionRaw = localStorage.getItem("establishmentUserSession");
    if (!sessionRaw) {
      console.warn("❌ Aucune session trouvée. Redirection vers /sign-in");
      navigate("/sign-in");
      return;
    }

    try {
      const parsed = JSON.parse(sessionRaw);
      const role = parsed?.user?.role || parsed?.role;

      console.log("🎯 Rôle détecté:", role);

      switch (role) {
        case "doctor":
          navigate("/doctor/dashboard");
          break;
        case "admin":
          navigate("/multispecialist/admin/dashboard");
          break;
        case "secretary":
          navigate("/multispecialist/secretary/dashboard");
          break;
        case "pharmacist":
          navigate("/pharmacy/dashboard");
          break;
        case "assurer":
          navigate("/assureur/dashboard");
          break;
        default:
          console.warn("🚫 Rôle inconnu. Redirection vers /unauthorized");
          navigate("/unauthorized");
      }
    } catch (err) {
      console.error("❌ Erreur lors du parsing JSON:", err);
      navigate("/sign-in");
    }
  }, [isLoaded, navigate]);

  return (
    <div className="flex justify-center items-center h-screen text-gray-500 text-lg">
      Redirection...
    </div>
  );
}
