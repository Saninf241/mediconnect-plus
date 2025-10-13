// src/Pages/FingerprintCallback.tsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function FingerprintCallback() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const [msg, setMsg] = useState("Biométrie");

  useEffect(() => {
    (async () => {
      const p = new URLSearchParams(search);
      const mode   = p.get("mode");           // "enroll" | "identify"
      const status = p.get("status");         // "captured" | "error" (enroll)
      const found  = p.get("found");          // "true" | "false" (identify)
      const pid    = p.get("patient_id");     // renvoyé par l’app
      const err    = p.get("error");

      // Log utile pour debug
      console.log("[FP CALLBACK]", { mode, status, found, pid, err });

      if (mode === "enroll") {
        if (status === "captured" && pid) {
          // Marque l’empreinte comme capturée
          await supabase
            .from("patients")
            .update({ fingerprint_enrolled: true, fingerprint_missing: false })
            .eq("id", pid);

          // Laisse une trace pour le wizard (étape 3→4)
          sessionStorage.setItem("fp:last", JSON.stringify({ type: "enroll", patient_id: pid, ok: true }));

          setMsg("Empreinte capturée ✅");
          // retourne au wizard (ou à la liste) selon ton flux
          setTimeout(() => navigate("/multispecialist/secretary/new"), 700);
          return;
        }

        // cas d’erreur d’enrôlement
        sessionStorage.setItem("fp:last", JSON.stringify({ type: "enroll", patient_id: pid, ok: false, error: err || "unknown" }));
        setMsg("Aucune empreinte reçue.");
        return;
      }

      if (mode === "identify") {
        // Tu pourras brancher ici le “match patient existant”
        const ok = found === "true";
        sessionStorage.setItem("fp:last", JSON.stringify({ type: "identify", ok, score: p.get("score") || null }));
        setMsg(ok ? "Empreinte reconnue ✅" : "Empreinte non reconnue.");
        setTimeout(() => navigate("/multispecialist/secretary/new"), 700);
        return;
      }

      setMsg("Aucune empreinte reçue.");
    })();
  }, [search, navigate]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Biométrie</h1>
      <p className="mt-2 text-gray-700">{msg}</p>
    </div>
  );
}
