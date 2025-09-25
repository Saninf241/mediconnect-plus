import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Button } from "../../components/ui/button";
import { useDoctorContext } from "../../hooks/useDoctorContext";
import ConsultationStatusFilters from "../../components/ui/uidoctor/ConsultationStatusFilters";

export default function ConsultationFollowUpPage() {
  const [consultations, setConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const doctorInfo = useDoctorContext();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchConsultations = async () => {
      console.log("⏳ Début de fetchConsultations...");

      if (!doctorInfo?.doctor_id || !doctorInfo?.clinic_id) {
        console.warn("⛔ doctorInfo incomplet, en attente...");
        return;
      }

      let query = supabase
        .from("consultations")
        .select("id, created_at, amount, status, patients(name)")
        .eq("doctor_id", doctorInfo.doctor_id)
        .eq("clinic_id", doctorInfo.clinic_id)
        .order("created_at", { ascending: false });

      if (statusFilter) {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) {
        console.error("❌ Erreur Supabase :", error);
        return;
      }

      console.log("✅ Consultations récupérées :", data);
      //setConsultations(data || []);
      setConsultations(
        data.map((c: any) => ({
          id: c.id,
          created_at: c.created_at,
          amount: c.amount,
          status: c.status,
          patient: { name: c.patients?.name || "—" },
        }))
      );
      setLoading(false);
    };

    fetchConsultations();
  }, [doctorInfo, statusFilter]);

  const getBadgeColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-500";
      case "sent":
        return "bg-blue-500";
      case "accepted":
        return "bg-green-600";
      case "rejected":
        return "bg-red-500";
      case "paid":
        return "bg-purple-600";
      default:
        return "bg-gray-300";
    }
  };

  const handleResend = async (id: string) => {
    const { error } = await supabase
      .from("consultations")
      .update({ status: "sent" })
      .eq("id", id);

    if (!error) {
      setConsultations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: "sent" } : c))
      );
    }
  };

  const handleView = (id: string) => {
    navigate(`/doctor/consultation/${id}`);
  };

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-blue-700 mb-6">
        📋 Suivi des consultations
      </h1>

      <ConsultationStatusFilters
        current={statusFilter}
        onChange={setStatusFilter}
      />

      {loading ? (
        <p className="text-center text-gray-500 mt-6">
          Chargement des consultations...
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border rounded-xl shadow-md text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-600">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Montant</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {consultations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-gray-500">
                    Aucune consultation trouvée.
                  </td>
                </tr>
              ) : (
                consultations.map((c) => (
                  <tr key={c.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">{c.patient?.name || "—"}</td>
                    <td className="px-4 py-3">
                      {c.amount?.toLocaleString()} FCFA
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-1 text-white text-xs font-semibold rounded ${getBadgeColor(
                          c.status
                        )}`}
                      >
                        {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex gap-2">
                      {c.status === "draft" && (
                        <Button onClick={() => handleResend(c.id)}>
                          Envoyer
                        </Button>
                      )}
                      <Button onClick={() => handleView(c.id)}>Voir</Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
