import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useUser } from "@clerk/clerk-react";

export default function RendezvousPage() {
  const { user } = useUser();
  const [appointments, setAppointments] = useState<any[]>([]);

  useEffect(() => {
    const fetchAppointments = async () => {
      const { data: patient, error: patientError } = await supabase
        .from("patients")
        .select("id")
        .eq("email", user?.primaryEmailAddress?.emailAddress)
        .single();

      if (!patient || patientError) return;

      const { data, error } = await supabase
        .from("appointments")
        .select(`
          id,
          reason,
          appointment_date,
          status,
          clinics(name),
          clinic_staff(name, speciality)
        `)
        .eq("patient_id", patient.id)
        .gte("appointment_date", new Date().toISOString()) // RDV à venir
        .order("appointment_date", { ascending: true });

      if (!error && data) setAppointments(data);
    };

    fetchAppointments();
  }, [user]);

  const cancelAppointment = async (id: string) => {
    const { error } = await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", id);

    if (!error) {
      setAppointments((prev) =>
        prev.map((rdv) => (rdv.id === id ? { ...rdv, status: "cancelled" } : rdv))
      );
    }
  };

  const downloadICS = (rdv: any) => {
    const start = new Date(rdv.appointment_date);
    const end = new Date(start.getTime() + 30 * 60 * 1000); // +30 minutes

    const pad = (n: number) => (n < 10 ? "0" + n : n);
    const formatDate = (date: Date) =>
      `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}00Z`;

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:Consultation - ${rdv.clinic_staff?.name}
DESCRIPTION:Motif : ${rdv.reason}
DTSTART:${formatDate(start)}
DTEND:${formatDate(end)}
LOCATION:${rdv.clinics?.name}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `rendezvous-${rdv.id}.ics`;
    link.click();
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">📅 Mes rendez-vous à venir</h1>
      {appointments.length === 0 ? (
        <p>Aucun rendez-vous prévu pour le moment.</p>
      ) : (
        <ul className="space-y-4">
          {appointments.map((rdv) => (
            <li key={rdv.id} className="border p-4 rounded bg-white shadow">
              <p><strong>Date :</strong> {new Date(rdv.appointment_date).toLocaleString()}</p>
              <p><strong>Médecin :</strong> {rdv.clinic_staff?.name} ({rdv.clinic_staff?.speciality})</p>
              <p><strong>Établissement :</strong> {rdv.clinics?.name}</p>
              <p><strong>Motif :</strong> {rdv.reason}</p>
              <p><strong>Statut :</strong> {rdv.status === "scheduled" ? "📌 Prévu" : rdv.status === "cancelled" ? "❌ Annulé" : rdv.status}</p>

              {rdv.status === "scheduled" && (
                <div className="flex gap-4 mt-2">
                  <button
                    className="px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                    onClick={() => cancelAppointment(rdv.id)}
                  >
                    Annuler le rendez-vous
                  </button>
                  <button
                    className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                    onClick={() => downloadICS(rdv)}
                  >
                    Ajouter à mon agenda
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
