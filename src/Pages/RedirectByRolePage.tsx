// src/Pages/RedirectByRolePage.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { supabase } from "../lib/supabase";

export default function RedirectByRolePage() {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoaded) {
      console.log("⏳ Clerk pas encore chargé");
      return;
    }

    if (!user) {
      console.log("⛔ Utilisateur absent après chargement Clerk");
      navigate('/unauthorized');
      return;
    }

    const fetchAndRedirect = async () => {
      console.log("👀 Étape 2 - Utilisateur Clerk : ", user.id);

      const { data: staffData, error } = await supabase
        .from('clinic_staff')
        .select('role, clinic_id')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error("❌ Supabase error:", error);
        navigate('/unauthorized');
        return;
      }

      if (!staffData) {
        console.warn("⚠️ Aucun staffData trouvé");
        navigate('/unauthorized');
        return;
      }

      const { role } = staffData;
      console.log("🧭 Étape 3 - Rôle détecté :", role);

      switch (role) {
        case 'admin':
          navigate('/multispecialist/admin/dashboard');
          break;
        case 'doctor':
          navigate('/multispecialist/doctor/dashboard');
          break;
        case 'secretary':
          navigate('/multispecialist/secretary/patients');
          break;
        default:
          console.warn("🔍 Rôle non reconnu");
          navigate('/unauthorized');
      }
    };

    fetchAndRedirect();
  }, [isLoaded, user, navigate]);

  return <p>Redirection en cours...</p>;
}
