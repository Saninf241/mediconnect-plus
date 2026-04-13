// src/Pages/multispecialist/doctor/HistoriqueActesPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../lib/supabase";
import { useDoctorContext } from "../../../hooks/useDoctorContext";
import { getUnreadMessageCounts, markConsultationNotificationsAsRead, type UnreadByConsultation,} from "../../../lib/queries/notifications";

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
  const [coverageFilter, setCoverageFilter] = useState<string>("");
  const [unreadByConsultation, setUnreadByConsultation] = useState<UnreadByConsultation>({});  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // 1. Chargement initial des consultations
  useEffect(() => {
    const fetchConsultations = async () => {
      if (!doctorInfo?.doctor_id) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("consultations")
        .select(`
          id,
          created_at,
          amount,
          status,
          fingerprint_missing,
          insurer_id,
          patients ( name )
        `)
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

  // 2. REALTIME & INITIAL UNREAD COUNTS (Image 872171.png & Log Bonus)
  useEffect(() => {
    if (!doctorInfo?.doctor_id) return;

    let alive = true;
    const doctorId = doctorInfo.doctor_id;

    const loadCounts = async () => {
      const counts = await getUnreadMessageCounts(doctorId);
      if (alive) {
        setUnreadByConsultation(counts);
        // LOG BONUS (Image ec0e50.png)
        console.log("[HistoriqueActesPage] counts refreshed for doctor:", doctorId);
      }
    };

    loadCounts();

    const channel = supabase
      .channel(`notif-live-doctor-${doctorId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${doctorId}`,
        },
        () => {
          loadCounts();
        }
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [doctorInfo?.doctor_id]);

  // 3. Filtrage des données
  const filtered = useMemo(() => {
    let result = [...rows];

    if (search.trim()) {
      const s = search.trim().toLowerCase();
      result = result.filter((r) => r.patientName.toLowerCase().includes(s));
    }

    if (statusFilter) {
      result = result.filter((r) => r.status === statusFilter);
    }

    if (coverageFilter === "assured") {
      result = result.filter((r) => r.isAssured);
    } else if (coverageFilter === "unassured") {
      result = result.filter((r) => !r.isAssured);
    }

    result.sort((a, b) => {
      const aUnread = unreadByConsultation[a.id]?.count || 0;
      const bUnread = unreadByConsultation[b.id]?.count || 0;

      if (aUnread > 0 && bUnread === 0) return -1;
      if (aUnread === 0 && bUnread > 0) return 1;

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return result;
  }, [rows, search, statusFilter, coverageFilter, unreadByConsultation]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage]);

  // 4. LOGIQUE DE MARQUAGE COMME LU ET NAVIGATION (Image d2adc7.png)
  const handleOpenDetails = async (consultationId: string) => {
    if (doctorInfo?.doctor_id) {
      const doctorId = doctorInfo.doctor_id;

      await markConsultationNotificationsAsRead(doctorId, consultationId);

      const counts = await getUnreadMessageCounts(doctorId);
      setUnreadByConsultation(counts);
    }

    navigate(`/multispecialist/doctor/consultations/${consultationId}`);
  };

  useEffect(() => {
  setCurrentPage(1);
}, [search, statusFilter, coverageFilter]);

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
            {loading ? (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-500 text-sm">
                  Chargement des consultations…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-500 text-sm">
                  Aucune consultation trouvée.
                </td>
              </tr>
            ) : (
              paginatedRows.map((c) => (
                <tr key={c.id} className="border-t text-sm">
                  <td className="p-3">{new Date(c.created_at).toLocaleString()}</td>
                  <td className="p-3">{c.patientName}</td>
                  <td className="p-3 text-right">
                    {c.amount != null ? `${c.amount.toLocaleString("fr-FR")} FCFA` : "—"}
                  </td>
                  <td className="p-3 capitalize">{c.status}</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${c.isAssured ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {c.isAssured ? "Assuré" : "Non assuré"}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${c.fingerprintMissing ? 'bg-orange-100 text-orange-700' : 'bg-green-50 text-green-700'}`}>
                      {c.fingerprintMissing ? "Sans empreinte" : "OK"}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleOpenDetails(c.id)}
                      className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 inline-flex items-center gap-2"
                    >
                      Voir
                      {/* BADGE (Image 3.3 / Image d2adc7.png) */}
                      {unreadByConsultation[c.id]?.hasDecision && (
                        <span className="inline-flex items-center rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                          Décision
                        </span>
                      )}

                      {unreadByConsultation[c.id]?.hasMessage && (
                        <span className="inline-flex items-center rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                          Message
                        </span>
                      )}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
        <div className="flex items-center justify-between pt-4">
    <p className="text-sm text-gray-500">
      Page {currentPage} sur {totalPages}
    </p>

    <div className="flex gap-2">
      <button
        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
        disabled={currentPage === 1}
        className="px-3 py-1 rounded border disabled:opacity-50"
      >
        Précédent
      </button>

      <button
        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        disabled={currentPage === totalPages}
        className="px-3 py-1 rounded border disabled:opacity-50"
      >
        Suivant
      </button>
    </div>
  </div>
    </div>
  );
}