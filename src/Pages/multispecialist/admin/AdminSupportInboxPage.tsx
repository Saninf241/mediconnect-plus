// src/Pages/multispecialist/admin/AdminSupportInboxPage.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useClinicId } from "../../../hooks/useClinicId";
import { Card, CardContent } from "../../../components/ui/card";

type SupportStatusFilter = "all" | "open" | "closed";
type PeriodFilter = "all" | "7d" | "30d" | "month";

interface SupportMessageRow {
  id: string;
  clinic_id: string | null;
  status: string | null;
  subject?: string | null;
  message?: string | null;
  sender_name?: string | null;
  sender_email?: string | null;
  created_at?: string | null;
}

function getStartDate(period: PeriodFilter): string | null {
  const now = new Date();

  if (period === "7d") {
    const d = new Date();
    d.setDate(now.getDate() - 7);
    return d.toISOString();
  }

  if (period === "30d") {
    const d = new Date();
    d.setDate(now.getDate() - 30);
    return d.toISOString();
  }

  if (period === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }

  return null;
}

function statusLabel(status: string | null) {
  const s = (status ?? "").toLowerCase();
  if (s === "open") return "Ouvert";
  if (s === "closed") return "Fermé";
  return status || "-";
}

function statusPillClass(status: string | null) {
  const s = (status ?? "").toLowerCase();

  if (s === "open") return "bg-amber-100 text-amber-700";
  if (s === "closed") return "bg-green-100 text-green-700";

  return "bg-gray-100 text-gray-700";
}

