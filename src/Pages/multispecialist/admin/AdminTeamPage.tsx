// src/pages/multispecialist/admin/AdminTeamPage.tsx
import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useClinicId } from "../../../hooks/useClinicId";
import { Card, CardContent } from "../../../components/ui/card";
import { useUser } from "@clerk/clerk-react";

type StaffRoleFilter = "all" | "doctor" | "secretary" | "admin";
type StaffRole = "doctor" | "secretary" | "admin";

interface StaffRow {
  id: string;
  clinic_id: string | null;
  name: string | null;
  email?: string | null;
  role: string | null;
  clerk_user_id?: string | null;
  created_at?: string | null;
}

interface NewMemberForm {
  name: string;
  email: string;
  role: StaffRole;
}

function roleLabel(role: string | null) {
  const r = (role ?? "").toLowerCase();
  if (r === "doctor") return "Médecin";
  if (r === "secretary") return "Secrétaire";
  if (r === "admin") return "Admin";
  return role || "-";
}

function rolePillClass(role: string | null) {
  const r = (role ?? "").toLowerCase();

  if (r === "doctor") return "bg-blue-100 text-blue-700";
  if (r === "secretary") return "bg-amber-100 text-amber-700";
  if (r === "admin") return "bg-green-100 text-green-700";

  return "bg-gray-100 text-gray-700";
}

