import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

export default function PharmacyLayout() {
  const [pharmacyName, setPharmacyName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const sessionRaw = localStorage.getItem("pharmacyUserSession");
    if (!sessionRaw) return;

    try {
      const session = JSON.parse(sessionRaw);
      setPharmacyName(session.clinicName); // ✅ utilise bien clinicName
    } catch (error) {
      console.error("Erreur lecture session pharmacie:", error);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("pharmacyUserSession");
    localStorage.removeItem("establishmentUserSession");
    navigate("/");
  };

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-gray-100 p-4 shadow">
        <div className="mb-6 font-bold text-xl text-indigo-600">
          🏥 {pharmacyName || "Pharmacie"}
        </div>
        <nav className="space-y-2">
          <NavLink to="/pharmacy" end className="block">🏠 Accueil</NavLink>
          <NavLink to="/pharmacy/orders" className="block">📥 Ordonnances</NavLink>
          <NavLink to="/pharmacy/history" className="block">📜 Historique</NavLink>
          <NavLink to="/pharmacy/settings" className="block">⚙️ Paramètres</NavLink>
        </nav>
        <button
          onClick={handleLogout}
          className="mt-8 text-sm text-red-500 hover:underline"
        >
          Se déconnecter
        </button>
      </aside>

      <main className="flex-1 p-6 bg-white">
        <Outlet />
      </main>
    </div>
  );
}