export default function AdminSupportInboxPage() {
  const { clinicId, loadingClinic } = useClinicId();

  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [messages, setMessages] = useState<SupportMessageRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<SupportStatusFilter>("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("30d");
  const [searchTerm, setSearchTerm] = useState("");

  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const pageSize = 12;

  const fetchMessages = async () => {
    if (!clinicId) {
      setMessages([]);
      return;
    }

    const startDate = getStartDate(periodFilter);

    let query = supabase
      .from("support_messages")
      .select("id, clinic_id, status, subject, message, sender_name, sender_email, created_at")
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: false });

    if (startDate) {
      query = query.gte("created_at", startDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[AdminSupportInboxPage] support_messages fetch error:", error);
      setNote("Erreur lors du chargement des messages de support.");
      setMessages([]);
      return;
    }

    setMessages((data ?? []) as SupportMessageRow[]);
  };

  useEffect(() => {
    if (loadingClinic) return;

    const init = async () => {
      setLoading(true);
      setNote(null);
      setSuccessMessage(null);

      try {
        if (!clinicId) {
          setNote("Impossible de charger le support pour cet établissement.");
          setLoading(false);
          return;
        }

        await fetchMessages();
      } catch (error) {
        console.error("[AdminSupportInboxPage] unexpected init error:", error);
        setNote("Une erreur inattendue est survenue.");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [clinicId, loadingClinic, periodFilter]);

  const filteredMessages = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return messages.filter((msg) => {
      const status = (msg.status ?? "").toLowerCase();

      if (statusFilter !== "all" && status !== statusFilter) return false;

      if (!q) return true;

      return (
        (msg.subject ?? "").toLowerCase().includes(q) ||
        (msg.message ?? "").toLowerCase().includes(q) ||
        (msg.sender_name ?? "").toLowerCase().includes(q) ||
        (msg.sender_email ?? "").toLowerCase().includes(q) ||
        msg.id.toLowerCase().includes(q)
      );
    });
  }, [messages, statusFilter, searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, periodFilter, searchTerm]);

  const summary = useMemo(() => {
    const open = filteredMessages.filter((m) => (m.status ?? "").toLowerCase() === "open").length;
    const closed = filteredMessages.filter((m) => (m.status ?? "").toLowerCase() === "closed").length;

    return {
      total: filteredMessages.length,
      open,
      closed,
    };
  }, [filteredMessages]);

  const paginatedMessages = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredMessages.slice(start, start + pageSize);
  }, [filteredMessages, page]);

  const totalPages = Math.max(1, Math.ceil(filteredMessages.length / pageSize));

  const handleStatusChange = async (
    messageId: string,
    nextStatus: "open" | "closed"
  ) => {
    setNote(null);
    setSuccessMessage(null);
    setUpdatingId(messageId);

    try {
      const { error } = await supabase
        .from("support_messages")
        .update({ status: nextStatus })
        .eq("id", messageId);

      if (error) {
        console.error("[AdminSupportInboxPage] update status error:", error);
        setNote("Impossible de mettre à jour le statut du message.");
        setUpdatingId(null);
        return;
      }

      setSuccessMessage(
        nextStatus === "closed"
          ? "Message marqué comme fermé."
          : "Message rouvert avec succès."
      );

      await fetchMessages();
    } catch (error) {
      console.error("[AdminSupportInboxPage] unexpected update error:", error);
      setNote("Une erreur inattendue est survenue lors de la mise à jour.");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loadingClinic || loading) {
    return <div className="p-6">Chargement du support…</div>;
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
        <h1 className="text-2xl font-bold text-gray-900">Support</h1>
        <p className="text-sm text-gray-500">
          Suivi des demandes de support liées à l’établissement.
        </p>
      </div>

      {/* Résumé */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Messages</p>
            <p className="mt-1 text-2xl font-bold">{summary.total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Ouverts</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">{summary.open}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Fermés</p>
            <p className="mt-1 text-2xl font-bold text-green-600">{summary.closed}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Statut</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as SupportStatusFilter)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="all">Tous</option>
                <option value="open">Ouverts</option>
                <option value="closed">Fermés</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Période</label>
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="all">Toute la période</option>
                <option value="7d">7 derniers jours</option>
                <option value="30d">30 derniers jours</option>
                <option value="month">Mois en cours</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Recherche</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Sujet, message, email, ID..."
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inbox */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Boîte de support</h2>
              <p className="text-sm text-gray-500">
                Messages de support du cabinet, avec suivi du statut.
              </p>
            </div>

            <span className="text-sm text-gray-400">
              {filteredMessages.length} message(s)
            </span>
          </div>

          {paginatedMessages.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun message trouvé.</p>
          ) : (
            <div className="space-y-4">
              {paginatedMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="rounded-xl border bg-white px-4 py-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-gray-900">
                          {msg.subject || "Sans objet"}
                        </p>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusPillClass(
                            msg.status
                          )}`}
                        >
                          {statusLabel(msg.status)}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                        {msg.message || "Aucun message"}
                      </p>

                      <div className="mt-3 space-y-1 text-xs text-gray-500">
                        <p>
                          Expéditeur : {msg.sender_name || "-"}
                          {msg.sender_email ? ` • ${msg.sender_email}` : ""}
                        </p>
                        <p>
                          Date :{" "}
                          {msg.created_at
                            ? new Date(msg.created_at).toLocaleString("fr-FR")
                            : "-"}
                        </p>
                        <p>ID : {msg.id}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {(msg.status ?? "").toLowerCase() === "open" ? (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(msg.id, "closed")}
                          disabled={updatingId === msg.id}
                          className="rounded-lg border border-green-200 px-3 py-2 text-sm font-medium text-green-700 disabled:opacity-50"
                        >
                          {updatingId === msg.id ? "Mise à jour..." : "Marquer fermé"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(msg.id, "open")}
                          disabled={updatingId === msg.id}
                          className="rounded-lg border border-amber-200 px-3 py-2 text-sm font-medium text-amber-700 disabled:opacity-50"
                        >
                          {updatingId === msg.id ? "Mise à jour..." : "Rouvrir"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <div className="mt-2 flex items-center justify-between">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
                >
                  Précédent
                </button>

                <p className="text-sm text-gray-500">
                  Page {page} / {totalPages}
                </p>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}