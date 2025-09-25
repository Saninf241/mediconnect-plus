// src/Pages/patient/Settings.tsx
import { useUser, useClerk } from "@clerk/clerk-react";
import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function SettingsPage() {
  const { user } = useUser();
  const { signOut } = useClerk();

  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("");

  const handleUpdatePhone = async () => {
    if (!phone) return;

    const { error } = await supabase
      .from("patients")
      .update({ phone })
      .eq("email", user?.primaryEmailAddress?.emailAddress);

    if (error) {
      setStatus("❌ Erreur lors de la mise à jour.");
    } else {
      setStatus("✅ Téléphone mis à jour avec succès.");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold">⚙️ Paramètres du compte</h1>

      <div className="space-y-2 bg-white p-4 shadow rounded">
        <h2 className="font-semibold">📱 Mettre à jour mon téléphone</h2>
        <input
          type="text"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Ex : +241 06 00 00 00"
          className="border p-2 rounded w-full"
        />
        <button
          onClick={handleUpdatePhone}
          className="mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Mettre à jour
        </button>
        {status && <p className="text-sm text-gray-600">{status}</p>}
      </div>

      <div className="space-y-2 bg-white p-4 shadow rounded">
        <h2 className="font-semibold">🔐 Modifier mon mot de passe</h2>
        <p>
          Pour des raisons de sécurité, vous serez redirigé vers l’espace sécurisé de gestion de votre compte.
        </p>
        <a
          href="https://clerk.com/user" // ou lien direct selon configuration Clerk
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline"
        >
          Modifier mon mot de passe
        </a>
      </div>

      <div className="space-y-2 bg-white p-4 shadow rounded">
        <h2 className="font-semibold">🚪 Déconnexion</h2>
        <button
          onClick={() => signOut()}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
}

