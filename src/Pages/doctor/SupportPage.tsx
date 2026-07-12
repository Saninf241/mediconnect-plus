// src/Pages/doctor/SupportPage.tsx
import { useClinicId } from "../../hooks/useClinicId";
import SupportTicketPanel from "../../components/support/SupportTicketPanel";

export default function SupportPage() {
  const { clinicId, loadingClinic } = useClinicId();

  if (loadingClinic) {
    return <div className="p-6">Chargement…</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Support</h1>
        <p className="text-gray-600">
          Une question, un blocage, une suggestion ? Écris au support MediConnect+.
        </p>
      </div>
      <SupportTicketPanel role="doctor" clinicId={clinicId} />
    </div>
  );
}
