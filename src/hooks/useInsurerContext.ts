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

        const selectFields = "id, insurer_id, role, email, clerk_user_id";

        let data: any = null;
        let error: any = null;

        if (clerkId) {
          const res = await supabase
            .from("insurer_staff")
            .select(selectFields)
            .eq("clerk_user_id", clerkId)
            .maybeSingle();
          data = res.data;
          error = res.error;
        }

        // Repli par email : necessaire pour un compte invite (via
        // dev-create-insurer) dont clerk_user_id est encore null tant que
        // l'invitation n'a pas ete acceptee au moment de l'insert.
        if (!data && email) {
          const res = await supabase
            .from("insurer_staff")
            .select(selectFields)
            .eq("email", email)
            .maybeSingle();
          data = res.data;
          error = res.error;
        }

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
