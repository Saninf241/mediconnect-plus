// src/Pages/developer/NewInsurerPage.tsx
import React, { useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";

const FUNCTIONS_BASE =
  (import.meta.env.VITE_SUPABASE_URL as string).replace(/\/+$/, "") +
  "/functions/v1";

type StaffRow = { name: string; email: string; role: string };
type StaffResult = { email: string; status: "ok" | "error"; error?: string };
type CreationResult = { insurer_id: string; insurerName: string; staff: StaffResult[] };

export default function NewInsurerPage() {
  const { getToken } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CreationResult | null>(null);

  const [insurer, setInsurer] = useState({
    name: "",
    verification_level: "N1",
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

      setResult({ insurer_id: data.insurer_id, insurerName: insurer.name, staff: data.staff ?? [] });
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la création");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForCreatingAnother = () => {
    setResult(null);
    setInsurer({ name: "", verification_level: "N1" });
    setStaff([{ name: "", email: "", role: "admin" }]);
  };

  if (result) {
    const failed = result.staff.filter((s) => s.status === "error");
    const ok = result.staff.filter((s) => s.status === "ok");

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="space-y-4 border-2 border-green-200">
          <div>
            <h1 className="text-2xl font-bold text-green-700">✅ Assureur créé</h1>
            <p className="text-gray-600">
              « {result.insurerName} » — id <span className="font-mono text-sm">{result.insurer_id}</span>
            </p>
          </div>

          {ok.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm text-gray-700 mb-1">
                Invitations envoyées ({ok.length})
              </h3>
              <ul className="text-sm space-y-1">
                {ok.map((s) => (
                  <li key={s.email} className="text-green-700">✅ {s.email}</li>
                ))}
              </ul>
            </div>
          )}

          {failed.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm text-red-700 mb-1">
                Échecs ({failed.length})
              </h3>
              <ul className="text-sm space-y-1">
                {failed.map((s) => (
                  <li key={s.email} className="text-red-700">
                    ❌ {s.email} — {s.error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.staff.length === 0 && (
            <p className="text-sm text-gray-500">Aucun compte staff n'a été demandé.</p>
          )}

          <p className="text-sm text-amber-700 bg-amber-50 rounded p-2">
            N'oublie pas d'ajouter une convention avec le(s) cabinet(s) concernés depuis
            « Gérer cabinets & assureurs » pour que cet assureur soit proposé lors de la
            création d'un patient assuré.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={resetForCreatingAnother}>Créer un autre assureur</Button>
            <Link to="/developer/manage" className="px-4 py-2 text-sm rounded border">
              Gérer cabinets & assureurs
            </Link>
            <Link to="/developer" className="px-4 py-2 text-sm rounded border">
              Accueil dev
            </Link>
          </div>
        </Card>
      </div>
    );
  }

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
          <p className="text-xs text-gray-500">
            N1 = intégration automatisée avec l'assureur (API/fichier fréquent, vérification temps
            réel). N2 = l'assureur a une base consultable mais uniquement via une action humaine
            (portail, import périodique). N3 = aucune base numérique côté assureur — purement
            déclaratif, accompagné jusqu'à digitalisation (voir "Base adhérents" dans Gérer
            cabinets & assureurs).
          </p>
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
