// /src/Pages/patient/Identite.tsx
import { usePatientPortalData } from "../../hooks/usePatientPortalData";

export default function IdentitePage() {
  const { data, loading, error } = usePatientPortalData();

  if (loading) return <p className="p-6">Chargement de vos informations…</p>;
  if (error) return <p className="p-6 text-red-600">{error}</p>;
  if (!data) return null;

  const { identity, coverage } = data;
  const activeCoverage = coverage.find((c) => c.is_active) || coverage[0];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold">Mon identité</h1>

      <div className="bg-white shadow rounded p-4 space-y-2">
        <p><strong>Nom complet :</strong> {identity.name}</p>
        <p><strong>Téléphone :</strong> {identity.phone || "Non renseigné"}</p>
        <p>
          <strong>Date de naissance :</strong>{" "}
          {identity.date_of_birth ? new Date(identity.date_of_birth).toLocaleDateString() : "Non renseignée"}
        </p>
        <p>
          <strong>Dernière visite :</strong>{" "}
          {identity.last_visit_date ? new Date(identity.last_visit_date).toLocaleDateString() : "Aucune"}
        </p>
      </div>

      <div className="bg-white shadow rounded p-4 space-y-2">
        <h2 className="font-semibold text-gray-800 mb-1">Ma couverture assurance</h2>
        {!identity.is_assured || !activeCoverage ? (
          <p className="text-gray-500">Vous n'avez pas de couverture assurance active enregistrée.</p>
        ) : (
          <>
            <p><strong>Organisme :</strong> {activeCoverage.insurers?.name || "Non précisé"}</p>
            <p><strong>N° d'adhérent :</strong> {activeCoverage.member_no || "Non précisé"}</p>
            <p>
              <strong>Validité :</strong>{" "}
              {activeCoverage.coverage_start
                ? new Date(activeCoverage.coverage_start).toLocaleDateString()
                : "?"}
              {" → "}
              {activeCoverage.coverage_end
                ? new Date(activeCoverage.coverage_end).toLocaleDateString()
                : "durée indéterminée"}
            </p>
            <p>
              <strong>Statut :</strong>{" "}
              {activeCoverage.status === "active" ? "Active ✅" : activeCoverage.status || "Inconnu"}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
