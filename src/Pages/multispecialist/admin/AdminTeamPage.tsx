// src/pages/multispecialist/admin/ManageTeamPage.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { Button } from "../../../components/ui/button";
import { useClinicId } from "../../../hooks/useClinicId";

type ConsultStatus = "draft" | "sent" | "rejected" | "accepted" | "paid";

interface Doctor {
  id: string;
  name: string | null;
  email: string;
}

interface DoctorStats {
  draft: number;
  sent: number;
  rejected: number;
  accepted: number;
  paid: number;
  revenuePaid: number; // somme des amounts sur paid
  lastActivity?: string | null; // ISO
}

export default function ManageTeamPage() {
  const { clinicId, loadingClinic } = useClinicId();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [statsByDoctor, setStatsByDoctor] = useState<Record<string, DoctorStats>>({});
  const [period, setPeriod] = useState("30");

  const [newDoctorEmail, setNewDoctorEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // ✅ force une string UUID (évite eq("clinic_id", [object Object]))
  const clinicIdStr = useMemo(() => {
    const c: any = clinicId;
    return typeof c === "string" ? c : c?.id || c?.clinic_id || c?.clinic?.id || null;
  }, [clinicId]);

  // Validation e-mail
  const emailIsValid = useMemo(
    () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newDoctorEmail.trim()),
    [newDoctorEmail]
  );

  // 1) Charger la liste des médecins du cabinet
  const fetchDoctors = async () => {
    if (!clinicId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("clinic_staff")
      .select("id, name, email, role, clinic_id")
      .eq("clinic_id", clinicId)
      .eq("role", "doctor")
      .order("name", { ascending: true });

    if (error) {
      console.error("Erreur fetchDoctors:", error);
      setErrorMsg("Impossible de charger l'équipe.");
      setDoctors([]);
    } else {
      setDoctors((data || []) as Doctor[]);
      setErrorMsg(null);
    }
    setLoading(false);
  };

  // 2) Charger les stats de consultations par médecin (période roulante)
  const fetchStats = async () => {
    if (!clinicId) return;
    setLoadingStats(true);

    // borne temporelle
    const n = parseInt(period, 10);
    const since = new Date();
    since.setDate(since.getDate() - (isNaN(n) ? 30 : n));
    const sinceISO = since.toISOString();

    // On récupère uniquement ce cabinet et cette période
    const { data, error } = await supabase
      .from("consultations")
      .select("id, doctor_id, status, amount, created_at, clinic_id")
      .eq("clinic_id", clinicId)
      .gte("created_at", sinceISO)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur fetchStats consultations:", error);
      setStatsByDoctor({});
      setLoadingStats(false);
      return;
    }

    const map: Record<string, DoctorStats> = {};
    (data || []).forEach((c: any) => {
      const docId = c.doctor_id as string | null;
      if (!docId) return;

      const st = (c.status || "") as ConsultStatus;
      const amt = Number(c.amount) || 0;

      if (!map[docId]) {
        map[docId] = { draft: 0, sent: 0, rejected: 0, accepted: 0, paid: 0, revenuePaid: 0, lastActivity: null };
      }

      if (st === "draft" || st === "sent" || st === "rejected" || st === "accepted" || st === "paid") {
        map[docId][st] += 1;
      }
      if (st === "paid") {
        map[docId].revenuePaid += amt;
      }

      // dernière activité (ISO la plus récente)
      if (!map[docId].lastActivity || new Date(c.created_at) > new Date(map[docId].lastActivity)) {
        map[docId].lastActivity = c.created_at;
      }
    });

    setStatsByDoctor(map);
    setLoadingStats(false);
  };

  // 3) Ajout d'un médecin
  const addDoctor = async () => {
    if (!clinicId || !emailIsValid) return;
    setSaving(true);
    setErrorMsg(null);

    // anti-duplication (même email dans le même cabinet)
    const { data: existing, error: existErr } = await supabase
      .from("clinic_staff")
      .select("id")
      .eq("clinic_id", clinicId)
      .eq("email", newDoctorEmail.trim());

    if (existErr) {
      console.error("Erreur vérif doublon:", existErr);
      setErrorMsg("Erreur lors de la vérification.");
      setSaving(false);
      return;
    }
    if (existing && existing.length > 0) {
      setErrorMsg("Ce médecin existe déjà dans ce cabinet.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("clinic_staff").insert({
      clinic_id: clinicId,
      email: newDoctorEmail.trim(),
      role: "doctor",
    });

    if (error) {
      console.error("Erreur addDoctor:", error);
      setErrorMsg("Impossible d'ajouter ce médecin.");
    } else {
      setNewDoctorEmail("");
      await fetchDoctors();
      await fetchStats(); // refresh des stats (ligne apparaîtra avec 0 partout)
    }
    setSaving(false);
  };

  // 4) Suppression (scopée)
  const removeDoctor = async (id: string) => {
    if (!clinicId) return;
    setSaving(true);
    setErrorMsg(null);
    const { error } = await supabase
      .from("clinic_staff")
      .delete()
      .eq("id", id)
      .eq("clinic_id", clinicId);

    if (error) {
      console.error("Erreur removeDoctor:", error);
      setErrorMsg("Suppression impossible.");
    } else {
      await fetchDoctors();
      // Nettoie les stats locales
      setStatsByDoctor((prev) => {
        const clone = { ...prev };
        delete clone[id];
        return clone;
      });
    }
    setSaving(false);
  };

  // Effets
  useEffect(() => {
    if (clinicId) fetchDoctors();
  }, [clinicId]);

  useEffect(() => {
    if (clinicId) fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId, period]);

  // Helpers
  const fmtFCFA = (n: number) => (Number(n) || 0).toLocaleString() + " FCFA";
  const acceptanceRate = (s?: DoctorStats) => {
    if (!s) return "0%";
    const denom = s.sent + s.accepted + s.rejected;
    if (!denom) return "0%";
    return Math.round((s.accepted / denom) * 100) + "%";
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Gérer l’équipe médicale</h1>
        <div className="ml-auto flex items-center gap-2">
          <label className="text-sm text-gray-600">Période stats :</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="border rounded px-2 py-1"
          >
            <option value="7">7 jours</option>
            <option value="30">30 jours</option>
            <option value="90">90 jours</option>
          </select>
        </div>
      </div>

      {/* Ajout */}
      <div className="mb-2 flex flex-col gap-2 md:flex-row md:items-center">
        <input
          type="email"
          placeholder="Email du médecin"
          value={newDoctorEmail}
          onChange={(e) => setNewDoctorEmail(e.target.value)}
          className="border p-2 rounded w-72"
        />
        <Button onClick={addDoctor} disabled={!emailIsValid || saving || !clinicId}>
          {saving ? "Ajout..." : "Ajouter"}
        </Button>
        {!emailIsValid && newDoctorEmail.length > 0 && (
          <span className="text-xs text-red-600">Email invalide</span>
        )}
        {errorMsg && <span className="text-xs text-red-600">{errorMsg}</span>}
      </div>

      {/* Tableau équipe + stats */}
      <div className="bg-white border rounded overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-100 text-left text-xs font-semibold text-gray-700">
              <th className="p-3">Nom</th>
              <th className="p-3">Email</th>
              <th className="p-3 text-center">draft</th>
              <th className="p-3 text-center">sent</th>
              <th className="p-3 text-center">rejected</th>
              <th className="p-3 text-center">accepted</th>
              <th className="p-3 text-center">paid</th>
              <th className="p-3 text-right">Revenu payé</th>
              <th className="p-3 text-right">Taux accept.</th>
              <th className="p-3">Dernière activité</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-3" colSpan={11}>Chargement…</td></tr>
            ) : doctors.length === 0 ? (
              <tr><td className="p-3 text-sm text-gray-500" colSpan={11}>Aucun médecin pour ce cabinet.</td></tr>
            ) : (
              doctors.map((d) => {
                const s = statsByDoctor[d.id];
                return (
                  <tr key={d.id} className="border-t text-sm">
                    <td className="p-3">{d.name || "—"}</td>
                    <td className="p-3">{d.email}</td>
                    <td className="p-3 text-center">{loadingStats ? "…" : s?.draft ?? 0}</td>
                    <td className="p-3 text-center">{loadingStats ? "…" : s?.sent ?? 0}</td>
                    <td className="p-3 text-center">{loadingStats ? "…" : s?.rejected ?? 0}</td>
                    <td className="p-3 text-center">{loadingStats ? "…" : s?.accepted ?? 0}</td>
                    <td className="p-3 text-center">{loadingStats ? "…" : s?.paid ?? 0}</td>
                    <td className="p-3 text-right">{loadingStats ? "…" : fmtFCFA(s?.revenuePaid || 0)}</td>
                    <td className="p-3 text-right">{loadingStats ? "…" : acceptanceRate(s)}</td>
                    <td className="p-3">
                      {loadingStats
                        ? "…"
                        : s?.lastActivity
                        ? new Date(s.lastActivity).toLocaleString("fr-FR")
                        : "—"}
                    </td>
                    <td className="p-3">
                      <Button
                        onClick={() => removeDoctor(d.id)}
                        disabled={saving}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Supprimer
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
