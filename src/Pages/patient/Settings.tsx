// src/Pages/patient/Settings.tsx
import { useNavigate } from "react-router-dom";
import { supabasePatient } from "../../lib/supabasePatient";
import { usePatientPortalData } from "../../hooks/usePatientPortalData";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { data, loading } = usePatientPortalData();

  async function handleSignOut() {
    await supabasePatient.auth.signOut();
    navigate("/patient/login", { replace: true });
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold">Paramètres du compte</h1>

      <div className="space-y-2 bg-white p-4 shadow rounded">
        <h2 className="font-semibold">Numéro de téléphone</h2>
        <p className="text-gray-700">{loading ? "…" : data?.identity.phone || "Non renseigné"}</p>
        <p className="text-sm text-gray-500">
          Pour changer de numéro, contactez votre clinique lors d'une prochaine visite.
        </p>
      </div>

      <div className="space-y-2 bg-white p-4 shadow rounded">
        <h2 className="font-semibold">Déconnexion</h2>
        <button
          onClick={handleSignOut}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
