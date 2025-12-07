// src/Pages/assureur/AssureurReports.tsx
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useInsurerContext } from "../../hooks/useInsurerContext";
import ConsultationTable from "../../components/ui/ConsultationTable";
import FiltersPopover from "../../components/ui/FiltersPopover";
import { getAllClinics } from "../../lib/queries/clinics";

export default function AssureurReports() {
  const { ctx } = useInsurerContext();
  const [consultations, setConsultations] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("sent");
  const [clinicId, setClinicId] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [clinics, setClinics] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // charger la liste des cliniques (pour les filtres)
  useEffect(() => {
    getAllClinics()
      .then(setClinics)
      .catch(console.error);
  }, []);

  const fetchConsultations = async () => {
    if (!ctx?.insurerId) return;
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
          insurer_comment,
          patient:patients(name),
          clinic:clinics(name)
        `
        )
        .eq("insurer_id", ctx.insurerId);

      if (status) q = q.eq("status", status);
      if (clinicId) q = q.eq("clinic_id", clinicId);
      if (dateStart) q = q.gte("created_at", dateStart);
      if (dateEnd) q = q.lte("created_at", dateEnd);

      if (search.trim()) {
        const s = `%${search.trim()}%`;
        // on filtre sur nom patient ou nom clinique
        q = q.or(
          `patient.name.ilike.${s},clinic.name.ilike.${s}`
        );
      }

      const { data, error } = await q.order("created_at", { ascending: false });

      if (error) {
        console.error("⛔ Erreur lors de la récupération :", error);
        setConsultations([]);
      } else {
        setConsultations(data || []);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // premier chargement
  useEffect(() => {
    if (ctx?.insurerId) {
      fetchConsultations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.insurerId]);

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
