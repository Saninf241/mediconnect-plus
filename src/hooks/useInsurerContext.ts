// src/hooks/useInsurerContext.ts
import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { supabase } from "../lib/supabase";

type InsurerCtx = {
  staffId: string;
  insurerId: string;
  role: string;
  email: string;
};

export function useInsurerContext() {
  const { user } = useUser();
  const [ctx, setCtx] = useState<InsurerCtx | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (!user) {
          setCtx(null);
          setLoading(false);
          return;
        }

        const clerkId = user.id;
        const email = user.primaryEmailAddress?.emailAddress || null;

        let q = supabase
          .from("insurer_staff")
          .select("id, insurer_id, role, email, clerk_user_id")
          .limit(1);

        if (clerkId) q = q.eq("clerk_user_id", clerkId);
        else if (email) q = q.eq("email", email);

        const { data, error } = await q.maybeSingle();

        if (error || !data) {
          console.error("[useInsurerContext] not found", error);
          setCtx(null);
        } else {
          setCtx({
            staffId: String(data.id),
            insurerId: String(data.insurer_id),
            role: data.role,
            email: data.email,
          });
        }
      } catch (e) {
        console.error("[useInsurerContext] unexpected", e);
        setCtx(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  return { ctx, loading };
}
