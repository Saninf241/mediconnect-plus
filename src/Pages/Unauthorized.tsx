// src/Pages/Unauthorized.tsx
import { Link } from "react-router-dom";

export default function Unauthorized() {
  return (
    <div className="text-center p-8">
      <h1 className="text-2xl font-bold text-red-600">⛔ Accès non autorisé</h1>
      <p className="mt-4 text-gray-700">Vous n’avez pas les droits pour accéder à cette page.</p>
      <Link to="/" className="mt-6 inline-block text-blue-600 hover:underline">
        🔙 Retour à l'accueil
      </Link>
    </div>
  );
}
