// src/Pages/assureur/StatistiquesPage.tsx
import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Card } from "../../components/ui/card";
import { supabase } from "../../lib/supabase";
import { useInsurerContext } from "../../hooks/useInsurerContext";

type Row = {
  id: string;
  insurer_amount: number | null;
  status: string | null;
  clinic_id: string | null;
  clinic: { name: string | null } | null;
};

type ClinicStat = { name: string; count: number; amount: number };

export default function StatistiquesPage() {
  const { ctx, loading: ctxLoading } = useInsurerContext();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ctx) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("consultations")
        .select("id, insurer_amount, status, clinic_id, clinic:clinic_id(name)")
        .eq("insurer_id", ctx.insurerId);

      if (error) console.error("[StatistiquesPage] erreur chargement :", error.message);
      else setRows((data ?? []) as any);
      setLoading(false);
    })();
  }, [ctx]);

  const stats = useMemo(() => {
    const total = rows.length;
    const sent = rows.filter((r) => r.status === "sent").length;
    const accepted = rows.filter((r) => r.status === "accepted").length;
    const rejected = rows.filter((r) => r.status === "rejected").length;
    const paid = rows.filter((r) => r.status === "paid").length;
    const amountOwed = rows
      .filter((r) => r.status === "accepted" || r.status === "paid")
      .reduce((sum, r) => sum + (r.insurer_amount ?? 0), 0);
    return { total, sent, accepted, rejected, paid, amountOwed };
  }, [rows]);

  const byClinic = useMemo(() => {
    const map = new Map<string, ClinicStat>();
    for (const r of rows) {
      const key = r.clinic_id ?? "unknown";
      const name = r.clinic?.name ?? "Clinique inconnue";
      const entry = map.get(key) ?? { name, count: 0, amount: 0 };
      entry.count += 1;
      entry.amount += r.insurer_amount ?? 0;
      map.set(key, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [rows]);

  if (ctxLoading || loading) return <p>Chargement...</p>;
  if (!ctx) return <p className="text-red-600">Impossible de déterminer votre compte assureur.</p>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Statistiques</h2>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="p-4">
          <h4 className="text-sm text-gray-500">Total</h4>
          <p className="text-2xl font-bold">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <h4 className="text-sm text-gray-500">En attente</h4>
          <p className="text-2xl font-bold text-yellow-600">{stats.sent}</p>
        </Card>
        <Card className="p-4">
          <h4 className="text-sm text-gray-500">Acceptées</h4>
          <p className="text-2xl font-bold text-green-600">{stats.accepted}</p>
        </Card>
        <Card className="p-4">
          <h4 className="text-sm text-gray-500">Rejetées</h4>
          <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
        </Card>
        <Card className="p-4">
          <h4 className="text-sm text-gray-500">Payées</h4>
          <p className="text-2xl font-bold text-blue-600">{stats.paid}</p>
        </Card>
      </div>

      <Card className="p-4">
        <h4 className="text-sm text-gray-500">Montant dû aux cliniques (acceptées + payées)</h4>
        <p className="text-2xl font-bold">{stats.amountOwed.toLocaleString()} FCFA</p>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold text-lg mb-3">Consultations par clinique</h3>
        {byClinic.length === 0 ? (
          <p className="text-sm text-gray-500">Aucune donnée pour le moment.</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(200, byClinic.length * 40)}>
            <BarChart data={byClinic} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={160} />
              <Tooltip />
              <Bar dataKey="count" fill="#4f46e5" name="Consultations" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold text-lg mb-3">Détail par clinique</h3>
        {byClinic.length === 0 ? (
          <p className="text-sm text-gray-500">Aucune donnée pour le moment.</p>
        ) : (
          <div className="space-y-2">
            {byClinic.map((c) => (
              <div key={c.name} className="flex items-center justify-between border-b pb-2 text-sm">
                <span className="font-medium">{c.name}</span>
                <span className="text-gray-500">
                  {c.count} consultation{c.count > 1 ? "s" : ""} • {c.amount.toLocaleString()} FCFA
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
