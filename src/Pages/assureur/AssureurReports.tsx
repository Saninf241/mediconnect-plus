// src/Pages/assureur/AssureurReports.tsx
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useInsurerContext } from "../../hooks/useInsurerContext";
import ConsultationTable from "../../components/ui/ConsultationTable";
import FiltersPopover from "../../components/ui/FiltersPopover";
import { getAllClinics } from "../../lib/queries/clinics";

export default function AssureurReports() {
  const { ctx, loading } = useInsurerContext();

  const [consultations, setConsultations] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("sent");
  const [clinicId, setClinicId] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [clinics, setClinics] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Debug contexte
  useEffect(() => {
    console.log("[AssureurReports] Contexte assureur :", ctx, "loading:", loading);
  }, [ctx, loading]);

  // Charger la liste des cliniques (pour le filtre)
  useEffect(() => {
    getAllClinics()
      .then(setClinics)
      .catch(console.error);
  }, []);

  const fetchConsultations = async () => {
    if (!ctx?.insurerId) {
      console.warn("[AssureurReports] Pas d'insurerId → pas d'appel à la fonction.");
      setConsultations([]);
      return;
    }

    const payload = {
      search,
      status,
      clinicId,
      dateStart,
      dateEnd,
      insurerId: ctx.insurerId, // envoyé mais utilisé seulement pour debug côté Edge
    };

    console.log("▶️ Payload envoyé à filter-consultations :", payload);
    setIsLoading(true);

    try {
      const res = await fetch(
        "https://zwxegqevthzfphdqtjew.supabase.co/functions/v1/filter-consultations",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Erreur HTTP ${res.status} : ${text}`);
      }

      const { data } = await res.json();
      const raw = Array.isArray(data) ? data : [];

      console.log(
        "✅ DATA reçue de filter-consultations (id + insurer_id):",
        raw.map((r: any) => ({ id: r.id, insurer_id: r.insurer_id }))
      );

      // ✅ Filtre local : ne garder que les consultations de CET assureur
      const filtered = raw.filter(
        (row: any) =>
          row.insurer_id && String(row.insurer_id) === String(ctx.insurerId)
      );

      console.log(
        "✅ Lignes après filtre local par insurer_id =",
        ctx.insurerId,
        "=>",
        filtered
      );

      setConsultations(filtered);
    } catch (err) {
      console.error("⛔ Erreur lors de la récupération :", err);
      setConsultations([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Premier chargement quand le contexte assureur est prêt
  useEffect(() => {
    if (ctx?.insurerId && !loading) {
      fetchConsultations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.insurerId, loading]);

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
      />
    </div>
  );
}

