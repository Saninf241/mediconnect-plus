// src/Pages/assureur/MembersDirectoryPage.tsx
// Base d'adherents que l'assureur declare lui-meme (assureurs N2/N3, sans
// integration API temps reel). Sert au rapprochement best-effort fait par
// le wizard secretaire (edge function match-insurer-directory) au moment
// de la declaration d'un patient assure -- jamais un blocage, juste un
// signal de confiance en plus du declaratif.
import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { toast } from "react-toastify";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { supabase } from "../../lib/supabase";
import { useInsurerContext } from "../../hooks/useInsurerContext";

type DirectoryRow = {
  id: string;
  full_name: string;
  national_id: string | null;
  member_no: string | null;
  plan_code: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  created_by_name: string | null;
  updated_at: string;
  updated_by_name: string | null;
};

const emptyForm = { full_name: "", national_id: "", member_no: "", plan_code: "", notes: "" };

export default function MembersDirectoryPage() {
  const { user } = useUser();
  const { ctx, loading: ctxLoading } = useInsurerContext();
  const [rows, setRows] = useState<DirectoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Seuls les comptes "admin" de l'assureur peuvent ecrire -- les agents
  // ne font que consulter (reduit la surface de fraude, cf RLS).
  const canWrite = ctx?.role === "admin";

  async function load() {
    if (!ctx) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("insurer_member_directory")
      .select(
        "id, full_name, national_id, member_no, plan_code, is_active, notes, created_at, created_by_name, updated_at, updated_by_name"
      )
      .eq("insurer_id", ctx.insurerId)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setRows(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.insurerId]);

  async function addMember() {
    if (!ctx || !user) return;
    if (!form.full_name.trim() || (!form.member_no.trim() && !form.national_id.trim())) {
      toast.error("Nom complet et (n° adhérent ou NIN) requis.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("insurer_member_directory").insert({
        insurer_id: ctx.insurerId,
        full_name: form.full_name.trim(),
        national_id: form.national_id.trim() || null,
        member_no: form.member_no.trim() || null,
        plan_code: form.plan_code.trim() || null,
        notes: form.notes.trim() || null,
        created_by_clerk_user_id: user.id,
        created_by_role: "admin",
        created_by_name: user.fullName || user.primaryEmailAddress?.emailAddress || null,
        created_by_email: user.primaryEmailAddress?.emailAddress ?? null,
      });
      if (error) throw error;
      toast.success("Adhérent ajouté");
      setForm(emptyForm);
      await load();
    } catch (e: any) {
      toast.error(e.message || "Échec de l'ajout");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(row: DirectoryRow) {
    if (!user) return;
    const { error } = await supabase
      .from("insurer_member_directory")
      .update({
        is_active: !row.is_active,
        updated_at: new Date().toISOString(),
        updated_by_clerk_user_id: user.id,
        updated_by_role: "admin",
        updated_by_name: user.fullName || user.primaryEmailAddress?.emailAddress || null,
        updated_by_email: user.primaryEmailAddress?.emailAddress ?? null,
      })
      .eq("id", row.id);
    if (error) toast.error(error.message);
    else load();
  }

  if (ctxLoading) return <p className="text-sm text-gray-500">Chargement…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Base adhérents</h1>
        <p className="text-sm text-gray-600">
          Adhérents que vous avez vérifiés côté assureur (portail, fichier reçu…). Utilisée pour un
          rapprochement automatique best-effort au moment de la déclaration d'un patient assuré par
          un cabinet — ça ne bloque jamais un enregistrement, ça renforce juste la confiance.
        </p>
      </div>

      {canWrite ? (
        <Card className="space-y-3">
          <h2 className="font-semibold">Ajouter un adhérent</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Input
              placeholder="Nom complet"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
            <Input
              placeholder="N° adhérent"
              value={form.member_no}
              onChange={(e) => setForm({ ...form, member_no: e.target.value })}
            />
            <Input
              placeholder="NIN"
              value={form.national_id}
              onChange={(e) => setForm({ ...form, national_id: e.target.value })}
            />
            <Input
              placeholder="Code plan"
              value={form.plan_code}
              onChange={(e) => setForm({ ...form, plan_code: e.target.value })}
            />
          </div>
          <Input
            placeholder="Notes (optionnel)"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <Button onClick={addMember} disabled={saving}>
            {saving ? "Ajout…" : "Ajouter"}
          </Button>
        </Card>
      ) : (
        <p className="text-sm text-amber-700 bg-amber-50 rounded p-2">
          Lecture seule : seul un compte "admin" de votre équipe peut ajouter ou modifier des
          adhérents.
        </p>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Chargement…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500">Aucun adhérent déclaré pour l'instant.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.id} className="flex items-center justify-between">
              <div>
                <div className="font-medium">
                  {r.full_name} {!r.is_active && <span className="text-xs text-red-600">(inactif)</span>}
                </div>
                <div className="text-xs text-gray-500">
                  N° {r.member_no ?? "—"} · NIN {r.national_id ?? "—"} · Plan {r.plan_code ?? "—"}
                </div>
                <div className="text-xs text-gray-400">
                  Ajouté par {r.created_by_name ?? "?"} le {new Date(r.created_at).toLocaleString("fr-FR")}
                  {r.updated_by_name && r.updated_at !== r.created_at && (
                    <> · modifié par {r.updated_by_name} le {new Date(r.updated_at).toLocaleString("fr-FR")}</>
                  )}
                </div>
              </div>
              {canWrite && (
                <button onClick={() => toggleActive(r)} className="text-sm text-indigo-700 hover:underline">
                  {r.is_active ? "Désactiver" : "Réactiver"}
                </button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