export default function AdminTeamPage() {
  const { clinicId, loadingClinic } = useClinicId();
  const { user } = useUser();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [note, setNote] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [staffRows, setStaffRows] = useState<StaffRow[]>([]);
  const [roleFilter, setRoleFilter] = useState<StaffRoleFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [form, setForm] = useState<NewMemberForm>({
    name: "",
    email: "",
    role: "doctor",
  });

  const currentUserEmail = user?.emailAddresses?.[0]?.emailAddress?.toLowerCase() ?? null;

  const fetchStaff = async () => {
    if (!clinicId) {
      setStaffRows([]);
      return;
    }

    const { data, error } = await supabase
      .from("clinic_staff")
      .select("id, clinic_id, name, email, role, clerk_user_id, created_at")
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[AdminTeamPage] clinic_staff fetch error:", error);
      setNote("Erreur lors du chargement de l’équipe.");
      setStaffRows([]);
      return;
    }

    setStaffRows((data ?? []) as StaffRow[]);
  };

  useEffect(() => {
    if (loadingClinic) return;

    const init = async () => {
      setLoading(true);
      setNote(null);
      setSuccessMessage(null);

      try {
        if (!clinicId) {
          setNote("Impossible de charger l’équipe pour cet établissement.");
          setLoading(false);
          return;
        }

        await fetchStaff();
      } catch (error) {
        console.error("[AdminTeamPage] unexpected init error:", error);
        setNote("Une erreur inattendue est survenue.");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [clinicId, loadingClinic]);

  const filteredStaff = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return staffRows.filter((row) => {
      const role = (row.role ?? "").toLowerCase();

      if (roleFilter !== "all" && role !== roleFilter) return false;

      if (!q) return true;

      return (
        (row.name ?? "").toLowerCase().includes(q) ||
        (row.email ?? "").toLowerCase().includes(q) ||
        role.includes(q)
      );
    });
  }, [staffRows, roleFilter, searchTerm]);

  const summary = useMemo(() => {
    const doctors = staffRows.filter((r) => (r.role ?? "").toLowerCase() === "doctor").length;
    const secretaries = staffRows.filter((r) => (r.role ?? "").toLowerCase() === "secretary").length;
    const admins = staffRows.filter((r) => (r.role ?? "").toLowerCase() === "admin").length;

    return {
      total: staffRows.length,
      doctors,
      secretaries,
      admins,
    };
  }, [staffRows]);

  const handleCreateMember = async (e: FormEvent) => {
    e.preventDefault();

    setNote(null);
    setSuccessMessage(null);

    if (!clinicId) {
      setNote("Aucun établissement détecté.");
      return;
    }

    if (!form.name.trim()) {
      setNote("Le nom est obligatoire.");
      return;
    }

    if (!form.email.trim()) {
      setNote("L’email est obligatoire.");
      return;
    }

    setSaving(true);

    try {
      const normalizedEmail = form.email.trim().toLowerCase();

      const existing = staffRows.find(
        (row) => (row.email ?? "").trim().toLowerCase() === normalizedEmail
      );

      if (existing) {
        setNote("Cet email existe déjà dans l’équipe.");
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from("clinic_staff")
        .insert({
          clinic_id: clinicId,
          name: form.name.trim(),
          email: normalizedEmail,
          role: form.role,
        });

      if (error) {
        console.error("[AdminTeamPage] create member error:", error);
        setNote("Impossible d’ajouter ce membre.");
        setSaving(false);
        return;
      }

      setForm({
        name: "",
        email: "",
        role: "doctor",
      });

      setSuccessMessage("Membre ajouté avec succès.");
      await fetchStaff();
    } catch (error) {
      console.error("[AdminTeamPage] unexpected create error:", error);
      setNote("Une erreur inattendue est survenue lors de l’ajout.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMember = async (member: StaffRow) => {
    setNote(null);
    setSuccessMessage(null);

    const memberEmail = (member.email ?? "").toLowerCase();

    if (currentUserEmail && memberEmail && currentUserEmail === memberEmail) {
      setNote("Vous ne pouvez pas supprimer votre propre compte depuis cette page.");
      return;
    }

    const confirmed = window.confirm(
      `Supprimer ${member.name || member.email || "ce membre"} de l’équipe ?`
    );

    if (!confirmed) return;

    setDeletingId(member.id);

    try {
      const { error } = await supabase
        .from("clinic_staff")
        .delete()
        .eq("id", member.id);

      if (error) {
        console.error("[AdminTeamPage] delete member error:", error);
        setNote("Impossible de supprimer ce membre.");
        setDeletingId(null);
        return;
      }

      setSuccessMessage("Membre supprimé avec succès.");
      await fetchStaff();
    } catch (error) {
      console.error("[AdminTeamPage] unexpected delete error:", error);
      setNote("Une erreur inattendue est survenue lors de la suppression.");
    } finally {
      setDeletingId(null);
    }
  };

  if (loadingClinic || loading) {
    return <div className="p-6">Chargement de l’équipe…</div>;
  }

  return (
    <div className="space-y-6">
      {note && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {note}
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Équipe</h1>
        <p className="text-sm text-gray-500">
          Gestion des médecins, secrétaires et administrateurs du cabinet.
        </p>
      </div>

      {/* Résumé */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Membres</p>
            <p className="mt-1 text-2xl font-bold">{summary.total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Médecins</p>
            <p className="mt-1 text-2xl font-bold text-blue-600">{summary.doctors}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Secrétaires</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">{summary.secretaries}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Admins</p>
            <p className="mt-1 text-2xl font-bold text-green-600">{summary.admins}</p>
          </CardContent>
        </Card>
      </div>

      {/* Ajout membre */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Ajouter un membre</h2>
            <p className="text-sm text-gray-500">
              Crée une ligne d’accès pour un médecin, une secrétaire ou un admin.
            </p>
          </div>

          <form onSubmit={handleCreateMember} className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Nom</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ex. Dr Mbadinga"
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="email@cabinet.com"
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Rôle</label>
              <select
                value={form.role}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, role: e.target.value as StaffRole }))
                }
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="doctor">Médecin</option>
                <option value="secretary">Secrétaire</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? "Ajout..." : "Ajouter"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700">Filtrer par rôle</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as StaffRoleFilter)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="all">Tous les rôles</option>
                <option value="doctor">Médecins</option>
                <option value="secretary">Secrétaires</option>
                <option value="admin">Admins</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Recherche</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nom, email, rôle..."
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste équipe */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Membres de l’équipe</h2>
              <p className="text-sm text-gray-500">
                Vue centralisée des accès liés à l’établissement.
              </p>
            </div>
            <span className="text-sm text-gray-400">
              {filteredStaff.length} membre(s)
            </span>
          </div>

          {filteredStaff.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun membre trouvé.</p>
          ) : (
            <div className="space-y-3">
              {filteredStaff.map((member) => {
                const isSelf = !!(
                  currentUserEmail &&
                  member.email &&
                  currentUserEmail === member.email.toLowerCase()
                );

                return (
                  <div
                    key={member.id}
                    className="flex flex-col gap-3 rounded-xl border bg-white px-4 py-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-gray-900">
                          {member.name || "Sans nom"}
                        </p>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${rolePillClass(
                            member.role
                          )}`}
                        >
                          {roleLabel(member.role)}
                        </span>
                        {isSelf && (
                          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                            Vous
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-sm text-gray-600">{member.email || "-"}</p>

                      <p className="mt-1 text-xs text-gray-400">
                        ID : {member.id}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleDeleteMember(member)}
                        disabled={deletingId === member.id || isSelf}
                        className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 disabled:opacity-50"
                      >
                        {deletingId === member.id ? "Suppression..." : "Supprimer"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}