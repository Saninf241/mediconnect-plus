// src/Pages/assureur/AssureurReports.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useInsurerContext } from "../../hooks/useInsurerContext";
import ConsultationTable from "../../components/ui/ConsultationTable";
import FiltersPopover from "../../components/ui/FiltersPopover";
import { getAllClinics } from "../../lib/queries/clinics";
import { toast } from "react-toastify";
import { useAuth, useUser } from "@clerk/clerk-react";
import { getUnreadMessageCounts } from "../../lib/queries/notifications";

export default function AssureurReports() {
  const { ctx, loading } = useInsurerContext();
  const { getToken } = useAuth();
  const { user } = useUser();
  
  // ✅ State unique pour les badges (Image d2b625.png)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [insurerAgentId, setInsurerAgentId] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const [consultations, setConsultations] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("sent");
  const [clinicId, setClinicId] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [clinics, setClinics] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [pricingProcessingId, setPricingProcessingId] = useState<string | null>(null);

  // 1. Charger la liste des cliniques
  useEffect(() => {
    getAllClinics().then(setClinics).catch(console.error);
  }, []);

  // 2. Charger l'ID interne de l'agent
  useEffect(() => {
    const loadAgentId = async () => {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from("insurer_staff")
        .select("id")
        .eq("clerk_user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("[AssureurReports] insurer_staff lookup error:", error);
        return;
      }
      setInsurerAgentId(data?.id ?? null);
    };
    loadAgentId();
  }, [user?.id]);

  // 3. ✅ SUBSCRIPTION REALTIME (Image d2b625.png & instructions)
  useEffect(() => {
    if (!insurerAgentId) return;

    const channel = supabase
      .channel(`notif-live-insurer-${insurerAgentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${insurerAgentId}`,
        },
        async () => {
          // ✅ Refresh dès qu'une notification arrive ou change
          const counts = await getUnreadMessageCounts(insurerAgentId);
          setUnreadCounts(counts);
          console.log("[AssureurReports] Realtime counts updated"); // Log diagnostic
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [insurerAgentId]);

  // 4. Charger les compteurs initiaux
  useEffect(() => {
    const loadCounts = async () => {
      if (!insurerAgentId) return;
      const counts = await getUnreadMessageCounts(insurerAgentId);
      setUnreadCounts(counts);
    };
    loadCounts();
  }, [insurerAgentId]);

  // 5. Récupération des consultations
  const fetchConsultations = async () => {
    if (!ctx?.insurerId) return;
    const payload = { search, status, clinicId, dateStart, dateEnd, insurerId: ctx.insurerId };
    setIsLoading(true);

    try {
      const token = await getToken({ template: "supabase" });
      if (!token) throw new Error("Clerk token introuvable.");

      const res = await fetch(
        "https://zwxegqevthzfphdqtjew.supabase.co/functions/v1/filter-consultations",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);
      const { data } = await res.json();
      setConsultations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("⛔ Erreur fetchConsultations:", err);
      setConsultations([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (ctx?.insurerId) fetchConsultations();
  }, [ctx?.insurerId]);

  // 6. Actions
  const handleComputePricing = async (id: string) => {
    if (!ctx?.insurerId) return;
    setPricingProcessingId(id);
    try {
      const { error } = await supabase.rpc("compute_consultation_pricing", {
        p_consultation_id: id,
        p_context: "private_weekday",
        p_case: "acute",
      });
      if (error) throw error;
      toast.success("Pricing calculé.");
      await fetchConsultations();
    } catch (e) {
      toast.error("Erreur calcul pricing.");
    } finally {
      setPricingProcessingId(null);
    }
  };

  const handleValidate = async (id: string) => {
    if (!window.confirm("Confirmer la validation ?")) return;
    setProcessingId(id);
    try {
      const { error } = await supabase
        .from("consultations")
        .update({ status: "accepted", insurer_decision_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      toast.success("Consultation validée.");
      await fetchConsultations();
    } catch (e) {
      toast.error("Erreur validation.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Raison du rejet ?");
    if (!reason) return;
    setProcessingId(id);
    try {
      const { error } = await supabase
        .from("consultations")
        .update({ status: "rejected", insurer_comment: reason, insurer_decision_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      toast.success("Consultation rejetée.");
      await fetchConsultations();
    } catch (e) {
      toast.error("Erreur rejet.");
    } finally {
      setProcessingId(null);
    }
  };

  // 7. ✅ handleOpenDetails (Image d2b625.png & image_872171.png)
  const handleOpenDetails = async (id: string) => {
    if (insurerAgentId) {
      // 1. Marquer comme lu en DB
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", insurerAgentId)
        .eq("type", "message")
        .eq("read", false)
        .contains("metadata", { consultation_id: id });

      if (error) {
        console.error("[AssureurReports] mark read error:", error);
      } else {
        // 2. ✅ REFRESH IMMEDIAT des counts (Image d2b625.png)
        const counts = await getUnreadMessageCounts(insurerAgentId);
        setUnreadCounts(counts);
      }
    }
    navigate(`/assureur/consultations/${id}`);
  };

  if (loading) return <p className="p-6">Chargement...</p>;
  if (!ctx) return <p className="p-6">Aucun assureur attaché.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="🔍 Rechercher..."
          className="border rounded px-4 py-2 w-full"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          onClick={fetchConsultations}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? "Chargement..." : "Rechercher"}
        </button>
      </div>

      <FiltersPopover
        status={status} setStatus={setStatus}
        clinicId={clinicId} setClinicId={setClinicId}
        dateStart={dateStart} setDateStart={setDateStart}
        dateEnd={dateEnd} setDateEnd={setDateEnd}
        clinics={clinics}
      />

      <ConsultationTable
        consultations={consultations}
        onValidate={handleValidate}
        onReject={handleReject}
        processingId={processingId}
        onOpenDetails={handleOpenDetails}
        onComputePricing={handleComputePricing}
        pricingProcessingId={pricingProcessingId}
        unreadCounts={unreadCounts} // ✅ Passe l'état propre
      />
    </div>
  );
}