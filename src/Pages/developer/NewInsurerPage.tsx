// src/Pages/developer/NewInsurerPage.tsx
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

type StaffRow = { name: string; email: string; role: string };

export default function NewInsurerPage() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const [insurer, setInsurer] = useState({
    name: "",
    verification_level: "N1",
    slug: "",
  });

  const [staff, setStaff] = useState<StaffRow[]>([
    { name: "", email: "", role: "admin" },
  ]);

  const updateStaff = (i: number, patch: Partial<StaffRow>) => {
    setStaff((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  };

  const addStaffRow = () =>
    setStaff((prev) => [...prev, { name: "", email: "", role: "agent" }]);

  const removeStaffRow = (i: number) =>
    setStaff((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = await getToken();
      const res = await fetch(`${FUNCTIONS_BASE}/dev-create-insurer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          insurer,
          staff: staff.filter((s) => s.name.trim() && s.email.trim()),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Échec de la création");

      const failed = (data.staff || []).filter((s: any) => s.status === "error");
      if (failed.length > 0) {
        toast.warning(
          `Assureur créé, mais ${failed.length} compte(s) ont échoué (voir console)`
        );
        console.warn("Échecs création staff:", failed);
      } else {
        toast.success("Assureur et comptes créés avec succès");
      }

      navigate("/developer");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la création");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Nouvel assureur</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="space-y-3">
          <h2 className="font-semibold text-lg">Informations de l’assureur</h2>
          <Input
            placeholder="Nom de l’assureur"
            required
            value={insurer.name}
            onChange={(e) => setInsurer({ ...insurer, name: e.target.value })}
          />
          <Input
            placeholder="Identifiant (slug)"
            required
            value={insurer.slug}
            onChange={(e) => setInsurer({ ...insurer, slug: e.target.value })}
          />
          <select
            className="border px-3 py-2 rounded text-sm w-full"
            value={insurer.verification_level}
            onChange={(e) =>
              setInsurer({ ...insurer, verification_level: e.target.value })
            }
          >
            <option value="N1">N1</option>
            <option value="N2">N2</option>
            <option value="N3">N3</option>
          </select>
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
                onChange={(e) => updateStaff(i, { role: e.target.value })}
              >
                <option value="admin">Admin</option>
                <option value="agent">Agent</option>
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
          {submitting ? "Création en cours…" : "Créer l’assureur"}
        </Button>
      </form>
    </div>
  );
}
