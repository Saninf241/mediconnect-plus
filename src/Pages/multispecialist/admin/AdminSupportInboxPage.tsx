// src/Pages/multispecialist/admin/AdminSupportInboxPage.tsx
import { useClinicId } from "../../../hooks/useClinicId";
import SupportTicketPanel from "../../../components/support/SupportTicketPanel";

export default function AdminSupportInboxPage() {
  const { clinicId, loadingClinic } = useClinicId();

  if (loadingClinic) {
    return <div className="p-6">Chargement du support…</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Support</h1>
        <p className="text-sm text-gray-500">
          Demandes envoyées au support MediConnect+ pour cet établissement (visibles par toute
          l'équipe du cabinet).
        </p>
      </div>
      <SupportTicketPanel role="admin" clinicId={clinicId} />
    </div>
  );
}
