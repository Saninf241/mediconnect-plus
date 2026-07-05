// src/Pages/patient/Remboursements.tsx
import { usePatientPortalData } from "../../hooks/usePatientPortalData";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  draft: { label: "En préparation", className: "bg-gray-100 text-gray-700" },
  sent: { label: "Envoyée à l'assurance", className: "bg-blue-100 text-blue-700" },
  accepted: { label: "Prise en charge acceptée", className: "bg-emerald-100 text-emerald-700" },
  validated: { label: "Prise en charge validée", className: "bg-emerald-100 text-emerald-700" },
  paid: { label: "Remboursée", className: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Non prise en charge", className: "bg-red-100 text-red-700" },
};

function formatFCFA(amount: number | null) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
}

export default function RemboursementsPage() {
  const { data, loading, error } = usePatientPortalData();

  if (loading) return <p className="p-6">Chargement…</p>;
  if (error) return <p className="p-6 text-red-600">{error}</p>;
  if (!data) return null;

  const claims = data.claims.filter((c) => c.status && c.status !== "draft");

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-1">Suivi de mes remboursements</h1>
      <p className="text-sm text-gray-500 mb-4">
        État des demandes de prise en charge envoyées à votre assurance après chaque visite.
      </p>

      {claims.length === 0 ? (
        <p>Aucune demande de remboursement pour le moment.</p>
      ) : (
        <ul className="space-y-4">
          {claims.map((c) => {
            const meta = STATUS_LABELS[c.status || ""] || {
              label: c.status || "Statut inconnu",
              className: "bg-gray-100 text-gray-700",
            };
            return (
              <li key={c.id} className="border p-4 rounded bg-white shadow space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium">
                    {new Date(c.created_at).toLocaleDateString()}
                  </p>
                  <span className={`text-xs px-2 py-1 rounded-full ${meta.className}`}>
                    {meta.label}
                  </span>
                </div>
                <p><strong>Montant de la consultation :</strong> {formatFCFA(c.amount)}</p>
                {c.insurer_amount != null && (
                  <p><strong>Pris en charge par l'assurance :</strong> {formatFCFA(c.insurer_amount)}</p>
                )}
                {c.patient_amount != null && (
                  <p><strong>Reste à votre charge :</strong> {formatFCFA(c.patient_amount)}</p>
                )}
                {c.insurer_decision_at && (
                  <p className="text-sm text-gray-500">
                    Décision reçue le {new Date(c.insurer_decision_at).toLocaleDateString()}
                  </p>
                )}
                {c.status === "rejected" && c.rejection_reason && (
                  <p className="text-sm text-red-600">Motif : {c.rejection_reason}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
