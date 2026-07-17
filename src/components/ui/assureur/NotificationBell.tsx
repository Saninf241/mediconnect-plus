// src/components/ui/assureur/NotificationBell.tsx
// Cloche de notifications de l'en-tete assureur : agrege les notifications
// non lues (type "message", cf src/lib/queries/notifications.ts) tous
// consultations confondues, avec mise a jour temps reel.
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../lib/supabase";
import {
  getUnreadMessageCounts,
  markConsultationNotificationsAsRead,
  type UnreadByConsultation,
} from "../../../lib/queries/notifications";

export default function NotificationBell({ staffId }: { staffId: string }) {
  const [counts, setCounts] = useState<UnreadByConsultation>({});
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const data = await getUnreadMessageCounts(staffId);
    setCounts(data);
  };

  useEffect(() => {
    load();

    const channel = supabase
      .channel(`notif-bell-insurer-${staffId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${staffId}` },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [staffId]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const entries = Object.entries(counts);
  const total = entries.reduce((sum, [, info]) => sum + info.count, 0);

  const openConsultation = async (consultationId: string) => {
    setOpen(false);
    await markConsultationNotificationsAsRead(staffId, consultationId);
    await load();
    navigate(`/assureur/consultations/${consultationId}`);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-full text-gray-600 hover:bg-gray-100"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {total > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] leading-none rounded-full px-1.5 py-1 min-w-[16px] text-center">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white text-gray-900 rounded-lg shadow-lg border z-50 max-h-96 overflow-y-auto">
          <div className="px-4 py-2 border-b font-semibold text-sm">Notifications</div>
          {entries.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-500 text-center">Aucune notification non lue.</p>
          ) : (
            entries.map(([consultationId, info]) => (
              <button
                key={consultationId}
                onClick={() => openConsultation(consultationId)}
                className="w-full text-left px-4 py-3 border-b last:border-b-0 hover:bg-gray-50"
              >
                <div className="text-sm font-medium">
                  {info.hasDecision ? "Décision sur consultation" : "Nouveau message"}
                </div>
                <div className="text-xs text-gray-500">
                  Consultation {consultationId.slice(0, 8)} • {info.count} non lu{info.count > 1 ? "s" : ""}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
