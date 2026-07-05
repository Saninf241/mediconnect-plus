import LogoutButton from "../../components/ui/LogoutButton";
import { usePharmacyContext } from "../../hooks/usePharmacyContext";

export default function PharmacySettings() {
  const { ctx, loading } = usePharmacyContext();

  if (loading) {
    return <p>Chargement des infos pharmacie...</p>;
  }

  if (!ctx) {
    return <p>Session pharmacien introuvable.</p>;
  }

  return (
    <div className="max-w-lg mx-auto bg-white p-6 rounded shadow">
      <h2 className="text-2xl font-bold mb-4">⚙️ Paramètres du compte</h2>

      <div className="mb-4">
        <p><strong>👤 Pharmacien :</strong> {ctx.staffName}</p>
        <p><strong>📧 Email :</strong> {ctx.email}</p>
        <p><strong>🏥 Pharmacie :</strong> {ctx.pharmacyName}</p>
      </div>

      <LogoutButton />
    </div>
  );
}
