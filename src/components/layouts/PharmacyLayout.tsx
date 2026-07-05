import { Outlet, NavLink } from "react-router-dom";
import LogoutButton from "../ui/LogoutButton";
import { usePharmacyContext } from "../../hooks/usePharmacyContext";

export default function PharmacyLayout() {
  const { ctx } = usePharmacyContext();

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-gray-100 p-4 shadow">
        <div className="mb-6 font-bold text-xl text-indigo-600">
          🏥 {ctx?.pharmacyName || "Pharmacie"}
        </div>
        <nav className="space-y-2">
          <NavLink to="/pharmacy" end className="block">🏠 Accueil</NavLink>
          <NavLink to="/pharmacy/orders" className="block">📥 Ordonnances</NavLink>
          <NavLink to="/pharmacy/history" className="block">📜 Historique</NavLink>
          <NavLink to="/pharmacy/settings" className="block">⚙️ Paramètres</NavLink>
        </nav>
        <LogoutButton />
      </aside>

      <main className="flex-1 p-6 bg-white">
        <Outlet />
      </main>
    </div>
  );
}
