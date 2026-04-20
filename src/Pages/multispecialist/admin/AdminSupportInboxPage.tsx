// src/pages/multispecialist/admin/SupportInboxPage.tsx

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Textarea } from "../../../components/ui/textarea";
import { useClinicId } from "../../../hooks/useClinicId";

interface SupportMessage {
  id: string;
  subject: string;
  message: string;
  sender_role: "doctor" | "secretary" | string;
  sender_name?: string | null;
  created_at: string;
  status: "open" | "resolved";
  target: "admin" | "support";
  clinic_id: string;
}

export default function SupportInboxPage() {
  // ✅ bon usage du hook : on récupère l'ID et l'état de chargement
  const { clinicId, loadingClinic } = useClinicId();

  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Filtres
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "resolved">("all");
  const [roleFilter, setRoleFilter] = useState<"all" | "doctor" | "secretary">("all");
  const [recentOnly, setRecentOnly] = useState(false);

  // Réponses / actions
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<Record<string, boolean>>({});
  const [resolving, setResolving] = useState<Record<string, boolean>>({});

  // ✅ force une string UUID pour éviter eq("clinic_id", [object Object])
  const clinicIdStr = useMemo(() => {
    const c: any = clinicId;
    return typeof c === "string" ? c : c?.id || c?.clinic_id || c?.clinic?.id || null;
  }, [clinicId]);

  // Badge statut
  const statusChip = (s: "open" | "resolved") => (
    <span
      className={`text-xs px-2 py-1 rounded ${
        s === "resolved" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
      }`}
    >
      {s === "resolved" ? "Traité" : "Ouvert"}
    </span>
  );

  // --------- Chargement (avec filtres) ----------
  useEffect(() => {
    if (loadingClinic) return;
    if (!clinicIdStr) {
      setLoading(false);
      setErr("Cabinet introuvable (clinicId manquant).");
      return;
    }

    const fetchMessages = async () => {
      setLoading(true);
      setErr(null);

      let query = supabase
        .from("support_messages")
        .select("*")
        .eq("clinic_id", clinicIdStr)
        .eq("target", "admin")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (roleFilter !== "all") query = query.eq("sender_role", roleFilter);
      if (recentOnly) {
        const since = new Date();
        since.setDate(since.getDate() - 7);
        query = query.gte("created_at", since.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error("[SupportInbox] fetch messages:", error);
        setErr("Impossible de charger les messages (droits/table/RLS).");
        setMessages([]);
      } else {
        setMessages((data || []) as SupportMessage[]);
      }
      setLoading(false);
    };

    fetchMessages();
  }, [loadingClinic, clinicIdStr, statusFilter, roleFilter, recentOnly]);

  // --------- Actions ----------
  const markAsResolved = async (id: string) => {
    if (!clinicIdStr) return;
    setResolving((s) => ({ ...s, [id]: true }));

    const { error } = await supabase
      .from("support_messages")
      .update({ status: "resolved" })
      .eq("id", id)
      .eq("clinic_id", clinicIdStr); // 🔒 scope cabinet

    if (error) {
      console.error("[SupportInbox] resolve error:", error);
    } else {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status: "resolved" } : m)));
    }
    setResolving((s) => ({ ...s, [id]: false }));
  };

  const sendReply = async (msg: SupportMessage) => {
    if (!clinicIdStr) return;
    const text = (replyText[msg.id] || "").trim();
    if (!text) return;

    setSending((s) => ({ ...s, [msg.id]: true }));

    const { error } = await supabase.from("support_responses").insert({
      message_id: msg.id,
      reply: text,
      responder_role: "admin",
      responder_name: "Administrateur",
      clinic_id: clinicIdStr, // 🔒
    });

    if (error) {
      console.error("[SupportInbox] reply error:", error);
    } else {
      setReplyText((prev) => ({ ...prev, [msg.id]: "" }));
    }
    setSending((s) => ({ ...s, [msg.id]: false }));
  };

  // --------- UI ----------
  if (loadingClinic || loading) return <div className="p-6">Chargement…</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">📬 Boîte de réception – Support interne</h2>
        {!loading && (
          <div className="text-sm text-gray-600">
            {messages.length} message{messages.length > 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Filtres */}
      <div className="flex gap-4 flex-wrap">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="border p-1 rounded"
        >
          <option value="all">Tous les statuts</option>
          <option value="open">Ouverts</option>
          <option value="resolved">Traités</option>
        </select>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as any)}
          className="border p-1 rounded"
        >
          <option value="all">Tous les rôles</option>
          <option value="doctor">Médecins</option>
          <option value="secretary">Secrétaires</option>
        </select>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={recentOnly}
            onChange={() => setRecentOnly(!recentOnly)}
          />
          7 derniers jours
        </label>
      </div>

      {err ? (
        <p className="text-red-600">{err}</p>
      ) : messages.length === 0 ? (
        <p className="text-gray-500">Aucun message à afficher.</p>
      ) : (
        messages.map((msg) => (
          <Card key={msg.id}>
            <CardContent className="space-y-2 p-4">
              <div className="flex justify-between text-sm text-gray-500">
                <span>{new Date(msg.created_at).toLocaleString("fr-FR")}</span>
                {statusChip(msg.status)}
              </div>

              <h3 className="font-semibold">{msg.subject}</h3>
              <p>{msg.message}</p>
              <p className="text-xs text-gray-400">
                Envoyé par {msg.sender_name || "Utilisateur inconnu"} ({msg.sender_role})
              </p>

              {msg.status === "open" && (
                <div className="space-y-2 mt-2">
                  <Textarea
                    placeholder="Répondre à ce message…"
                    value={replyText[msg.id] || ""}
                    onChange={(e) =>
                      setReplyText((prev) => ({ ...prev, [msg.id]: e.target.value }))
                    }
                  />
                  <div className="flex gap-2">
                    <Button onClick={() => sendReply(msg)} disabled={sending[msg.id]}>
                      {sending[msg.id] ? "Envoi…" : "Envoyer la réponse"}
                    </Button>
                    <Button onClick={() => markAsResolved(msg.id)} disabled={resolving[msg.id]}>
                      {resolving[msg.id] ? "Mise à jour…" : "Marquer comme traité"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
