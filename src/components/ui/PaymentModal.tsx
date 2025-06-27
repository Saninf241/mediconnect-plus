import React from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  amount: number;
}

export default function PaymentModal({ isOpen, onClose, onConfirm, amount }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-md w-96">
        <h3 className="text-lg font-semibold mb-4">Confirmer le paiement</h3>
        <p>Êtes-vous sûr de vouloir effectuer ce paiement de {amount} FCFA ?</p>
        <div className="mt-6 flex justify-end gap-4">
          <button onClick={onClose} className="bg-gray-300 px-4 py-2 rounded-md">Annuler</button>
          <button onClick={onConfirm} className="bg-green-600 text-white px-4 py-2 rounded-md">Confirmer</button>
        </div>
      </div>
    </div>
  );
}
