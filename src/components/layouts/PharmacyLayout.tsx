import { Outlet, NavLink, Link } from "react-router-dom";
import LogoutButton from "../ui/LogoutButton";
import { usePharmacyContext } from "../../hooks/usePharmacyContext";

export default function PharmacyLayout() {
  const { ctx } = usePharmacyContext();

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-64 bg-gray-100 p-4 shadow flex flex-col overflow-y-auto shrink-0">
        <div className="mb-6 font-bold text-xl text-indigo-600">
          🏥 {ctx?.pharmacyName || "Pharmacie"}
        </div>
        <nav className="space-y-2">
          <NavLink to="/pharmacy" end className="block">🏠 Accueil</NavLink>
          <NavLink to="/pharmacy/orders" className="block">📥 Ordonnances</NavLink>
          <NavLink to="/pharmacy/history" className="block">📜 Historique</NavLink>
          <NavLink to="/pharmacy/settings" className="block">⚙️ Paramètres</NavLink>
        </nav>
        <div className="mt-auto pt-6">
          <LogoutButton />
          <p className="text-xs text-gray-500 mt-3">
            <Link to="/mentions-legales" className="hover:text-indigo-600">Mentions légales</Link>
            {" · "}
            <Link to="/politique-confidentialite" className="hover:text-indigo-600">Confidentialité</Link>
          </p>
        </div>
      </aside>

      <main className="flex-1 p-6 bg-white overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
