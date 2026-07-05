// src/hooks/useClinicId.ts
import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { supabase } from "../lib/supabase";

interface UseClinicIdResult {
  clinicId: string | null;
  loadingClinic: boolean;
  source: "clerk_user_id" | "email" | "none";
  debugMessage: string | null;
}

export function useClinicId(): UseClinicIdResult {
  const { user, isLoaded } = useUser();

  const [clinicId, setClinicId] = useState<string | null>(null);
  const [loadingClinic, setLoadingClinic] = useState(true);
  const [source, setSource] = useState<UseClinicIdResult["source"]>("none");
  const [debugMessage, setDebugMessage] = useState<string | null>(null);

  useEffect(() => {
    const resolveClinicId = async () => {
      if (!isLoaded) return;

      setLoadingClinic(true);
      setDebugMessage(null);

      try {
        if (!user) {
          setClinicId(null);
          setSource("none");
          setDebugMessage("Utilisateur Clerk introuvable.");
          setLoadingClinic(false);
          return;
        }

        const clerkUserId = user.id;
        const email = user.emailAddresses?.[0]?.emailAddress ?? null;

        // 1) Tentative via clerk_user_id
        if (clerkUserId) {
          const { data, error } = await supabase
            .from("clinic_staff")
            .select("clinic_id, role, email, clerk_user_id")
            .eq("clerk_user_id", clerkUserId)
            .maybeSingle();

          if (error) {
            console.error("[useClinicId] Erreur recherche par clerk_user_id:", error);
          }

          if (data?.clinic_id) {
            setClinicId(data.clinic_id);
            setSource("clerk_user_id");
            setLoadingClinic(false);
            return;
          }
        }

        // 2) Tentative via email
        if (email) {
          const { data, error } = await supabase
            .from("clinic_staff")
            .select("clinic_id, role, email, clerk_user_id")
            .eq("email", email)
            .maybeSingle();

          if (error) {
            console.error("[useClinicId] Erreur recherche par email:", error);
          }

          if (data?.clinic_id) {
            setClinicId(data.clinic_id);
            setSource("email");
            setLoadingClinic(false);
            return;
          }
        }

        setClinicId(null);
        setSource("none");
        setDebugMessage(
          `Aucun clinic_id trouvé pour cet utilisateur. clerk_user_id=${clerkUserId}, email=${email}`
        );
      } catch (error) {
        console.error("[useClinicId] Erreur inattendue:", error);
        setClinicId(null);
        setSource("none");
        setDebugMessage("Erreur inattendue dans useClinicId.");
      } finally {
        setLoadingClinic(false);
      }
    };

    resolveClinicId();
  }, [isLoaded, user]);

  return { clinicId, loadingClinic, source, debugMessage };
}