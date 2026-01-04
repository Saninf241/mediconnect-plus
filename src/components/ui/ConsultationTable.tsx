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

  pricing_status?: string | null;
  pricing_total?: number | null;
  amount_delta?: number | null;
  insurer_amount?: number | null;
  patient_amount?: number | null;
  missing_tariffs?: number | null;

  insurer_id?: string | null;
  biometric_verified_at?: string | null;
  biometric_operator_id?: string | null;
  biometric_clinic_id?: string | null;
  fingerprint_missing?: boolean | null;
};

interface Props {
  consultations: ConsultationRow[];
  onValidate: (id: string) => void;
  onReject: (id: string) => void;
  processingId?: string | null;
  onOpenDetails?: (id: string) => void;
  onComputePricing?: (id: string) => void;
  pricingProcessingId?: string | null;
  // ✅ Nouveau : Un seul objet pour tous les compteurs
  unreadCounts?: Record<string, number>; 
}

function getPatientLabel(c: ConsultationRow): string {
  return c.patient_name || c.patients?.name || c.patient?.name || c.patient_id || "—";
}

function getDoctorLabel(c: ConsultationRow): string {
  return c.doctor_name || c.clinic_staff?.name || c.doctor?.name || c.doctor_id || "—";
}

function getClinicLabel(c: ConsultationRow): string {
  return c.clinic_name || c.clinics?.name || c.clinic?.name || c.clinic_id || "—";
}

function getBiometricLabel(c: ConsultationRow) {
  if (c.biometric_verified_at) return { text: "Vérifiée ✅", tone: "bg-green-100 text-green-800" };
  if (c.fingerprint_missing) return { text: "Empreinte manquante ⚠️", tone: "bg-orange-100 text-orange-800" };
  if (!c.insurer_id) return { text: "Non requis —", tone: "bg-gray-100 text-gray-700" };
  return { text: "Non vérifiée ⏳", tone: "bg-yellow-100 text-yellow-800" };
}

export default function ConsultationTable({
  consultations,
  onValidate,
  onReject,
  processingId,
  onOpenDetails,
  onComputePricing,
  pricingProcessingId,
  unreadCounts = {}, // ✅ Valeur par défaut
}: Props) {
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
          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Biométrie</th>
          <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">Fiche PDF</th>
          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Pricing</th>
          <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">Détails</th>
          <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">Actions</th>
        </tr>
      </thead>

      <tbody>
        {consultations.length === 0 && (
          <tr>
            <td colSpan={11} className="px-4 py-6 text-center text-sm text-gray-500">
              Aucune consultation trouvée.
            </td>
          </tr>
        )}

        {consultations.map((c) => {
          const isProcessing = processingId === c.id;
          // ✅ Récupération du nombre de messages non lus pour CETTE ligne
          const count = unreadCounts[c.id] || 0;

          return (
            <tr key={c.id} className="border-t border-gray-100">
              <td className="px-4 py-2 text-sm text-gray-700">{new Date(c.created_at).toLocaleString()}</td>
              <td className="px-4 py-2 text-sm text-gray-700">{getPatientLabel(c)}</td>
              <td className="px-4 py-2 text-sm text-gray-700">{getDoctorLabel(c)}</td>
              <td className="px-4 py-2 text-sm text-gray-700">{getClinicLabel(c)}</td>
              <td className="px-4 py-2 text-sm text-gray-700 text-right">
                {c.amount != null ? `${c.amount.toLocaleString("fr-FR")} FCFA` : "—"}
              </td>
              <td className="px-4 py-2 text-sm text-gray-700">{c.status}</td>
              <td className="px-4 py-2 text-sm">
                {(() => {
                  const b = getBiometricLabel(c);
                  return <span className={`text-xs px-2 py-1 rounded ${b.tone}`}>{b.text}</span>;
                })()}
              </td>
              <td className="px-4 py-2 text-sm text-center">
                {c.pdf_url ? (
                  <a href={c.pdf_url} target="_blank" rel="noreferrer" className="text-blue-600 underline">Voir</a>
                ) : (
                  <span className="text-gray-400">Non disponible</span>
                )}
              </td>

              <td className="px-4 py-2 text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded bg-gray-100">{c.pricing_status ?? "not computed"}</span>
                  {onComputePricing && (
                    <button
                      className="ml-auto text-xs text-blue-600 underline hover:text-blue-800 disabled:opacity-50"
                      onClick={() => onComputePricing(c.id)}
                      disabled={pricingProcessingId === c.id}
                    >
                      {pricingProcessingId === c.id ? "..." : "Calculer"}
                    </button>
                  )}
                </div>
              </td>

              {/* ✅ COLONNE DÉTAILS AVEC BADGE */}
              <td className="px-4 py-2 text-sm text-center">
                {onOpenDetails ? (
                  <button
                    className="text-xs text-indigo-600 underline hover:text-indigo-800 inline-flex items-center gap-2"
                    onClick={() => onOpenDetails(c.id)}
                  >
                    Ouvrir
                    {count > 0 && (
                      <span className="inline-flex items-center rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                        {count} new
                      </span>
                    )}
                  </button>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>

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