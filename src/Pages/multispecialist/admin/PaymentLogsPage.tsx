// src/pages/multispecialist/admin/PaymentLogsPage.tsx

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useClinicId } from "../../../hooks/useClinicId";

type PaymentLogStatus = "draft" | "sent" | "rejected" | "accepted" | "paid" | null;

interface PaymentLog {
  id: string;
  consultation_id: string | null;
  doctor_name: string | null;
  amount: number | null;
  status: PaymentLogStatus;
  comment: string | null;
  validated_at: string | null; // ISO
  clinic_id?: string;
}

const PaymentLogsPage = () => {
  const { clinicId, loadingClinic } = useClinicId(); // ✅
  const [logs, setLogs] = useState<PaymentLog[]>([]);
  const [period, setPeriod] = useState("30");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // -------- 1) Chargement des logs (scopés cabinet) --------
  useEffect(() => {
    if (loadingClinic) return;
    if (!clinicId) { setLoading(false); return; }

    const clinicIdStr =
      typeof clinicId === "string" ? clinicId : (clinicId as any)?.id || (clinicId as any)?.clinic_id || null;
    if (!clinicIdStr) { setLoading(false); return; }

    const fetchLogs = async () => {
      setLoading(true);
      setErr(null);

      // Plan A: table payment_logs si elle existe
      const p = await supabase
        .from("payment_logs")
        .select("id, consultation_id, doctor_name, amount, status, comment, validated_at, clinic_id")
        .eq("clinic_id", clinicIdStr)
        .order("validated_at", { ascending: false });

      if (!p.error && Array.isArray(p.data)) {
        setLogs(p.data as PaymentLog[]);
        setLoading(false);
        return;
      }

      // Si erreur 42P01 → la table n'existe pas : fallback consultations
      if (p.error && p.error.code !== "42P01") {
        console.error("[payment_logs] error:", p.error);
        setErr("Impossible de charger l'historique des validations.");
        setLogs([]);
        setLoading(false);
        return;
      }

      // Plan B: reconstruire depuis consultations (statuses connus)
      const c = await supabase
        .from("consultations")
        .select(`
          id, amount, status, created_at, clinic_id,
          clinic_staff ( name )
        `)
        .eq("clinic_id", clinicIdStr)
        .in("status", ["draft", "sent", "rejected", "accepted", "paid"])
        .order("created_at", { ascending: false });

      if (c.error) {
        console.error("[payments fallback] consultations error:", c.error);
        setErr("Impossible de charger l'historique des validations.");
        setLogs([]);
      } else {
        const mapped: PaymentLog[] = (c.data || []).map((r: any) => {
          const staff = Array.isArray(r.clinic_staff) ? r.clinic_staff[0] : r.clinic_staff;
          return {
            id: r.id,
            consultation_id: r.id,
            doctor_name: staff?.name ?? null,
            amount: Number(r.amount) || 0,
            status: (r.status || null) as PaymentLogStatus,
            comment: null,
            validated_at: r.created_at, // à défaut
            clinic_id: r.clinic_id,
          };
        });
        setLogs(mapped);
      }

      setLoading(false);
    };

    fetchLogs();
  }, [clinicId, loadingClinic]);

  // -------- 2) Filtrage par période (client) --------
  const filtered = useMemo(() => {
    const n = parseInt(period, 10);
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(now.getDate() - (isNaN(n) ? 30 : n));
    return logs.filter((l) => l.validated_at && new Date(l.validated_at) >= cutoff);
  }, [logs, period]);

  // -------- 3) Badges (5 statuts) --------
  const statusBadge = (s: PaymentLogStatus) => {
    const base = "px-2 py-1 rounded-full text-xs font-semibold";
    switch (s) {
      case "paid":     return <span className={`${base} bg-emerald-100 text-emerald-700`}>paid</span>;
      case "accepted": return <span className={`${base} bg-green-100 text-green-700`}>accepted</span>;
      case "sent":     return <span className={`${base} bg-yellow-100 text-yellow-700`}>sent</span>;
      case "rejected": return <span className={`${base} bg-red-100 text-red-700`}>rejected</span>;
      case "draft":    return <span className={`${base} bg-gray-100 text-gray-700`}>draft</span>;
      default:         return <span className={`${base} bg-gray-100 text-gray-700`}>—</span>;
    }
  };

  const totalFiltered = useMemo(
    () => filtered.reduce((s, l) => s + (Number(l.amount) || 0), 0),
    [filtered]
  );

  if (loadingClinic || loading) return <div className="p-6">Chargement…</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Historique des validations</h2>

      <div className="flex gap-4 items-center mb-6">
        <label>Période :</label>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="border rounded px-2 py-1">
          <option value="7">7 derniers jours</option>
          <option value="30">30 derniers jours</option>
          <option value="90">90 derniers jours</option>
        </select>
        <div className="ml-auto text-sm text-gray-600">
          Total période : <span className="font-semibold">{totalFiltered.toLocaleString()} FCFA</span>
        </div>
      </div>

      {err && <div className="mb-3 text-red-600 text-sm">{err}</div>}

      <div className="bg-white shadow rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-3">Médecin</th>
              <th className="p-3">Montant</th>
              <th className="p-3">Statut</th>
              <th className="p-3">Date</th>
              <th className="p-3">Commentaire</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length ? (
              filtered.map((log) => (
                <tr key={log.id} className="border-t">
                  <td className="p-3">{log.doctor_name || "—"}</td>
                  <td className="p-3">{(Number(log.amount) || 0).toLocaleString()} FCFA</td>
                  <td className="p-3">{statusBadge(log.status)}</td>
                  <td className="p-3">{log.validated_at ? new Date(log.validated_at).toLocaleString("fr-FR") : "—"}</td>
                  <td className="p-3 text-gray-600 italic">{log.comment?.trim() || "—"}</td>
                </tr>
              ))
            ) : (
              <tr><td className="p-3 text-gray-500" colSpan={5}>Aucune validation enregistrée sur cette période.</td></tr>
            )}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="border-t font-semibold">
                <td className="p-3">Total</td>
                <td className="p-3">{totalFiltered.toLocaleString()} FCFA</td>
                <td className="p-3" colSpan={3}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

export default PaymentLogsPage;
