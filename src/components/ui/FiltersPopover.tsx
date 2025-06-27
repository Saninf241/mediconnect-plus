// src/components/ui/FiltersPopover.tsx
import React from "react";

interface Props {
  status: string;
  setStatus: (value: string) => void;
  clinicId: string;
  setClinicId: (value: string) => void;
  dateStart: string;
  setDateStart: (value: string) => void;
  dateEnd: string;
  setDateEnd: (value: string) => void;
  clinics: { id: string; name: string }[];
}

export default function FiltersPopover({
  status,
  setStatus,
  clinicId,
  setClinicId,
  dateStart,
  setDateStart,
  dateEnd,
  setDateEnd,
  clinics
}: Props) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 space-y-4 border border-gray-200">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Statut */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">Tous</option>
            <option value="pending">En attente</option>
            <option value="completed">Validé</option>
            <option value="rejected">Rejeté</option>
          </select>
        </div>

        {/* Établissement */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Établissement</label>
          <select
            value={clinicId}
            onChange={(e) => setClinicId(e.target.value)}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">Tous</option>
            {clinics.map((clinic) => (
              <option key={clinic.id} value={clinic.id}>
                {clinic.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date de début */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date de début</label>
          <input
            type="date"
            value={dateStart}
            onChange={(e) => setDateStart(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        {/* Date de fin */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin</label>
          <input
            type="date"
            value={dateEnd}
            onChange={(e) => setDateEnd(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>
      </div>

      <p className="text-xs text-gray-500 italic">
        Conseil : Utilisez les filtres pour trier les consultations par statut, établissement, ou plage de dates.
      </p>
    </div>
  );
}
