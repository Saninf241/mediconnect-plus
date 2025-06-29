import { useEffect, useState } from "react";
import ConsultationTable from "../../components/ui/ConsultationTable";
import FiltersPopover from "../../components/ui/FiltersPopover";
import { getAllClinics } from "../../lib/queries/clinics";

export default function AssureurReports() {
  const [consultations, setConsultations] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [clinicId, setClinicId] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [clinics, setClinics] = useState<{ id: string; name: string }[]>([]);

  const fetchConsultations = async () => {
    try {
      const res = await fetch("https://zwxegqevthzfphdqtjew.supabase.co/functions/v1/filter-consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ search, status, clinicId, dateStart, dateEnd }),
      });

      const { data } = await res.json(); // <- important

      if (!Array.isArray(data)) {
        throw new Error("Les données de consultation ne sont pas un tableau.");
      }

      setConsultations(data);
    } catch (err) {
      console.error("Erreur lors de la récupération des consultations :", err);
      setConsultations([]);
    }
  };

  const handleValidate = async (id: string) => {
    await fetch("https://zwxegqevthzfphdqtjew.supabase.co/functions/v1/validate-consultation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "accepted" }),
    });
    fetchConsultations();
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Raison du rejet ?");
    if (!reason) return;
    await fetch("https://zwxegqevthzfphdqtjew.supabase.co/functions/v1/validate-consultation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "rejected", rejection_reason: reason }),
    });
    fetchConsultations();
  };

  useEffect(() => {
    fetchConsultations();
    getAllClinics().then(setClinics).catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="🔍 Rechercher par nom, médecin, clinique..."
          className="border rounded px-4 py-2 w-full"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          onClick={fetchConsultations}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Rechercher
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
