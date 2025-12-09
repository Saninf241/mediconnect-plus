// src/Pages/assureur/AssureurReports.tsx
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useInsurerContext } from "../../hooks/useInsurerContext";
import ConsultationTable from "../../components/ui/ConsultationTable";
import FiltersPopover from "../../components/ui/FiltersPopover";
import { getAllClinics } from "../../lib/queries/clinics";

export default function AssureurReports() {
  // ✅ on récupère ctx ET loading depuis le hook
  const { ctx, loading } = useInsurerContext();

  const [consultations, setConsultations] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("sent");
  const [clinicId, setClinicId] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [clinics, setClinics] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Debug : voir le contexte assureur
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
    // on attend que le hook ait fini
    if (loading) {
      console.log("[AssureurReports] Contexte en chargement, on attend…");
      return;
    }

    if (!ctx?.insurerId) {
      console.warn("[AssureurReports] Pas d'insurerId, on n'appelle pas filter-consultations.");
      return;
    }

    const payload = {
      search,
      status,
      clinicId,
      dateStart,
      dateEnd,
      insurerId: ctx.insurerId, // ✅ clé pour filtrer côté Edge Function
    };

    console.log("▶️ Payload envoyé à filter-consultations :", payload);
    setIsLoading(true);

    try {
      const res = await fetch(
        "https://zwxegqevthzfphdqtjew.supabase.co/functions/v1/filter-consultations",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Erreur HTTP ${res.status} : ${text}`);
      }

      const { data } = await res.json();
      console.log("✅ DATA reçue de filter-consultations:", data);
      setConsultations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("⛔ Erreur lors de la récupération :", err);
      setConsultations([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Premier chargement quand le contexte assureur est prêt
  useEffect(() => {
    if (!loading && ctx?.insurerId) {
      fetchConsultations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, ctx?.insurerId]);

  const handleValidate = async (id: string) => {
    const { error } = await supabase
      .from("consultations")
      .update({
        status: "accepted",
        insurer_decision_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (!error) fetchConsultations();
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Raison du rejet ?") || null;
    if (!reason) return;

    const { error } = await supabase
      .from("consultations")
      .update({
        status: "rejected",
        insurer_comment: reason,
        insurer_decision_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (!error) fetchConsultations();
  };

  // États d'attente / erreur de contexte
  if (loading) {
    return <p className="p-6">Chargement du compte assureur…</p>;
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
      />
    </div>
  );
}
