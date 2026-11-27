// src/components/auth/SignOutPage.tsx
import React, { useEffect } from "react";
import { useClerk } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom"; // Assurez-vous d'avoir react-router-dom installé

export default function SignOutPage() {
  const { signOut } = useClerk();
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      try {
        // Nettoyage ciblé des clés spécifiques
        sessionStorage.removeItem("auth:intended_to");
        sessionStorage.removeItem("fp:last");
        sessionStorage.removeItem("fp:return");
        sessionStorage.removeItem("wizard:returnStep");
        // Copies partagées entre onglets du parcours empreinte (formulaire patient en cours)
        localStorage.removeItem("wizard:snapshot");
        localStorage.removeItem("fp:expected_patient_id");

        // Nettoyage complet pour plus de sécurité
        sessionStorage.clear();
      } catch (e) {
        console.warn("Storage cleanup failed", e);
      }

      // Déconnexion Clerk
      await signOut();
      
      // Redirection fluide via React Router au lieu d'un rechargement complet
      navigate("/", { replace: true });
    };

    run();
  }, [signOut, navigate]);

  return <div className="p-4">Déconnexion…</div>;
}