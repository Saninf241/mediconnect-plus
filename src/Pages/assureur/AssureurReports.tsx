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
      console.warn("[AssureurReports] Pas d'insurerId → pas de requête.");
      setConsultations([]);
      return;
    }

    setIsLoading(true);

    try {
      let q = supabase
        .from("consultations")
        .select(
          `
          id,
          created_at,
          amount,
          status,
          pdf_url,
          insurer_id,
          patient_id,
          doctor_id,
          clinic_id,
          patients ( name ),
          clinic_staff ( name ),
          clinics ( name )
        `
        )
        // ✅ très important : on ne ramène que les consultations de CET assureur
        .eq("insurer_id", ctx.insurerId);

      if (status) q = q.eq("status", status);
      if (clinicId) q = q.eq("clinic_id", clinicId);
      if (dateStart) q = q.gte("created_at", dateStart);
      if (dateEnd) q = q.lte("created_at", dateEnd);

      if (search.trim()) {
        const s = `%${search.trim()}%`;
        // filtre sur nom patient / médecin / clinique
        q = q.or(
          `patients.name.ilike.${s},clinic_staff.name.ilike.${s},clinics.name.ilike.${s}`
        );
      }

      const { data, error } = await q.order("created_at", {
        ascending: false,
      });

      if (error) {
        console.error("⛔ Erreur lors de la récupération des consultations :", error);
        setConsultations([]);
        return;
      }

      console.log(
        "✅ Consultations brutes pour insurerId",
        ctx.insurerId,
        ":",
        data
      );
      setConsultations(data ?? []);
    } catch (err) {
      console.error("⛔ Exception fetchConsultations :", err);
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
        status: "accepted",                           // 👈 valeur ENUM correcte
        insurer_decision_at: new Date().toISOString()
      })
      .eq("id", id);

    if (error) {
      console.error("[Assureur] erreur validate :", error);
      return;
    }

    // on recharge la liste pour refléter le nouveau statut
    fetchConsultations();
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Raison du rejet ?") || null;
    if (!reason) return;

    const { error } = await supabase
      .from("consultations")
      .update({
        status: "rejected",                           // 👈 déjà OK
        insurer_comment: reason,
        insurer_decision_at: new Date().toISOString()
      })
      .eq("id", id);

    if (error) {
      console.error("[Assureur] erreur reject :", error);
      return;
    }

    fetchConsultations();
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

