// src/components/layouts/DeveloperLayout.tsx
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useClerk, useUser } from "@clerk/clerk-react";

const navItems = [
  { name: "Accueil", path: "/developer" },
  { name: "Nouveau cabinet spécialiste", path: "/developer/clinics/new" },
  { name: "Nouveau cabinet multi-spécialiste", path: "/developer/multispecialist/new" },
  { name: "Nouvel assureur", path: "/developer/insurers/new" },
  { name: "Tickets support", path: "/developer/tickets" },
  { name: "Gérer cabinets & assureurs", path: "/developer/manage" },
];

export default function DeveloperLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useClerk();
  const { user } = useUser();

  const handleLogout = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-800 text-white p-6 space-y-4 flex flex-col overflow-y-auto shrink-0">
        <h2 className="text-2xl font-bold mb-2">Développeur</h2>
        <p className="text-xs text-slate-300 mb-4">
          {user?.primaryEmailAddress?.emailAddress}
        </p>

        <nav className="space-y-3">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`block px-4 py-2 rounded hover:bg-slate-700 ${
                location.pathname === item.path ? "bg-slate-900" : ""
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="mt-auto pt-8">
          <button
            onClick={handleLogout}
            className="text-sm text-red-300 hover:underline"
          >
            Se déconnecter
          </button>
          <p className="text-xs text-slate-400 mt-3">
            <Link to="/mentions-legales" target="_blank" rel="noopener noreferrer" className="hover:text-white">Mentions légales</Link>
            {" · "}
            <Link to="/politique-confidentialite" target="_blank" rel="noopener noreferrer" className="hover:text-white">Confidentialité</Link>
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 bg-gray-50 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
