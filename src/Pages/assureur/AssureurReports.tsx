// src/Pages/assureur/AssureurReports.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useInsurerContext } from "../../hooks/useInsurerContext";
import ConsultationTable from "../../components/ui/ConsultationTable";
import FiltersPopover from "../../components/ui/FiltersPopover";
import { getAllClinics } from "../../lib/queries/clinics";
import { toast } from "react-toastify";
import { useAuth } from "@clerk/clerk-react";
import { useUser } from "@clerk/clerk-react";
import { getUnreadMessageCounts } from "../../lib/queries/notifications";

export default function AssureurReports() {
  const { ctx, loading } = useInsurerContext();
  const { getToken } = useAuth();
  const { user } = useUser();

  const [insurerAgentId, setInsurerAgentId] = useState<string | null>(null);
  const [unreadByConsultation, setUnreadByConsultation] = useState<Record<string, number>>({});
  const navigate = useNavigate();

  const [consultations, setConsultations] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("sent");
  const [clinicId, setClinicId] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [clinics, setClinics] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // pour désactiver les boutons pendant l’action
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [pricingProcessingId, setPricingProcessingId] = useState<string | null>(null);

  // debug
  useEffect(() => {
    console.log("[AssureurReports] Contexte assureur :", ctx, "loading:", loading);
  }, [ctx, loading]);

  // Charger la liste des cliniques (pour les filtres)
  useEffect(() => {
    getAllClinics()
      .then(setClinics)
      .catch(console.error);
  }, []);

    const fetchConsultations = async () => {
      if (!ctx?.insurerId) {
        console.warn(
          "[AssureurReports] Pas d'insurerId, on n'appelle pas filter-consultations."
        );
        return;
      }

      const payload = {
        search,
        status,
        clinicId,
        dateStart,
        dateEnd,
        insurerId: ctx.insurerId,
      };

      console.log("▶️ Payload envoyé à filter-consultations :", payload);
      setIsLoading(true);

      try {
        // ✅ IMPORTANT : JWT ON => on doit envoyer Authorization
        const token = await getToken({ template: "supabase" });
        if (!token) {
          throw new Error("Clerk token introuvable. Vérifie le template JWT 'supabase'.");
        }

        const res = await fetch(
          "https://zwxegqevthzfphdqtjew.supabase.co/functions/v1/filter-consultations",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`, // ✅ FIX 401
            },
            body: JSON.stringify(payload),
          }
        );

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Erreur HTTP ${res.status} : ${text}`);
        }

        const { data } = await res.json();
        console.log("🔎 first row =", data?.[0]);
        console.log("✅ DATA reçue de filter-consultations:", data);
        setConsultations(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("⛔ Erreur lors de la récupération :", err);
        setConsultations([]);
      } finally {
        setIsLoading(false);
      }
    };

  useEffect(() => {
    const fetchAgentId = async () => {
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

    fetchAgentId();
  }, [user?.id]);

  useEffect(() => {
    if (!insurerAgentId) return;

    let alive = true;

    const loadCounts = async () => {
      const counts = await getUnreadMessageCounts(insurerAgentId);
      if (alive) setUnreadByConsultation(counts);
    };

    loadCounts();

    const channel = supabase
      .channel(`notif:message:${insurerAgentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${insurerAgentId}`,
        },
        () => {
          // Simple + robuste : recharger le compteur
          loadCounts();
        }
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [insurerAgentId]);

  // premier chargement quand le contexte assureur est prêt
  useEffect(() => {
    if (ctx?.insurerId) {
      fetchConsultations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.insurerId]);

  // 🔹 Calculer le pricing
  const handleComputePricing = async (id: string) => {
    if (!ctx?.insurerId) return;

    setPricingProcessingId(id);
    try {
      // 👉 DEMO: valeurs fixes (tu pourras les rendre dynamiques après)
      const p_context = "private_weekday";
      const p_case = "acute";

      console.log("[Assureur] compute pricing for", id, p_context, p_case);

      const { data, error } = await supabase.rpc("compute_consultation_pricing", {
        p_consultation_id: id,
        p_context,
        p_case,
      });

      if (error) {
        console.error("[Assureur] compute pricing error:", error);
        toast.error("Erreur calcul pricing (RPC).");
        return;
      }

      console.log("[Assureur] compute pricing result:", data);
      toast.success("Pricing calculé.");
      await fetchConsultations(); // ✅ indispensable pour voir 'computed'
    } catch (e) {
      console.error("[Assureur] compute pricing exception:", e);
      toast.error("Erreur inattendue calcul pricing.");
    } finally {
      setPricingProcessingId(null);
    }
  };

  // 🔹 Valider
  const handleValidate = async (id: string) => {
    if (!window.confirm("Confirmer la validation de cette consultation ?")) return;

    setProcessingId(id);
    try {
      const updates = {
        status: "accepted" as const, // enum: accepted / rejected / sent / draft / paid
        insurer_decision_at: new Date().toISOString(),
      };

      console.log("[Assureur] payload validate =", updates);

      const { error } = await supabase
        .from("consultations")
        .update(updates)
        .eq("id", id);

      if (error) {
        console.error("[Assureur] erreur validate :", error);
        toast.error("Impossible de valider la consultation.");
        return;
      }

      toast.success("Consultation validée.");
      await fetchConsultations();
    } catch (e) {
      console.error("[Assureur] exception validate :", e);
      toast.error("Erreur inattendue lors de la validation.");
    } finally {
      setProcessingId(null);
    }
  };

  // 🔹 Rejeter
  const handleReject = async (id: string) => {
    const reason = prompt("Raison du rejet ?") || null;
    if (!reason) return;

    setProcessingId(id);
    try {
      const updates = {
        status: "rejected" as const,
        insurer_comment: reason,
        insurer_decision_at: new Date().toISOString(),
      };

      console.log("[Assureur] payload reject =", updates);

      const { error } = await supabase
        .from("consultations")
        .update(updates)
        .eq("id", id);

      if (error) {
        console.error("[Assureur] erreur reject :", error);
        toast.error("Impossible de rejeter la consultation.");
        return;
      }

      toast.success("Consultation rejetée.");
      await fetchConsultations();
    } catch (e) {
      console.error("[Assureur] exception reject :", e);
      toast.error("Erreur inattendue lors du rejet.");
    } finally {
      setProcessingId(null);
    }
  };

  // 🔹 Ouvrir la page de détails (avec messagerie)
  const handleOpenDetails = async (id: string) => {
    // 1) Mark notifications as read for this consultation
    if (insurerAgentId) {
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
        // refresh local counts
        const counts = await getUnreadMessageCounts(insurerAgentId);
        setUnreadByConsultation(counts);
      }
    }

    // 2) Navigate
    navigate(`/assureur/consultations/${id}`);
  };

  if (loading) {
    return <p className="p-6">Chargement de l’espace assureur…</p>;
  }

  if (!ctx) {
    return <p className="p-6">Aucun assureur attaché à ce compte.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="🔍 Rechercher par nom, clinique..."
          className="border rounded px-4 py-2 w-full"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          onClick={fetchConsultations}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          disabled={isLoading}
        >
          {isLoading ? "Chargement..." : "Rechercher"}
        </button>
      </div>

      <FiltersPopover
        status={status}
        setStatus={setStatus}
        clinicId={clinicId}
        setClinicId={setClinicId}
        dateStart={dateStart}
        setDateStart={setDateStart}
        dateEnd={dateEnd}
        setDateEnd={setDateEnd}
        clinics={clinics}
      />

      <ConsultationTable
        consultations={consultations}
        onValidate={handleValidate}
        onReject={handleReject}
        processingId={processingId}
        onOpenDetails={handleOpenDetails}  // ✅ bouton "Ouvrir" → page détail + chat
        onComputePricing={handleComputePricing}
        pricingProcessingId={pricingProcessingId}
        unreadByConsultation={unreadByConsultation}
      />
    </div>
  );
}
