import { useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function useMultispecialistDoctorContext() {
  const { user } = useUser();
  const [doctorInfo, setDoctorInfo] = useState<{
    doctor_id: string;
    clinic_id: string;
  } | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const fetchData = async () => {
      const { data, error } = await supabase
        .from("clinic_staff")
        .select("id, clinic_id")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setDoctorInfo({
          doctor_id: data.id,
          clinic_id: data.clinic_id,
        });
      }
    };

    fetchData();
  }, [user]);

  return doctorInfo;
}
