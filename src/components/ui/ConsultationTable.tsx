// src/components/ui/ConsultationTable.tsx
import React from "react";

type ConsultationRow = {
  id: string;
  created_at: string;
  amount: number | null;
  status: string;
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

export default function ConsultationTable({ consultations, onValidate, onReject }: Props) {
  return (
    <table className="min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
      <thead className="bg-gray-100">
        <tr>
          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Date</th>
          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Patient</th>
          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Médecin</th>
          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Établissement</th>
          <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700">Montant</th>
          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Statut</th>
          <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">Fiche PDF</th>
          <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">Actions</th>
        </tr>
      </thead>
      <tbody>
        {consultations.length === 0 && (
          <tr>
            <td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-500">
              Aucune consultation trouvée.
            </td>
          </tr>
        )}

        {consultations.map((c) => (
          <tr key={c.id} className="border-t border-gray-100">
            <td className="px-4 py-2 text-sm text-gray-700">
              {new Date(c.created_at).toLocaleString()}
            </td>
            <td className="px-4 py-2 text-sm text-gray-700">
              {c.patient_name || "—"}
            </td>
            <td className="px-4 py-2 text-sm text-gray-700">
              {c.doctor_name || "—"}
            </td>
            <td className="px-4 py-2 text-sm text-gray-700">
              {c.clinic_name || "—"}
            </td>
            <td className="px-4 py-2 text-sm text-gray-700 text-right">
              {c.amount != null ? `${c.amount.toLocaleString("fr-FR")} FCFA` : "—"}
            </td>
            <td className="px-4 py-2 text-sm text-gray-700">
              {c.status}
            </td>
            <td className="px-4 py-2 text-sm text-center">
              {c.pdf_url ? (
                <a
                  href={c.pdf_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline"
                >
                  Voir
                </a>
              ) : (
                <span className="text-gray-400">Non disponible</span>
              )}
            </td>
            <td className="px-4 py-2 text-sm text-center space-x-2">
              <button
                className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-xs"
                onClick={() => onValidate(c.id)}
              >
                Valider
              </button>
              <button
                className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-xs"
                onClick={() => onReject(c.id)}
              >
                Rejeter
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
