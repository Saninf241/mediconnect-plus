// src/pages/multispecialist/admin/AlertsPage.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useClinicId } from "../../../hooks/useClinicId";

type Status = "draft" | "sent" | "rejected" | "accepted" | "paid" | null;

type Row = {
  id: string;
  created_at: string;
  status: Status;
  patient_id: string | null;
  doctor_id: string | null;
  rejection_reason?: string | null;
  patients?:
    | { name?: string | null; is_assured?: boolean | null; has_fingerprint?: boolean | null }
    | Array<{ name?: string | null; is_assured?: boolean | null; has_fingerprint?: boolean | null }>
    | null;
  clinic_staff?: { name?: string | null } | Array<{ name?: string | null }> | null;
};

export default function AlertsPage() {
  const { clinicId, loadingClinic } = useClinicId();
  const clinicIdStr = useMemo(() => {
    const c: any = clinicId;
    return typeof c === "string" ? c : c?.id || c?.clinic_id || c?.clinic?.id || null;
  }, [clinicId]);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (loadingClinic) return;
    if (!clinicIdStr) {
      setLoading(false);
      setErr("Cabinet introuvable (clinicId manquant).");
      return;
    }

    const load = async () => {
      setLoading(true);
      setErr(null);

      const { data, error } = await supabase
        .from("consultations")
        .select(
          `
          id, created_at, status, patient_id, doctor_id, rejection_reason,
          patients ( name, is_assured, has_fingerprint ),
          clinic_staff ( name )
        `
        )
        .eq("clinic_id", clinicIdStr)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erreur Supabase (alerts):", error);
        setErr("Impossible de charger les alertes.");
        setRows([]);
        setLoading(false);
        return;
      }

      const normalized: Row[] = (data || []).map((r: any) => ({
        ...r,
        patients: Array.isArray(r.patients) ? r.patients[0] ?? null : r.patients ?? null,
        clinic_staff: Array.isArray(r.clinic_staff) ? r.clinic_staff[0] ?? null : r.clinic_staff ?? null,
      }));

      // Règles d’alerte :
      // - statut rejeté
      // - patient/doctor manquant
      // - (facultatif) assuré sans empreinte si la colonne patient.has_fingerprint existe
      const onlyAlerts = normalized.filter((c) => {
        const p: any = c.patients || {};
        const hasFingerprintField = Object.prototype.hasOwnProperty.call(p, "has_fingerprint");
        const assuredNoFp =
          hasFingerprintField && (p?.is_assured ?? false) && (p?.has_fingerprint === false);

        const rejected = c.status === "rejected";
        const missingRefs = !c.patient_id || !c.doctor_id;

        return rejected || missingRefs || assuredNoFp;
      });

      setRows(onlyAlerts);
      setLoading(false);
    };

    load();
  }, [clinicIdStr, loadingClinic]);

  const reason = (c: Row) => {
    const p: any = c.patients || {};
    const hasFingerprintField = Object.prototype.hasOwnProperty.call(p, "has_fingerprint");
    if (hasFingerprintField && p?.is_assured && p?.has_fingerprint === false)
      return "Assuré sans empreinte";
    if (c.status === "rejected")
      return c.rejection_reason?.trim()
        ? `Rejeté — ${c.rejection_reason}`
        : "Rejeté";
    if (!c.doctor_id) return "Médecin manquant";
    if (!c.patient_id) return "Patient manquant";
    return "—";
  };

  const statusBadge = (s?: Status) => {
    const base = "px-2 py-1 rounded text-xs";
    switch (s) {
      case "accepted":
        return <span className={`${base} bg-green-100 text-green-700`}>accepted</span>;
      case "rejected":
        return <span className={`${base} bg-red-100 text-red-700`}>rejected</span>;
      case "sent":
        return <span className={`${base} bg-yellow-100 text-yellow-700`}>sent</span>;
      case "paid":
        return <span className={`${base} bg-emerald-100 text-emerald-700`}>paid</span>;
      case "draft":
        return <span className={`${base} bg-gray-100 text-gray-700`}>draft</span>;
      default:
        return <span className={`${base} bg-gray-100 text-gray-700`}>{s || "—"}</span>;
    }
  };

  if (loadingClinic || loading) return <div className="p-6">Chargement…</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Alertes et incohérences</h2>

      {err ? (
        <p className="text-red-600">{err}</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Patient</th>
                <th className="p-3">Médecin</th>
                <th className="p-3">Statut</th>
                <th className="p-3">Motif</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-gray-50">
                    <td className="p-3">{new Date(r.created_at).toLocaleString("fr-FR")}</td>
                    <td className="p-3">{(r.patients as any)?.name || "—"}</td>
                    <td className="p-3">{(r.clinic_staff as any)?.name || "—"}</td>
                    <td className="p-3">{statusBadge(r.status)}</td>
                    <td className="p-3 text-red-600 font-medium">{reason(r)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="p-3" colSpan={5}>Aucune alerte pour l’instant.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

