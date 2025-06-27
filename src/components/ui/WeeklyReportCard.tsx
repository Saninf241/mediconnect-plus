import React from "react";

interface Props {
  totalReports: number;
  totalAmount: number;
  pending: number;
  approved: number;
  rejected: number;
}

export default function WeeklyReportCard({
  totalReports,
  totalAmount,
  pending,
  approved,
  rejected,
}: Props) {
  return (
    <div className="grid grid-cols-4 gap-4 my-4">
      <div className="p-4 rounded-xl bg-white shadow-md">
        <h4 className="text-md font-semibold">Total Rapports</h4>
        <p>{totalReports}</p>
        <p className="text-xs text-gray-500">Montant total: {totalAmount} FCFA</p>
      </div>
      <div className="p-4 rounded-xl bg-yellow-100 shadow-md">
        <h4 className="text-md font-semibold">En attente</h4>
        <p>{pending}</p>
      </div>
      <div className="p-4 rounded-xl bg-green-100 shadow-md">
        <h4 className="text-md font-semibold">Acceptés</h4>
        <p>{approved}</p>
      </div>
      <div className="p-4 rounded-xl bg-red-100 shadow-md">
        <h4 className="text-md font-semibold">Rejetés</h4>
        <p>{rejected}</p>
      </div>
      <div className="p-4 bg-blue-100 rounded text-center">
      <p className="text-sm">Carte hebdomadaire en cours</p>
      </div>
    </div>
  );
}
