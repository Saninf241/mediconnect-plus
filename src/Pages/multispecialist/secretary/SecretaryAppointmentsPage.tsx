import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../../../lib/supabase";
import { Input } from "../../../components/ui/input";
import Modal from "../../../components/ui/dialog";
import { Card, CardContent } from "../../../components/ui/card";
import { toast } from "react-toastify";
import { useClinicId } from "../../../hooks/useClinicId";

type ViewFilter = "today" | "upcoming" | "all";
type AppointmentStatus = "planned" | "waiting" | "done" | "no_show" | "cancelled";
type CreateMode = "planned" | "walkin";

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
  checked_in_at: string | null;
  reason: string | null;
  status: AppointmentStatus | null;
  patient: PatientOption | null;
  doctor: { id: string; name: string } | null;
}

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  planned: "Prévu",
  waiting: "En attente",
  done: "Venu",
  no_show: "Non venu",
  cancelled: "Annulé",
};

const STATUS_BADGE: Record<AppointmentStatus, string> = {
  planned: "bg-blue-100 text-blue-700",
  waiting: "bg-amber-100 text-amber-700",
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

// Format naïf "YYYY-MM-DDTHH:MM:SS" (pas de conversion UTC) : la colonne
// appointment_date est un `timestamp without time zone`, l'heure du Gabon
// (UTC+1, pas de changement d'heure) doit être stockée telle quelle.
function nowNaive() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function waitingSince(checkedInAt: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(checkedInAt).getTime()) / 60000));
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${String(m).padStart(2, "0")}`;
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
  const [createMode, setCreateMode] = useState<CreateMode>("planned");
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
        .select("id, appointment_date, checked_in_at, reason, status, patient:patients(id,name,phone), doctor:clinic_staff(id,name)")
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
      setCreateMode("planned");
      setIsModalOpen(true);
      searchParams.delete("patient");
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patients]);

  const queue = useMemo(() => {
    return appointments
      .filter((a) => (a.status || "planned") === "waiting" && a.checked_in_at)
      .sort((a, b) => new Date(a.checked_in_at!).getTime() - new Date(b.checked_in_at!).getTime());
  }, [appointments]);

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

  const openModal = (mode: CreateMode) => {
    setSelectedPatient(null);
    setPatientQuery("");
    setDoctorId("");
    setDate("");
    setTime("");
    setReason("");
    setCreateMode(mode);
    setIsModalOpen(true);
  };

  const handleCreate = async () => {
    if (!clinicId) return;
    if (!selectedPatient) {
      toast.error("Sélectionnez un patient.");
      return;
    }

    let appointment_date: string;
    let status: AppointmentStatus;
    let checked_in_at: string | null = null;

    if (createMode === "walkin") {
      appointment_date = nowNaive();
      checked_in_at = appointment_date;
      status = "waiting";
    } else {
      if (!date || !time) {
        toast.error("Date et heure obligatoires.");
        return;
      }
      appointment_date = `${date}T${time}:00`;
      status = "planned";
    }

    setSaving(true);
    const { error } = await supabase.from("appointments").insert({
      clinic_id: clinicId,
      patient_id: selectedPatient.id,
      doctor_id: doctorId || null,
      appointment_date,
      checked_in_at,
      reason: reason.trim() || null,
      status,
    });
    setSaving(false);

    if (error) {
      console.error("[SecretaryAppointmentsPage] create error:", error);
      toast.error("Erreur lors de la création du rendez-vous.");
      return;
    }

    toast.success(createMode === "walkin" ? "Patient ajouté à la file d'attente." : "Rendez-vous créé.");
    setIsModalOpen(false);
    await fetchAll();
  };

  const updateStatus = async (id: string, status: AppointmentStatus, extra?: { checked_in_at?: string }) => {
    const { error } = await supabase.from("appointments").update({ status, ...extra }).eq("id", id);
    if (error) {
      console.error("[SecretaryAppointmentsPage] status update error:", error);
      toast.error("Erreur lors de la mise à jour du statut.");
      return;
    }
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status, ...extra } : a)));
  };

  const markArrived = (id: string) => updateStatus(id, "waiting", { checked_in_at: nowNaive() });

  const handlePrintToday = () => {
    setViewFilter("today");
    // Laisse React re-rendre le tableau filtré sur "Aujourd'hui" avant d'imprimer.
    setTimeout(() => window.print(), 50);
  };

  if (loadingClinic || loading) {
    return <div className="p-6">Chargement des rendez-vous…</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <div className="hidden print:block">
        <h1 className="text-xl font-bold">
          Liste des rendez-vous du jour{clinicName ? ` — ${clinicName}` : ""}
        </h1>
        <p className="text-sm text-gray-600">
          {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rendez-vous</h1>
          <p className="text-sm text-gray-500">{filteredAppointments.length} rendez-vous</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrintToday}
            className="rounded border px-4 py-2 text-gray-700 hover:bg-gray-50 transition"
          >
            Imprimer la liste du jour
          </button>
          <button
            onClick={() => openModal("walkin")}
            className="bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700 transition"
          >
            Arrivée sans RDV
          </button>
          <button
            onClick={() => openModal("planned")}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
          >
            Nouveau rendez-vous
          </button>
        </div>
      </div>

      <Card className="print:hidden">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">File d'attente</h2>
            <span className="text-sm text-gray-400">{queue.length} en attente</span>
          </div>

          {queue.length === 0 ? (
            <p className="text-sm text-gray-500">Personne en attente.</p>
          ) : (
            <div className="space-y-2">
              {queue.map((a, i) => (
                <div
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-amber-50/50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-600 text-sm font-semibold text-white">
                      {i + 1}
                    </span>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {a.patient?.name || "Patient supprimé"}
                      </div>
                      <div className="text-xs text-gray-500">
                        En attente depuis {waitingSince(a.checked_in_at!)}
                        {a.doctor?.name ? ` — ${a.doctor.name}` : ""}
                        {a.reason ? ` — ${a.reason}` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => updateStatus(a.id, "done")}
                      className="rounded-lg border px-2 py-1 text-xs text-gray-700 hover:bg-white"
                    >
                      Marquer vu
                    </button>
                    <button
                      onClick={() => updateStatus(a.id, "cancelled")}
                      className="rounded-lg border px-2 py-1 text-xs text-gray-700 hover:bg-white"
                    >
                      Retirer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2 print:hidden">
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
                    <th className="py-3 pr-4 print:hidden">Actions</th>
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
                        <td className="py-3 pr-4 print:hidden">
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
                            {status === "planned" && (
                              <button
                                onClick={() => markArrived(a.id)}
                                className="rounded-lg border px-2 py-1 text-xs text-amber-700 hover:bg-amber-50"
                              >
                                Marquer arrivé
                              </button>
                            )}
                            {status !== "done" && status !== "cancelled" && (
                              <button
                                onClick={() => updateStatus(a.id, "done")}
                                className="rounded-lg border px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                              >
                                Venu
                              </button>
                            )}
                            {status === "planned" && (
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

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={createMode === "walkin" ? "Arrivée sans RDV" : "Nouveau rendez-vous"}
      >
        <div className="space-y-3">
          <div className="flex gap-2 rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => setCreateMode("planned")}
              className={`flex-1 rounded-md py-1.5 text-sm ${
                createMode === "planned" ? "bg-white shadow font-medium" : "text-gray-600"
              }`}
            >
              RDV planifié
            </button>
            <button
              onClick={() => setCreateMode("walkin")}
              className={`flex-1 rounded-md py-1.5 text-sm ${
                createMode === "walkin" ? "bg-white shadow font-medium" : "text-gray-600"
              }`}
            >
              Arrivée immédiate
            </button>
          </div>

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

          {createMode === "planned" && (
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
          )}

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
            {saving
              ? "Enregistrement..."
              : createMode === "walkin"
                ? "Ajouter à la file d'attente"
                : "Créer le rendez-vous"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
