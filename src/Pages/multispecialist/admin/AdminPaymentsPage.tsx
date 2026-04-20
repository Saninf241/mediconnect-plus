import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useClinicId } from "../../../hooks/useClinicId";

type Status = "draft" | "sent" | "rejected" | "accepted" | "paid";

type Payment = {
  id: string;
  amount: number;
  date: string;                 // ISO
  doctor_name: string | null;
  status: Status;
  is_assured: boolean | null;   // pour les KPIs
};

export default function PaymentsPage() {
  const { clinicId, loadingClinic } = useClinicId();

  const [rows, setRows] = useState<Payment[]>([]);
  const [period, setPeriod] = useState("30");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (loadingClinic) return;
    if (!clinicId) { setLoading(false); return; }

    const load = async () => {
      setLoading(true);
      setErr(null);

      // --------- PLAN A: payments ----------
      const p = await supabase
        .from("payments")
        .select("*")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false });

      if (!p.error && Array.isArray(p.data)) {
        const mapped: Payment[] = p.data.map((r: any) => ({
          id: r.id,
          amount: Number(r.amount) || 0,
          date: (r.paid_at || r.date || r.created_at || new Date().toISOString()),
          doctor_name: r.doctor_name || r.doctor || r.staff_name || null,
          status: (r.status || "paid") as Status,
          is_assured: r.patient_is_assured ?? r.is_assured ?? null,
        }));
        setRows(mapped);
        setLoading(false);
        return;
      }

      // --------- PLAN B (fallback): consultations ----------
      const c = await supabase
        .from("consultations")
        .select(`
          id, amount, status, created_at, clinic_id,
          patients ( is_assured ),
          clinic_staff ( name )
        `)
        .eq("clinic_id", clinicId)
        .in("status", ["accepted", "paid"])
        .order("created_at", { ascending: false });

      if (c.error) {
        console.error("[Payments] consultations error:", c.error);
        setErr("Impossible de charger les paiements.");
        setRows([]);
      } else {
        const mapped: Payment[] = (c.data || []).map((r: any) => {
          const staff = Array.isArray(r.clinic_staff) ? r.clinic_staff[0] : r.clinic_staff;
          const pat = Array.isArray(r.patients) ? r.patients[0] : r.patients;
          return {
            id: r.id,
            amount: Number(r.amount) || 0,
            date: r.created_at,
            doctor_name: staff?.name || null,
            status: (r.status || "accepted") as Status,
            is_assured: pat?.is_assured ?? null,
          };
        });
        setRows(mapped);
      }
      setLoading(false);
    };

    load();
  }, [clinicId, loadingClinic]);

  // --------- filtrage par période ----------
  const filtered = useMemo(() => {
    const n = parseInt(period, 10);
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(now.getDate() - (isNaN(n) ? 30 : n));
    return rows.filter((r) => new Date(r.date) >= cutoff);
  }, [rows, period]);

  // --------- KPIs ----------
  const kpi = useMemo(() => {
    let paid = 0, paidAssured = 0, paidUnassured = 0, forecastInsurer = 0;
    for (const r of filtered) {
      const amt = Number(r.amount) || 0;
      if (r.status === "paid") {
        paid += amt;
        if (r.is_assured === true) paidAssured += amt;
        if (r.is_assured === false) paidUnassured += amt;
      }
      // prévisionnel: dossiers assurés acceptés mais pas encore payés
      if (r.status === "accepted" && r.is_assured === true) {
        forecastInsurer += amt;
      }
    }
    return { paid, paidAssured, paidUnassured, forecastInsurer };
  }, [filtered]);

  const statusBadge = (s: Status) => {
    const base = "px-2 py-1 rounded-full text-xs font-semibold";
    switch (s) {
      case "paid":     return <span className={`${base} bg-green-100 text-green-700`}>paid</span>;
      case "accepted": return <span className={`${base} bg-blue-100 text-blue-700`}>accepted</span>;
      case "sent":     return <span className={`${base} bg-yellow-100 text-yellow-700`}>sent</span>;
      case "draft":    return <span className={`${base} bg-gray-100 text-gray-700`}>draft</span>;
      case "rejected": return <span className={`${base} bg-red-100 text-red-700`}>rejected</span>;
      default:         return <span className={`${base} bg-gray-100 text-gray-700`}>{s}</span>;
    }
  };

  if (loadingClinic || loading) return <div className="p-6">Chargement…</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Paiements & encaissements</h2>

      {/* Filtres + KPIs */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <label>Période :</label>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="border rounded px-2 py-1">
          <option value="7">7 jours</option>
          <option value="30">30 jours</option>
          <option value="90">90 jours</option>
        </select>

        <div className="ml-auto flex gap-6 text-sm">
          <div>Total payé : <b>{kpi.paid.toLocaleString()} FCFA</b></div>
          <div>Dont assurés : <b>{kpi.paidAssured.toLocaleString()} FCFA</b></div>
          <div>Dont non-assurés : <b>{kpi.paidUnassured.toLocaleString()} FCFA</b></div>
          <div>Prévisionnel assureur : <b>{kpi.forecastInsurer.toLocaleString()} FCFA</b></div>
        </div>
      </div>

      {err && <div className="mb-3 text-red-600 text-sm">{err}</div>}

      <div className="bg-white shadow rounded overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-3">Médecin</th>
              <th className="p-3">Montant</th>
              <th className="p-3">Date</th>
              <th className="p-3">Statut</th>
              <th className="p-3">Assuré</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length ? (
              filtered.map((p) => (
                <tr key={p.id} className="border-t text-sm">
                  <td className="p-3">{p.doctor_name || "—"}</td>
                  <td className="p-3">{(Number(p.amount) || 0).toLocaleString()} FCFA</td>
                  <td className="p-3">{new Date(p.date).toLocaleDateString("fr-FR")}</td>
                  <td className="p-3">{statusBadge(p.status)}</td>
                  <td className="p-3">{p.is_assured === true ? "Oui" : p.is_assured === false ? "Non" : "—"}</td>
                </tr>
              ))
            ) : (
              <tr><td className="p-3 text-gray-500" colSpan={5}>Aucune donnée pour cette période.</td></tr>
            )}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="border-t font-semibold">
                <td className="p-3">Total période</td>
                <td className="p-3">{kpi.paid.toLocaleString()} FCFA</td>
                <td className="p-3" colSpan={3}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
