import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../lib/supabase";
import { Button } from "../../../components/ui/button";
import { useMultispecialistDoctorContext }from "../../../hooks/useMultispecialistDoctorContext";

interface Consultation {
  id: string;
  created_at: string;
  amount: number;
  status: string;
  patient?: {
    name?: string;
  };
}

export default function ConsultationFollowUpPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const doctorInfo = useMultispecialistDoctorContext();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchConsultations = async () => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId || !doctorInfo?.clinic_id) return;

      let query = supabase
        .from("consultations")
        .select("id, created_at, amount, status, patient:patients(name)")
        .eq("doctor_id", userId)
        .eq("clinic_id", doctorInfo.clinic_id)
        .order("created_at", { ascending: false });

      if (statusFilter) {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error || !data) return;

      const formatted = data.map((c: any) => ({
        id: c.id,
        created_at: c.created_at,
        amount: c.amount,
        status: c.status,
        patient: { name: c.patient?.name || "—" },
      }));

      setConsultations(formatted);
      setLoading(false);
    };

    fetchConsultations();
  }, [statusFilter, doctorInfo]);

  const statuses = ["draft", "sent", "accepted", "rejected", "paid"];

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
    navigate(`/multispecialist/doctor/consultation/${id}`);
  };

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-blue-700 mb-6">
        📋 Suivi des consultations
      </h1>

      <div className="flex gap-2 flex-wrap mb-4">
        {statuses.map((s) => (
          <Button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={
              statusFilter === s
                ? "bg-blue-600 text-white"
                : "bg-white border border-gray-300 text-gray-700"
            }
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
        <Button
          onClick={() => setStatusFilter("")}
          className={
            !statusFilter
              ? "bg-blue-600 text-white"
              : "bg-white border border-gray-300 text-gray-700"
          }
        >
          Tous
        </Button>
      </div>

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
                    <td className="px-4 py-3">{c.patient?.name}</td>
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
                        <Button onClick={() => handleResend(c.id)}>Envoyer</Button>
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
