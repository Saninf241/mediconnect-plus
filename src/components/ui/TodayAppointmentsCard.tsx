import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

interface Props {
  clinicId: string;
  doctorId: string;
}

interface AppointmentRow {
  id: string;
  appointment_date: string;
  checked_in_at: string | null;
  reason: string | null;
  status: string | null;
  patient: { id: string; name: string; phone: string | null } | null;
  doctor: { id: string; name: string } | null;
}

const STATUS_LABEL: Record<string, string> = {
  planned: "Prévu",
  waiting: "En attente",
  done: "Venu",
  no_show: "Non venu",
  cancelled: "Annulé",
};

const STATUS_BADGE: Record<string, string> = {
  planned: "bg-blue-100 text-blue-700",
  waiting: "bg-amber-100 text-amber-700",
  done: "bg-green-100 text-green-700",
  no_show: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-500",
};

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function waitingSince(checkedInAt: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(checkedInAt).getTime()) / 60000));
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${String(m).padStart(2, "0")}`;
}

// Rendez-vous du jour pour un médecin : la secrétaire prend le RDV, le
// médecin n'a aujourd'hui aucune notif (ni email, ni WhatsApp) — ce widget
// est le seul endroit où il voit son planning tant qu'on n'a pas mesuré le
// besoin d'un vrai rappel automatique. Les patients "en attente" (file
// d'attente à l'accueil) sont mis en avant : c'est l'info la plus urgente.
export default function TodayAppointmentsCard({ clinicId, doctorId }: Props) {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clinicId) return;

    const fetch = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("appointments")
        .select("id, appointment_date, checked_in_at, reason, status, patient:patients(id,name,phone), doctor:clinic_staff(id,name)")
        .eq("clinic_id", clinicId)
        .gte("appointment_date", startOfToday().toISOString().slice(0, 19))
        .lte("appointment_date", endOfToday().toISOString().slice(0, 19))
        .order("appointment_date", { ascending: true });

      if (error) {
        console.error("[TodayAppointmentsCard] fetch error:", error);
        setAppointments([]);
      } else {
        const rows = (data ?? []) as unknown as AppointmentRow[];
        setAppointments(rows.filter((a) => !a.doctor || a.doctor.id === doctorId));
      }
      setLoading(false);
    };

    fetch();
  }, [clinicId, doctorId]);

  const waiting = appointments
    .filter((a) => (a.status || "planned") === "waiting" && a.checked_in_at)
    .sort((a, b) => new Date(a.checked_in_at!).getTime() - new Date(b.checked_in_at!).getTime());
  const rest = appointments.filter((a) => (a.status || "planned") !== "waiting");

  return (
    <div className="bg-white p-4 rounded-xl shadow">
      <h3 className="text-lg font-semibold mb-3">Rendez-vous du jour</h3>

      {loading ? (
        <p className="text-sm text-gray-500">Chargement…</p>
      ) : appointments.length === 0 ? (
        <p className="text-sm text-gray-500">Aucun rendez-vous aujourd'hui.</p>
      ) : (
        <div className="space-y-2">
          {waiting.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between gap-3 border border-amber-200 bg-amber-50/60 rounded-lg p-3"
            >
              <div>
                <div className="text-sm font-medium text-gray-800">
                  {a.patient?.name || "Patient supprimé"}
                </div>
                <div className="text-xs text-gray-500">
                  En attente depuis {waitingSince(a.checked_in_at!)}
                  {a.reason ? ` — ${a.reason}` : ""}
                </div>
              </div>
              <span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium bg-amber-100 text-amber-700">
                En attente
              </span>
            </div>
          ))}

          {rest.map((a) => {
            const status = a.status || "planned";
            return (
              <div
                key={a.id}
                className="flex items-center justify-between gap-3 border rounded-lg p-3"
              >
                <div>
                  <div className="text-sm font-medium text-gray-800">
                    {new Date(a.appointment_date).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {" — "}
                    {a.patient?.name || "Patient supprimé"}
                  </div>
                  {a.reason && <div className="text-xs text-gray-500">{a.reason}</div>}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGE[status] || STATUS_BADGE.planned}`}
                >
                  {STATUS_LABEL[status] || status}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
