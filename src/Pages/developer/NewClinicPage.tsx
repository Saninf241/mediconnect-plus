// src/Pages/developer/NewClinicPage.tsx
import React, { useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";

const FUNCTIONS_BASE =
  (import.meta.env.VITE_SUPABASE_URL as string).replace(/\/+$/, "") +
  "/functions/v1";

type ClinicType = "specialist_office" | "multi_specialist";
type StaffRole = "doctor" | "secretary" | "admin";
type StaffRow = { name: string; email: string; role: StaffRole };

export default function NewClinicPage({ clinicType }: { clinicType: ClinicType }) {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const [clinic, setClinic] = useState({
    name: "",
    address: "",
    phone: "",
    siret: "",
    code: "",
    speciality: "",
  });

  const [staff, setStaff] = useState<StaffRow[]>([
    { name: "", email: "", role: "doctor" },
    { name: "", email: "", role: "secretary" },
  ]);

  const updateStaff = (i: number, patch: Partial<StaffRow>) => {
    setStaff((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  };

  const addStaffRow = () =>
    setStaff((prev) => [...prev, { name: "", email: "", role: "secretary" }]);

  const removeStaffRow = (i: number) =>
    setStaff((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = await getToken();
      const res = await fetch(`${FUNCTIONS_BASE}/dev-create-clinic`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clinic: { ...clinic, type: clinicType },
          staff: staff.filter((s) => s.name.trim() && s.email.trim()),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Échec de la création");

      const failed = (data.staff || []).filter((s: any) => s.status === "error");
      if (failed.length > 0) {
        toast.warning(
          `Cabinet créé, mais ${failed.length} compte(s) ont échoué (voir console)`
        );
        console.warn("Échecs création staff:", failed);
      } else {
        toast.success("Cabinet et comptes créés avec succès");
      }

      navigate("/developer");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la création");
    } finally {
      setSubmitting(false);
    }
  };

  const title =
    clinicType === "multi_specialist"
      ? "Nouveau cabinet multi-spécialiste"
      : "Nouveau cabinet spécialiste";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">{title}</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="space-y-3">
          <h2 className="font-semibold text-lg">Informations du cabinet</h2>
          <Input
            placeholder="Nom du cabinet"
            required
            value={clinic.name}
            onChange={(e) => setClinic({ ...clinic, name: e.target.value })}
          />
          <Input
            placeholder="Adresse"
            required
            value={clinic.address}
            onChange={(e) => setClinic({ ...clinic, address: e.target.value })}
          />
          <Input
            placeholder="Téléphone"
            value={clinic.phone}
            onChange={(e) => setClinic({ ...clinic, phone: e.target.value })}
          />
          <Input
            placeholder="SIRET"
            required
            value={clinic.siret}
            onChange={(e) => setClinic({ ...clinic, siret: e.target.value })}
          />
          <Input
            placeholder="Code cabinet"
            required
            value={clinic.code}
            onChange={(e) => setClinic({ ...clinic, code: e.target.value })}
          />
          {clinicType === "specialist_office" && (
            <Input
              placeholder="Spécialité"
              value={clinic.speciality}
              onChange={(e) => setClinic({ ...clinic, speciality: e.target.value })}
            />
          )}
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Comptes à créer</h2>
            <Button type="button" onClick={addStaffRow}>
              + Ajouter
            </Button>
          </div>

          {staff.map((member, i) => (
            <div
              key={i}
              className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_140px_auto] gap-2 items-center border-b pb-3 last:border-b-0"
            >
              <Input
                placeholder="Nom"
                value={member.name}
                onChange={(e) => updateStaff(i, { name: e.target.value })}
              />
              <Input
                placeholder="Email"
                type="email"
                value={member.email}
                onChange={(e) => updateStaff(i, { email: e.target.value })}
              />
              <select
                className="border px-3 py-2 rounded text-sm"
                value={member.role}
                onChange={(e) =>
                  updateStaff(i, { role: e.target.value as StaffRole })
                }
              >
                <option value="doctor">Médecin</option>
                <option value="secretary">Secrétaire</option>
                <option value="admin">Admin</option>
              </select>
              {staff.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeStaffRow(i)}
                  className="text-red-600 text-sm"
                >
                  Retirer
                </button>
              )}
            </div>
          ))}
        </Card>

        <Button type="submit" disabled={submitting}>
          {submitting ? "Création en cours…" : "Créer le cabinet"}
        </Button>
      </form>
    </div>
  );
}
