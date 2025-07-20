// src/hooks/useRedirectByRole.ts

import { useUser } from "@clerk/clerk-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export function useRedirectByRole() {
  const { user } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.id) return;

    const fetchRole = async () => {
      const { data, error } = await supabase
        .from("clinic_staff")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (error || !data) {
        navigate("/"); // Aucun rôle trouvé
        return;
      }

      const role = data.role;

      switch (role) {
        case "doctor":
          navigate("/multispecialist/doctor/dashboard");
          break;
        case "admin":
          navigate("/multispecialist/admin/dashboard");
          break;
        case "secretaire":
          navigate("/multispecialist/secretary/patients");
          break;
        case "assureur":
          navigate("/assureur/dashboard");
          break;
        default:
          navigate("/");
      }
    };

    fetchRole();
  }, [user, navigate]);
}
