import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Button } from "../../components/ui/button";
import { useUser } from "@clerk/clerk-react";

interface Consultation {
  id: string;
  created_at: string;
  amount: number;
  status: string;
  patient_name?: string;
}

export default function ConsultationFollowUpPage() {
  const { user } = useUser();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      const email = user?.emailAddresses?.[0]?.emailAddress;
      const { data: staff } = await supabase
        .from("clinic_staff")
        .select("clinic_id")
        .eq("email", email)
        .maybeSingle();

      if (staff?.clinic_id) {
        const { data: clinic } = await supabase
          .from("clinics")
          .select("subscription_plan")
          .eq("id", staff.clinic_id)
          .maybeSingle();

        setSubscriptionPlan(clinic?.subscription_plan ?? null);
      }
    };

    fetchSubscription();
  }, [user]);

  useEffect(() => {
    const fetchConsultations = async () => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) return;

      let query = supabase
        .from("consultations")
        .select("id, created_at, amount, status, patient:patients(name)")
        .eq("doctor_id", userId)
        .order("created_at", { ascending: false });

      if (statusFilter) {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error || !data) return;

      const formatted = data.map((c) => ({
        id: c.id,
        created_at: c.created_at,
        amount: c.amount,
        status: c.status,
        patient_name: c.patient?.name || "—",
      }));

      setConsultations(formatted);
      setLoading(false);
    };

    fetchConsultations();
  }, [statusFilter]);

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
        prev.map((c) =>
          c.id === id ? { ...c, status: "sent" } : c
        )
      );
    }
  };

  const isPremium = subscriptionPlan?.includes("premium");

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-blue-700 mb-6">
        📋 Suivi des consultations
      </h1>

      {!isPremium && (
        <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 text-sm p-3 rounded mb-4">
          🔒 Cette fonctionnalité complète est réservée aux abonnés Premium. Vous pouvez visualiser, mais pas modifier.
        </div>
      )}

      <div className="flex gap-2 flex-wrap mb-4">
        {statuses.map((s) => (
          <Button
            key={s}
            onClick={() => setStatusFilter(s)}
            variant={statusFilter === s ? "default" : "outline"}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
        <Button
          onClick={() => setStatusFilter("")}
          variant={statusFilter === "" ? "default" : "outline"}
        >
          Tous
        </Button>
      </div>

      {loading ? (
        <p className="text-center text-gray-500 mt-6">Chargement des consultations...</p>
      ) : (
        <div className={`overflow-x-auto ${!isPremium ? 'opacity-50 pointer-events-none select-none' : ''}`}>
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
                    <td className="px-4 py-3">{c.patient_name}</td>
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
                    <td className="px-4 py-3">
                      {c.status === "draft" && (
                        <Button
                          onClick={() => handleResend(c.id)}
                          variant="default"
                          size="sm"
                        >
                          Envoyer
                        </Button>
                      )}
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
