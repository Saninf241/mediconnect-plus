// src/Pages/shared/doctor/SettingsPage.tsx
import { useEffect, useState } from "react";
import { supabase } from '../../../lib/supabase';
import { useUser } from "@clerk/clerk-react";
import ClinicPaymentInfoCard from "../../../components/ui/ClinicPaymentInfoCard";

export default function SettingsPage() {
  const { user } = useUser();
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user) return;

      const email = user.emailAddresses?.[0]?.emailAddress;
      const { data: staff } = await supabase
        .from("clinic_staff")
        .select("clinic_id")
        .eq("email", email)
        .maybeSingle();

      if (staff?.clinic_id) {
        const { data: clinic } = await supabase
          .from("clinics")
          .select("subscription_plan")
          .eq("id", staff.clinic_id)
          .maybeSingle();

        setSubscriptionPlan(clinic?.subscription_plan ?? null);
      }
    };

    fetchSubscription();
  }, [user]);

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold text-blue-700">⚙️ Paramètres</h1>

      <ClinicPaymentInfoCard />

      {subscriptionPlan && (
        <p className="text-sm text-gray-500">Formule actuelle : {subscriptionPlan}</p>
      )}
    </div>
  );
}
