import React from 'react';

interface Props {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  totalAmount: number;
}

export default function ConsultationStats({ total, pending, approved, rejected, totalAmount }: Props) {
  return (
    <div className="grid grid-cols-4 gap-4 my-6">
      <div className="bg-white shadow-md rounded-xl p-4">
        <h3>Total Rapports</h3>
        <p>{total}</p>
        <p>Montant total: {totalAmount} FCFA</p>
      </div>
      <div className="bg-white shadow-md rounded-xl p-4">
        <h3>En attente</h3>
        <p>{pending}</p>
      </div>
      <div className="bg-white shadow-md rounded-xl p-4">
        <h3>Acceptés</h3>
        <p>{approved}</p>
      </div>
      <div className="bg-white shadow-md rounded-xl p-4">
        <h3>Rejetés</h3>
        <p>{rejected}</p>
      </div>
    </div>
  );
}
