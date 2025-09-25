import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useUser } from "@clerk/clerk-react";

export default function AntecedentsPage() {
  const { user } = useUser();
  const [history, setHistory] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("medical_history")
        .eq("email", user?.primaryEmailAddress?.emailAddress)
        .single();

      if (error || !data) return;
      setHistory(data.medical_history);
    };

    fetchHistory();
  }, [user]);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">🧬 Mes antécédents médicaux</h1>

      {history ? (
        <div className="whitespace-pre-line bg-white p-4 rounded shadow">
          {history}
        </div>
      ) : (
        <p>Aucun antécédent enregistré.</p>
      )}
    </div>
  );
}
