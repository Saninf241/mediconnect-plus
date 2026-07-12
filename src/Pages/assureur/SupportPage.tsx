// src/Pages/assureur/SupportPage.tsx
import { useInsurerContext } from "../../hooks/useInsurerContext";
import SupportTicketPanel from "../../components/support/SupportTicketPanel";

export default function SupportPage() {
  const { ctx, loading } = useInsurerContext();

  if (loading) {
    return <div className="p-6">Chargement…</div>;
  }

  if (!ctx) {
    return <div className="p-6 text-sm text-gray-500">Contexte assureur introuvable.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Support</h1>
        <p className="text-gray-600">
          Une question, un blocage, une suggestion ? Écris au support MediConnect+.
        </p>
      </div>
      <SupportTicketPanel role="assureur" insurerId={ctx.insurerId} />
    </div>
  );
}
