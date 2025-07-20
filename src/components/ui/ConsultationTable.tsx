// src/components/ui/ConsultationTable.tsx
import React from "react";
import { Link } from "react-router-dom";

interface Consultation {
  id: string;
  created_at: string;
  patient_name: string;
  doctor_name: string;
  clinic_name: string;
  amount: number;
  status: string;
  pdf_url?: string;
  unread_messages_count?: number; // ✅ Nouveau champ
}

interface Props {
  consultations: Consultation[];
  onValidate?: (id: string) => void;
  onReject?: (id: string) => void;
}

export default function ConsultationTable({ consultations, onValidate, onReject }: Props) {
  return (
    <div className="overflow-x-auto rounded-lg shadow">
      <table className="min-w-full bg-white border">
        <thead>
          <tr className="bg-gray-100 text-left text-sm font-semibold text-gray-700">
            <th className="p-3">Date</th>
            <th className="p-3">Patient</th>
            <th className="p-3">Médecin</th>
            <th className="p-3">Établissement</th>
            <th className="p-3">Montant</th>
            <th className="p-3">Statut</th>
            <th className="p-3">Fiche PDF</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {consultations.map((c) => (
            <tr key={c.id} className="border-t text-sm">
              <td className="p-3">{new Date(c.created_at).toLocaleDateString()}</td>
              <td className="p-3">{c.patient_name || "—"}</td>
              <td className="p-3">{c.doctor_name || "—"}</td>
              <td className="p-3">{c.clinic_name || "—"}</td>
              <td className="p-3">{c.amount?.toLocaleString?.() || "—"} FCFA</td>
              <td className="p-3 capitalize">{c.status || "—"}</td>
              <td className="p-3">
                {c.pdf_url ? (
                  <a
                    href={c.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    Voir PDF
                  </a>
                ) : (
                  <span className="text-gray-400">Non disponible</span>
                )}
              </td>
              <td className="p-3 flex flex-col gap-2">
                {onValidate && (
                  <button
                    onClick={() => onValidate(c.id)}
                    className="bg-green-600 text-white px-3 py-1 rounded"
                  >
                    Valider
                  </button>
                )}
                {onReject && (
                  <button
                    onClick={() => onReject(c.id)}
                    className="bg-red-600 text-white px-3 py-1 rounded"
                  >
                    Rejeter
                  </button>
                )}
                <div className="relative">
                  <Link
                    to={`/assureur/consultation/${c.id}`}
                    className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-center block"
                  >
                    Voir la fiche
                  </Link>
                  {c.unread_messages_count && c.unread_messages_count > 0 && (
                    <span className="absolute top-0 right-0 -mt-2 -mr-2 text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full shadow">
                      🟠 {c.unread_messages_count}
                    </span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
