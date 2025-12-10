// src/Pages/multispecialist/doctor/HistoriqueActesPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../lib/supabase";
import { useDoctorContext } from "../../../hooks/useDoctorContext";

type RawConsultation = {
  id: string;
  created_at: string;
  amount: number | null;
  status: string;
  fingerprint_missing: boolean | null;
  insurer_id: string | null;
  patients: { name?: string | null } | null;
};

type ConsultationRow = {
  id: string;
  created_at: string;
  amount: number | null;
  status: string;
  patientName: string;
  isAssured: boolean;
  fingerprintMissing: boolean;
};

export default function HistoriqueActesPage() {
  const doctorInfo = useDoctorContext();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ConsultationRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [coverageFilter, setCoverageFilter] = useState<string>(""); // "", "assured", "unassured"

  useEffect(() => {
    const fetchConsultations = async () => {
      if (!doctorInfo?.doctor_id) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("consultations")
        .select(
          `
          id,
          created_at,
          amount,
          status,
          fingerprint_missing,
          insurer_id,
          patients ( name )
        `
        )
        .eq("doctor_id", doctorInfo.doctor_id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[HistoriqueActesPage] error:", error);
        setRows([]);
        setLoading(false);
        return;
      }

      const formatted: ConsultationRow[] =
        (data as RawConsultation[]).map((c) => ({
          id: c.id,
          created_at: c.created_at,
          amount: c.amount,
          status: c.status,
          patientName: c.patients?.name || "—",
          isAssured: !!c.insurer_id,
          fingerprintMissing: !!c.fingerprint_missing,
        })) || [];

      setRows(formatted);
      setLoading(false);
    };

    fetchConsultations();
  }, [doctorInfo]);

  const filtered = useMemo(() => {
    let result = [...rows];

    if (search.trim()) {
      const s = search.trim().toLowerCase();
      result = result.filter((r) =>
        r.patientName.toLowerCase().includes(s)
      );
    }

    if (statusFilter) {
      result = result.filter((r) => r.status === statusFilter);
    }

    if (coverageFilter === "assured") {
      result = result.filter((r) => r.isAssured);
    } else if (coverageFilter === "unassured") {
      result = result.filter((r) => !r.isAssured);
    }

    return result;
  }, [rows, search, statusFilter, coverageFilter]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Historique des consultations</h1>

      {/* Filtres */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
        <input
          type="text"
          placeholder="🔍 Nom du patient"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border p-2 rounded"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">Tous statuts</option>
          <option value="draft">Brouillon</option>
          <option value="sent">Envoyée</option>
          <option value="accepted">Acceptée</option>
          <option value="rejected">Rejetée</option>
          <option value="paid">Payée</option>
        </select>

        <select
          value={coverageFilter}
          onChange={(e) => setCoverageFilter(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">Tous patients</option>
          <option value="assured">Assurés</option>
          <option value="unassured">Non assurés</option>
        </select>

        {/* Espaces vides pour aligner sur 5 colonnes */}
        <div />
        <div />
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto mt-4">
        <table className="min-w-full border bg-white">
          <thead>
            <tr className="bg-gray-100 text-sm">
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Patient</th>
              <th className="p-3 text-right">Montant</th>
              <th className="p-3 text-left">Statut</th>
              <th className="p-3 text-left">Assureur</th>
              <th className="p-3 text-left">Empreinte</th>
              <th className="p-3 text-center">Détails</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={7}
                  className="p-4 text-center text-gray-500 text-sm"
                >
                  Chargement des consultations…
                </td>
              </tr>
            )}

            {!loading &&
              filtered.map((c) => (
                <tr key={c.id} className="border-t text-sm">
                  <td className="p-3">
                    {new Date(c.created_at).toLocaleString()}
                  </td>
                  <td className="p-3">{c.patientName}</td>
                  <td className="p-3 text-right">
                    {c.amount != null
                      ? `${c.amount.toLocaleString("fr-FR")} FCFA`
                      : "—"}
                  </td>
                  <td className="p-3 capitalize">{c.status}</td>
                  <td className="p-3">
                    {c.isAssured ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                        Assuré
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        Non assuré
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    {c.fingerprintMissing ? (
                      <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-700">
                        Sans empreinte
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">
                        OK
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() =>
                        navigate(
                          `/multispecialist/doctor/consultations/${c.id}`
                        )
                      }
                      className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700"
                    >
                      Voir
                    </button>
                  </td>
                </tr>
              ))}

            {!loading && filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="p-4 text-center text-gray-500 text-sm"
                >
                  Aucune consultation trouvée.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
