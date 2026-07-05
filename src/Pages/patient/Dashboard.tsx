// /src/Pages/patient/Dashboard.tsx
import { Link } from "react-router-dom";
import { usePatientPortalData } from "../../hooks/usePatientPortalData";

export default function PatientDashboard() {
  const { data, loading, error } = usePatientPortalData();

  if (loading) return <p className="p-6">Chargement de votre espace…</p>;
  if (error) return <p className="p-6 text-red-600">{error}</p>;
  if (!data) return null;

  const upcomingReminder = data.consultations.find((c) => c.next_visit_date);
  const lastPrescription = data.prescriptions[0];

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold text-gray-800">
        Bonjour {data.identity.name.split(" ")[0]}
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-100 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-blue-700">{data.consultations.length}</div>
          <div className="text-sm text-gray-600">Consultations</div>
        </div>
        <div className="bg-green-100 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-green-700">{data.treatments.length}</div>
          <div className="text-sm text-gray-600">Traitements en cours</div>
        </div>
        <div className="bg-purple-100 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-purple-700">{data.prescriptions.length}</div>
          <div className="text-sm text-gray-600">Ordonnances</div>
        </div>
        <div className="bg-yellow-100 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-yellow-700">
            {data.identity.is_assured ? "Assuré" : "Non assuré"}
          </div>
          <div className="text-sm text-gray-600">Statut</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white border rounded-xl p-4 shadow">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Dernière ordonnance</h2>
          {lastPrescription ? (
            <p className="text-gray-700">
              {new Date(lastPrescription.created_at).toLocaleDateString()} —{" "}
              {lastPrescription.clinic_staff?.name || "Médecin"}
            </p>
          ) : (
            <p className="text-gray-400">Aucune ordonnance récente</p>
          )}
          <Link to="/patient/Ordonnances" className="text-blue-600 text-sm mt-2 inline-block underline">
            Voir toutes les ordonnances →
          </Link>
        </div>

        <div className="bg-white border rounded-xl p-4 shadow">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Prochain rendez-vous</h2>
          {upcomingReminder ? (
            <p className="text-gray-700">
              {new Date(upcomingReminder.next_visit_date!).toLocaleDateString()} —{" "}
              {upcomingReminder.doctor_name || "Médecin"}
            </p>
          ) : (
            <p className="text-gray-400">Aucune date de suivi programmée</p>
          )}
        </div>
      </div>
    </div>
  );
}
