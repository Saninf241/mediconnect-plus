import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../../../lib/supabase";
import { Input } from "../../../components/ui/input";
import Modal from "../../../components/ui/dialog";
import { Card, CardContent } from "../../../components/ui/card";
import { toast } from "react-toastify";
import { useClinicId } from "../../../hooks/useClinicId";

type ViewFilter = "today" | "upcoming" | "all";
type AppointmentStatus = "planned" | "done" | "no_show" | "cancelled";

interface PatientOption {
  id: string;
  name: string;
  phone: string | null;
}

interface DoctorOption {
  id: string;
  name: string;
  speciality: string | null;
}

interface AppointmentRow {
  id: string;
  appointment_date: string;
  reason: string | null;
  status: AppointmentStatus | null;
  patient: PatientOption | null;
  doctor: { id: string; name: string } | null;
}

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  planned: "Prévu",
  done: "Venu",
  no_show: "Non venu",
  cancelled: "Annulé",
};

const STATUS_BADGE: Record<AppointmentStatus, string> = {
  planned: "bg-blue-100 text-blue-700",
  done: "bg-green-100 text-green-700",
  no_show: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-500",
};

// Insensible aux accents en plus de la casse.
const normalize = (v: string) =>
  v.normalize("NFD").replace(new RegExp("[\\u0300-\\u036f]", "g"), "").toLowerCase();

function toDigits(raw: string) {
  return raw.replace(/\D/g, "");
}

// Numéros gabonais : locaux (ex: "077074475") ou déjà internationaux ("+241...").
function toWhatsAppNumber(raw: string): string {
  const trimmed = raw.trim();
  const digits = toDigits(trimmed);
  if (trimmed.startsWith("+")) return digits;
  if (digits.startsWith("241")) return digits;
  return `241${digits.replace(/^0/, "")}`;
}

function toE164(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("+")) return `+${toDigits(trimmed)}`;
  const digits = toDigits(trimmed);
  if (digits.startsWith("241")) return `+${digits}`;
  return `+241${digits.replace(/^0/, "")}`;
}

function buildReminderMessage(patientName: string, dateISO: string, clinicName: string | null) {
  const d = new Date(dateISO);
  const dateStr = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const timeStr = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `Bonjour ${patientName}, rappel de votre rendez-vous${clinicName ? ` à ${clinicName}` : ""} le ${dateStr} à ${timeStr}. Merci de nous prévenir en cas d'empêchement.`;
}

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

