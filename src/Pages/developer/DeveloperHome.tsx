// src/Pages/developer/DeveloperHome.tsx
import { Link } from "react-router-dom";
import { Card } from "../../components/ui/card";

export default function DeveloperHome() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Espace Développeur</h1>
        <p className="text-gray-600">
          Créez une nouvelle organisation sur MediConnect+. Chaque création
          génère aussi les premiers comptes (médecin, secrétaire, admin…).
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Link to="/developer/clinics/new">
          <Card className="hover:shadow-md transition cursor-pointer h-full">
            <h3 className="font-semibold mb-1">Cabinet spécialiste</h3>
            <p className="text-sm text-gray-500">
              Un cabinet mono-spécialité avec son médecin, sa secrétaire et
              son admin.
            </p>
          </Card>
        </Link>

        <Link to="/developer/multispecialist/new">
          <Card className="hover:shadow-md transition cursor-pointer h-full">
            <h3 className="font-semibold mb-1">Cabinet multi-spécialiste</h3>
            <p className="text-sm text-gray-500">
              Plusieurs médecins, secrétariat et administration partagés.
            </p>
          </Card>
        </Link>

        <Link to="/developer/insurers/new">
          <Card className="hover:shadow-md transition cursor-pointer h-full">
            <h3 className="font-semibold mb-1">Assureur</h3>
            <p className="text-sm text-gray-500">
              Une compagnie d’assurance et son équipe.
            </p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
