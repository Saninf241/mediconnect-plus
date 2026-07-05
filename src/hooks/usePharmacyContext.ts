// src/hooks/usePharmacyContext.ts
import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { supabase } from "../lib/supabase";

type PharmacyCtx = {
  staffId: string;
  staffName: string;
  pharmacyId: string;
  pharmacyName: string;
  email: string;
};

export function usePharmacyContext() {
  const { user } = useUser();
  const [ctx, setCtx] = useState<PharmacyCtx | null>(null);
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
          .from("pharmacy_staff")
          .select("id, full_name, email, pharmacy_id, pharmacies ( id, name )")
          .limit(1);

        if (clerkId) q = q.eq("clerk_user_id", clerkId);
        else if (email) q = q.eq("email", email);

        const { data, error } = await q.maybeSingle();

        if (error || !data) {
          console.error("[usePharmacyContext] not found", error);
          setCtx(null);
        } else {
          setCtx({
            staffId: String(data.id),
            staffName: data.full_name,
            pharmacyId: String(data.pharmacy_id),
            pharmacyName: data.pharmacies?.name || "Pharmacie",
            email: data.email,
          });
        }
      } catch (e) {
        console.error("[usePharmacyContext] unexpected", e);
        setCtx(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  return { ctx, loading };
}