export default function SecretaryAppointmentsPage() {
  const { clinicId, loadingClinic } = useClinicId();
  const [searchParams, setSearchParams] = useSearchParams();

  const [clinicName, setClinicName] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewFilter, setViewFilter] = useState<ViewFilter>("today");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [patientQuery, setPatientQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null);
  const [doctorId, setDoctorId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");

  const fetchAll = async () => {
    if (!clinicId) return;
    setLoading(true);

    const [appointmentsRes, patientsRes, doctorsRes, clinicRes] = await Promise.all([
      supabase
        .from("appointments")
        .select("id, appointment_date, reason, status, patient:patients(id,name,phone), doctor:clinic_staff(id,name)")
        .eq("clinic_id", clinicId)
        .order("appointment_date", { ascending: true }),
      supabase.from("patients").select("id, name, phone").eq("clinic_id", clinicId),
      supabase
        .from("clinic_staff")
        .select("id, name, speciality")
        .eq("clinic_id", clinicId)
        .eq("role", "doctor"),
      supabase.from("clinics").select("name").eq("id", clinicId).maybeSingle(),
    ]);

    if (appointmentsRes.error) {
      console.error("[SecretaryAppointmentsPage] appointments error:", appointmentsRes.error);
      toast.error("Erreur lors du chargement des rendez-vous.");
    } else {
      setAppointments((appointmentsRes.data ?? []) as unknown as AppointmentRow[]);
    }

    if (!patientsRes.error && patientsRes.data) setPatients(patientsRes.data);
    if (!doctorsRes.error && doctorsRes.data) setDoctors(doctorsRes.data);
    if (!clinicRes.error && clinicRes.data) setClinicName(clinicRes.data.name);

    setLoading(false);
  };

  useEffect(() => {
    if (loadingClinic) return;
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId, loadingClinic]);

  // Deep-link depuis la fiche patient : "?patient=<id>" ouvre directement la prise de RDV.
  useEffect(() => {
    const patientId = searchParams.get("patient");
    if (!patientId || patients.length === 0) return;
    const match = patients.find((p) => p.id === patientId);
    if (match) {
      setSelectedPatient(match);
      setIsModalOpen(true);
      searchParams.delete("patient");
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patients]);

  const filteredAppointments = useMemo(() => {
    const todayStart = startOfToday();
    const todayEnd = endOfToday();

    return appointments.filter((a) => {
      const d = new Date(a.appointment_date);
      if (viewFilter === "today") return d >= todayStart && d <= todayEnd;
      if (viewFilter === "upcoming") return d >= todayStart;
      return true;
    });
  }, [appointments, viewFilter]);

  const patientMatches = useMemo(() => {
    const q = normalize(patientQuery.trim());
    if (!q) return [];
    return patients.filter((p) => normalize(p.name).includes(q)).slice(0, 8);
  }, [patients, patientQuery]);

  const openNewAppointment = () => {
    setSelectedPatient(null);
    setPatientQuery("");
    setDoctorId("");
    setDate("");
    setTime("");
    setReason("");
    setIsModalOpen(true);
  };

  const handleCreate = async () => {
    if (!clinicId) return;
    if (!selectedPatient) {
      toast.error("Sélectionnez un patient.");
      return;
    }
    if (!date || !time) {
      toast.error("Date et heure obligatoires.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("appointments").insert({
      clinic_id: clinicId,
      patient_id: selectedPatient.id,
      doctor_id: doctorId || null,
      appointment_date: `${date}T${time}:00`,
      reason: reason.trim() || null,
      status: "planned",
    });
    setSaving(false);

    if (error) {
      console.error("[SecretaryAppointmentsPage] create error:", error);
      toast.error("Erreur lors de la création du rendez-vous.");
      return;
    }

    toast.success("Rendez-vous créé.");
    setIsModalOpen(false);
    await fetchAll();
  };

  const updateStatus = async (id: string, status: AppointmentStatus) => {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (error) {
      console.error("[SecretaryAppointmentsPage] status update error:", error);
      toast.error("Erreur lors de la mise à jour du statut.");
      return;
    }
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  };

  if (loadingClinic || loading) {
    return <div className="p-6">Chargement des rendez-vous…</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rendez-vous</h1>
          <p className="text-sm text-gray-500">{filteredAppointments.length} rendez-vous</p>
        </div>
        <button
          onClick={openNewAppointment}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
        >
          Nouveau rendez-vous
        </button>
      </div>

      <div className="flex gap-2">
        {(["today", "upcoming", "all"] as ViewFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setViewFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm border ${
              viewFilter === f ? "bg-sky-600 text-white border-sky-600" : "bg-white text-gray-700"
            }`}
          >
            {f === "today" ? "Aujourd'hui" : f === "upcoming" ? "À venir" : "Tous"}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          {filteredAppointments.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun rendez-vous.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="py-3 pr-4">Date</th>
                    <th className="py-3 pr-4">Patient</th>
                    <th className="py-3 pr-4">Médecin</th>
                    <th className="py-3 pr-4">Motif</th>
                    <th className="py-3 pr-4">Statut</th>
                    <th className="py-3 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppointments.map((a) => {
                    const status = a.status || "planned";
                    const phone = a.patient?.phone;
                    const message = a.patient
                      ? buildReminderMessage(a.patient.name, a.appointment_date, clinicName)
                      : "";

                    return (
                      <tr key={a.id} className="border-b last:border-b-0 align-top">
                        <td className="py-3 pr-4 text-gray-700">
                          {new Date(a.appointment_date).toLocaleString("fr-FR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3 pr-4 font-medium text-gray-900">
                          {a.patient?.name || "Patient supprimé"}
                        </td>
                        <td className="py-3 pr-4 text-gray-700">{a.doctor?.name || "-"}</td>
                        <td className="py-3 pr-4 text-gray-700">{a.reason || "-"}</td>
                        <td className="py-3 pr-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGE[status]}`}>
                            {STATUS_LABEL[status]}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex flex-wrap gap-1.5">
                            {phone && status === "planned" && (
                              <>
                                <a
                                  href={`https://wa.me/${toWhatsAppNumber(phone)}?text=${encodeURIComponent(message)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="rounded-lg border px-2 py-1 text-xs text-green-700 hover:bg-green-50"
                                >
                                  WhatsApp
                                </a>
                                <a
                                  href={`sms:${toE164(phone)}?body=${encodeURIComponent(message)}`}
                                  className="rounded-lg border px-2 py-1 text-xs text-sky-700 hover:bg-sky-50"
                                >
                                  SMS
                                </a>
                              </>
                            )}
                            {status !== "done" && status !== "cancelled" && (
                              <button
                                onClick={() => updateStatus(a.id, "done")}
                                className="rounded-lg border px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                              >
                                Venu
                              </button>
                            )}
                            {status !== "no_show" && status !== "cancelled" && status !== "done" && (
                              <button
                                onClick={() => updateStatus(a.id, "no_show")}
                                className="rounded-lg border px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                              >
                                Non venu
                              </button>
                            )}
                            {status !== "cancelled" && status !== "done" && (
                              <button
                                onClick={() => updateStatus(a.id, "cancelled")}
                                className="rounded-lg border px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                              >
                                Annuler
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nouveau rendez-vous">
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Patient</label>
            {selectedPatient ? (
              <div className="mt-1 flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                <span>
                  {selectedPatient.name}
                  {selectedPatient.phone ? ` — ${selectedPatient.phone}` : ""}
                </span>
                <button
                  onClick={() => setSelectedPatient(null)}
                  className="text-xs text-sky-600 hover:underline"
                >
                  Changer
                </button>
              </div>
            ) : (
              <>
                <Input
                  placeholder="Rechercher un patient par nom..."
                  value={patientQuery}
                  onChange={(e) => setPatientQuery(e.target.value)}
                />
                {patientMatches.length > 0 && (
                  <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border">
                    {patientMatches.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelectedPatient(p);
                          setPatientQuery("");
                        }}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                      >
                        {p.name}
                        {p.phone ? ` — ${p.phone}` : ""}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Médecin (optionnel)</label>
            <select
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="">Non assigné</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                  {d.speciality ? ` (${d.speciality})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Date</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Heure</label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Motif (optionnel)</label>
            <Input
              placeholder="Ex: contrôle, résultats..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <button
            onClick={handleCreate}
            disabled={saving}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition disabled:opacity-50"
          >
            {saving ? "Enregistrement..." : "Créer le rendez-vous"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
