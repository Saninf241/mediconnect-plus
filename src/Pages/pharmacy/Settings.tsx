import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function PharmacySettings() {
  const [pharmacyUser, setPharmacyUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const sessionRaw = localStorage.getItem("pharmacyUserSession");
    if (!sessionRaw) {
      console.warn("Aucune session pharmacie trouvée");
      return;
    }

    try {
      const session = JSON.parse(sessionRaw);
      setPharmacyUser(session);
    } catch (err) {
      console.error("Erreur parsing session:", err);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("pharmacyUserSession");
    navigate("/login");
  };

  if (!pharmacyUser) {
    return <p>Chargement des infos pharmacie...</p>;
  }

  return (
    <div className="max-w-lg mx-auto bg-white p-6 rounded shadow">
      <h2 className="text-2xl font-bold mb-4">⚙️ Paramètres du compte</h2>

      <div className="mb-4">
        <p><strong>👤 Pharmacien :</strong> {pharmacyUser.name}</p>
        <p><strong>📧 Email :</strong> {pharmacyUser.email}</p>
        <p><strong>🏥 Pharmacie :</strong> {pharmacyUser.clinicName}</p>
      </div>

      <button
        onClick={handleLogout}
        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
      >
        🚪 Se déconnecter
      </button>
    </div>
  );
}
