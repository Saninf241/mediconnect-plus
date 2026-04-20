// src/pages/multispecialist/admin/AdminDashboardPage.tsx
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { Card, CardContent } from "../../../components/ui/card";
import { useClinicId } from "../../../hooks/useClinicId";

interface StaffRow {
  id: string;
  name: string | null;
  role: string | null;
  clinic_id?: string | null;
}

interface ConsultationRow {
  id: string;
  clinic_id: string | null;
  doctor_id: string | null;
  patient_id: string | null;
  amount: number | null;
  status: string | null;
  created_at: string | null;
}

export default function AdminDashboardPage() {
  const { clinicId, loadingClinic } = useClinicId();

  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<string | null>(null);

  const [staffRows, setStaffRows] = useState<StaffRow[]>([]);
  const [consultations, setConsultations] = useState<ConsultationRow[]>([]);
  const [supportCount, setSupportCount] = useState(0);

  useEffect(() => {
    if (loadingClinic) return;

    const fetchDebugData = async () => {
      setLoading(true);
      setNote(null);

      try {
        if (!clinicId) {
          setNote("Aucun clinicId détecté pour ce compte admin.");
          setLoading(false);
          return;
        }

        console.log("[AdminDashboard DEBUG] clinicId détecté =", clinicId);

        // 1) Staff visible
        const staffRes = await supabase
          .from("clinic_staff")
          .select("id, name, role, clinic_id")
          .eq("clinic_id", clinicId);

        if (staffRes.error) {
          console.error("[DEBUG] clinic_staff error:", staffRes.error);
          setNote(`Erreur clinic_staff: ${staffRes.error.message}`);
          setStaffRows([]);
        } else {
          console.log("[DEBUG] clinic_staff visible:", staffRes.data);
          setStaffRows((staffRes.data ?? []) as StaffRow[]);
        }

        // 2) Consultations visibles pour ce clinic_id
        const consultationsRes = await supabase
          .from("consultations")
          .select("id, clinic_id, doctor_id, patient_id, amount, status, created_at")
          .eq("clinic_id", clinicId)
          .order("created_at", { ascending: false })
          .limit(20);

        if (consultationsRes.error) {
          console.error("[DEBUG] consultations error:", consultationsRes.error);
          setNote((prev) =>
            prev
              ? `${prev} | Erreur consultations: ${consultationsRes.error.message}`
              : `Erreur consultations: ${consultationsRes.error.message}`
          );
          setConsultations([]);
        } else {
          console.log("[DEBUG] consultations visibles:", consultationsRes.data);
          setConsultations((consultationsRes.data ?? []) as ConsultationRow[]);
        }

        // 3) Support
        const supportRes = await supabase
          .from("support_messages")
          .select("id")
          .eq("clinic_id", clinicId)
          .eq("status", "open");

        if (supportRes.error) {
          console.error("[DEBUG] support_messages error:", supportRes.error);
          setSupportCount(0);
        } else {
          setSupportCount(supportRes.data?.length ?? 0);
        }
      } catch (e) {
        console.error("[DEBUG] unexpected error:", e);
        setNote("Erreur inattendue lors du chargement du dashboard.");
      } finally {
        setLoading(false);
      }
    };

    fetchDebugData();
  }, [clinicId, loadingClinic]);

  if (loadingClinic || loading) {
    return <div className="p-6">Chargement du dashboard admin…</div>;
  }

  const doctors = staffRows.filter(
    (r) => (r.role ?? "").toString().trim().toLowerCase() === "doctor"
  );

  const statusCountMap = consultations.reduce<Record<string, number>>((acc, c) => {
    const key = (c.status ?? "null").toLowerCase();
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const totalAmount = consultations.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

  return (
    <div className="p-6 space-y-6">
      {note && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          {note}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold">Dashboard admin - Diagnostic</h1>
        <p className="text-sm text-gray-500">
          Vérification des données réellement visibles par le compte dirigeant
        </p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-2">
          <p><span className="font-semibold">clinicId détecté :</span> {clinicId || "Aucun"}</p>
          <p><span className="font-semibold">Lignes clinic_staff visibles :</span> {staffRows.length}</p>
          <p><span className="font-semibold">Médecins détectés :</span> {doctors.length}</p>
          <p><span className="font-semibold">Consultations visibles :</span> {consultations.length}</p>
          <p><span className="font-semibold">Montant total visible :</span> {totalAmount.toLocaleString("fr-FR")} FCFA</p>
          <p><span className="font-semibold">Demandes support ouvertes :</span> {supportCount}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold mb-3">Répartition des statuts visibles</h2>
          {Object.keys(statusCountMap).length === 0 ? (
            <p className="text-sm text-gray-500">Aucune consultation visible pour ce clinic_id.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(statusCountMap).map(([status, count]) => (
                <div key={status} className="rounded border p-3">
                  <p className="text-sm text-gray-500">{status}</p>
                  <p className="text-2xl font-bold">{count}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold mb-3">Membres visibles dans clinic_staff</h2>
          {staffRows.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune ligne visible.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2">ID</th>
                    <th className="py-2">Nom</th>
                    <th className="py-2">Rôle</th>
                    <th className="py-2">Clinic ID</th>
                  </tr>
                </thead>
                <tbody>
                  {staffRows.map((row) => (
                    <tr key={row.id} className="border-b">
                      <td className="py-2">{row.id}</td>
                      <td className="py-2">{row.name || "-"}</td>
                      <td className="py-2">{row.role || "-"}</td>
                      <td className="py-2">{row.clinic_id || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold mb-3">Dernières consultations visibles</h2>
          {consultations.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune consultation visible.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2">ID</th>
                    <th className="py-2">Doctor ID</th>
                    <th className="py-2">Patient ID</th>
                    <th className="py-2">Statut</th>
                    <th className="py-2">Montant</th>
                    <th className="py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {consultations.map((c) => (
                    <tr key={c.id} className="border-b">
                      <td className="py-2">{c.id}</td>
                      <td className="py-2">{c.doctor_id || "-"}</td>
                      <td className="py-2">{c.patient_id || "-"}</td>
                      <td className="py-2">{c.status || "-"}</td>
                      <td className="py-2">{(Number(c.amount) || 0).toLocaleString("fr-FR")} FCFA</td>
                      <td className="py-2">
                        {c.created_at ? new Date(c.created_at).toLocaleString("fr-FR") : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}