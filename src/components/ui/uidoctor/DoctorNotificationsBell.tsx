// src/components/ui/uidoctor/DoctorNotificationsBell.tsx
// Cloche de notifications in-app pour le médecin. Réutilise la table
// notifications déjà en place (messagerie assureur, décisions) — jusqu'ici
// ces événements n'étaient visibles qu'en badges par ligne dans le suivi
// des consultations, sans point d'entrée global ni temps réel.
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { supabase } from "../../../lib/supabase";

interface Props {
  doctorId: string;
  basePath: "/doctor" | "/multispecialist/doctor";
}

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  content: string;
  read: boolean | null;
  created_at: string | null;
  metadata: Record<string, unknown> | null;
}

function timeAgo(iso: string | null) {
  if (!iso) return "";
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.floor(hours / 24)} j`;
}

export default function DoctorNotificationsBell({ doctorId, basePath }: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from("notifications")
      .select("id, type, title, content, read, created_at, metadata")
      .eq("user_id", doctorId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("[DoctorNotificationsBell] fetch error:", error);
      return;
    }
    setNotifications((data ?? []) as NotificationRow[]);
  };

  useEffect(() => {
    if (!doctorId) return;
    fetchNotifications();

    const channel = supabase
      .channel(`notifications:doctor:${doctorId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${doctorId}` },
        (payload) => {
          setNotifications((prev) => [payload.new as NotificationRow, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await supabase.from("notifications").update({ read: true }).eq("id", id);
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase.from("notifications").update({ read: true }).in("id", unreadIds);
  };

  const handleClick = async (n: NotificationRow) => {
    if (!n.read) await markAsRead(n.id);
    setOpen(false);

    const consultationId = n.metadata?.consultation_id;
    if (n.type === "appointment") {
      navigate(basePath);
    } else if (consultationId) {
      navigate(`${basePath}/consultations/${consultationId}`);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg hover:bg-white/10 transition"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl bg-white text-gray-900 shadow-xl border z-50">
          <div className="flex items-center justify-between px-4 py-2 border-b">
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-xs text-blue-600 hover:underline">
                Tout marquer comme lu
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-500 text-center">Aucune notification.</p>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`block w-full text-left px-4 py-3 hover:bg-gray-50 transition ${!n.read ? "bg-blue-50/60" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium text-gray-900">{n.title}</span>
                    {!n.read && <span className="mt-1 w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{n.content}</p>
                  <p className="text-[11px] text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
