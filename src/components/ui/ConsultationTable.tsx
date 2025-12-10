// src/components/ui/ConsultationTable.tsx
import React from "react";

type ConsultationRow = {
  id: string;
  created_at: string;
  amount: number | null;
  status: string;
  pdf_url?: string | null;

  // Nouvelles formes (Edge Function)
  patients?: { name?: string | null };
  clinic_staff?: { name?: string | null };
  clinics?: { name?: string | null };

  // Anciennes formes possibles
  patient?: { name?: string | null };
  doctor?: { name?: string | null };
  clinic?: { name?: string | null };

  // Forme “aplatie” éventuelle
  patient_name?: string | null;
  doctor_name?: string | null;
  clinic_name?: string | null;

  // pour debug éventuel
  patient_id?: string | null;
  doctor_id?: string | null;
  clinic_id?: string | null;
};

interface Props {
  consultations: ConsultationRow[];
  onValidate: (id: string) => void;
  onReject: (id: string) => void;
  processingId?: string | null;            // pour afficher "..." pendant PATCH
  onOpenDetails?: (id: string) => void;    // ✅ nouveau : ouvrir la page détail
}

function getPatientLabel(c: ConsultationRow): string {
  return (
    c.patient_name ||
    c.patients?.name ||
    c.patient?.name ||
    c.patient_id ||
    "—"
  );
}

function getDoctorLabel(c: ConsultationRow): string {
  return (
    c.doctor_name ||
    c.clinic_staff?.name ||
    c.doctor?.name ||
    c.doctor_id ||
    "—"
  );
}

function getClinicLabel(c: ConsultationRow): string {
  return (
    c.clinic_name ||
    c.clinics?.name ||
    c.clinic?.name ||
    c.clinic_id ||
    "—"
  );
}

export default function ConsultationTable({
  consultations,
  onValidate,
  onReject,
  processingId,
  onOpenDetails,
}: Props) {
  return (
    <table className="min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
      <thead className="bg-gray-100">
        <tr>
          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
            Date
          </th>
          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
            Patient
          </th>
          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
            Médecin
          </th>
          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
            Établissement
          </th>
          <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700">
            Montant
          </th>
          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
            Statut
          </th>
          <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">
            Fiche PDF
          </th>
          <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">
            Détails
          </th>
          <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">
            Actions
          </th>
        </tr>
      </thead>

      <tbody>
        {consultations.length === 0 && (
          <tr>
            <td
              colSpan={9}
              className="px-4 py-6 text-center text-sm text-gray-500"
            >
              Aucune consultation trouvée.
            </td>
          </tr>
        )}

        {consultations.map((c) => {
          const isProcessing = processingId === c.id;

          return (
            <tr key={c.id} className="border-t border-gray-100">
              <td className="px-4 py-2 text-sm text-gray-700">
                {new Date(c.created_at).toLocaleString()}
              </td>

              <td className="px-4 py-2 text-sm text-gray-700">
                {getPatientLabel(c)}
              </td>

              <td className="px-4 py-2 text-sm text-gray-700">
                {getDoctorLabel(c)}
              </td>

              <td className="px-4 py-2 text-sm text-gray-700">
                {getClinicLabel(c)}
              </td>

              <td className="px-4 py-2 text-sm text-gray-700 text-right">
                {c.amount != null
                  ? `${c.amount.toLocaleString("fr-FR")} FCFA`
                  : "—"}
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

              {/* Colonne Détails */}
              <td className="px-4 py-2 text-sm text-center">
                {onOpenDetails ? (
                  <button
                    className="text-xs text-indigo-600 underline hover:text-indigo-800"
                    onClick={() => onOpenDetails(c.id)}
                  >
                    Ouvrir
                  </button>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>

              {/* Actions Valider / Rejeter */}
              <td className="px-4 py-2 text-sm text-center space-x-2">
                <button
                  className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-xs disabled:opacity-50"
                  onClick={() => onValidate(c.id)}
                  disabled={isProcessing}
                >
                  {isProcessing ? "..." : "Valider"}
                </button>
                <button
                  className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-xs disabled:opacity-50"
                  onClick={() => onReject(c.id)}
                  disabled={isProcessing}
                >
                  {isProcessing ? "..." : "Rejeter"}
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
