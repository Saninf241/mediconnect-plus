// src/components/ui/ConsultationTable.tsx
import React from "react";
import { useNavigate } from "react-router-dom";

type ConsultationRow = {
  id: string;
  created_at: string;
  amount: number;
  status: "sent" | "accepted" | "rejected" | string;
  pdf_url?: string | null;
  patient_name?: string | null;
  doctor_name?: string | null;
  clinic_name?: string | null;
};

interface Props {
  consultations: ConsultationRow[];
  onValidate: (id: string) => void;
  onReject: (id: string) => void;
}

export default function ConsultationTable({
  consultations,
  onValidate,
  onReject,
}: Props) {
  const navigate = useNavigate();

  if (!consultations.length) {
    return (
      <div className="mt-4 text-sm text-gray-500 italic">
        Aucune consultation trouvée pour ces filtres.
      </div>
    );
  }

  return (
    <div className="mt-4 overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-200">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr className="text-left">
            <th className="px-4 py-2 border-b">Date</th>
            <th className="px-4 py-2 border-b">Patient</th>
            <th className="px-4 py-2 border-b">Médecin</th>
            <th className="px-4 py-2 border-b">Établissement</th>
            <th className="px-4 py-2 border-b text-right">Montant</th>
            <th className="px-4 py-2 border-b">Statut</th>
            <th className="px-4 py-2 border-b">Fiche PDF</th>
            <th className="px-4 py-2 border-b text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {consultations.map((c) => (
            <tr key={c.id} className="hover:bg-gray-50">
              <td className="px-4 py-2 border-b">
                {new Date(c.created_at).toLocaleDateString("fr-FR")}
              </td>
              <td className="px-4 py-2 border-b">
                {c.patient_name || "—"}
              </td>
              <td className="px-4 py-2 border-b">
                {c.doctor_name || "—"}
              </td>
              <td className="px-4 py-2 border-b">
                {c.clinic_name || "—"}
              </td>
              <td className="px-4 py-2 border-b text-right">
                {c.amount?.toLocaleString("fr-FR")} FCFA
              </td>
              <td className="px-4 py-2 border-b">
                {c.status === "sent"
                  ? "Envoyé"
                  : c.status === "accepted"
                  ? "Accepté"
                  : c.status === "rejected"
                  ? "Rejeté"
                  : c.status}
              </td>
              <td className="px-4 py-2 border-b">
                {c.pdf_url ? (
                  <a
                    href={c.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    Voir le PDF
                  </a>
                ) : (
                  <span className="text-gray-400 italic">Non disponible</span>
                )}
              </td>
              <td className="px-4 py-2 border-b text-center space-x-2">
                <button
                  onClick={() => onValidate(c.id)}
                  className="px-3 py-1 rounded bg-green-600 text-white text-xs hover:bg-green-700"
                >
                  Valider
                </button>
                <button
                  onClick={() => onReject(c.id)}
                  className="px-3 py-1 rounded bg-red-600 text-white text-xs hover:bg-red-700"
                >
                  Rejeter
                </button>
                <button
                  onClick={() =>
                    navigate(`/assureur/consultations/${encodeURIComponent(c.id)}`)
                  }
                  className="px-3 py-1 rounded bg-blue-600 text-white text-xs hover:bg-blue-700"
                >
                  Voir la fiche
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
