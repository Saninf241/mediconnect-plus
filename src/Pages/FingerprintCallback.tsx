// src/pages/FingerprintCallback.tsx
import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function FingerprintCallback() {
  const { search } = useLocation();
  const navigate = useNavigate();

  const q = useMemo(() => Object.fromEntries(new URLSearchParams(search)), [search]);

  useEffect(() => {
    // Optional: send to backend
    fetch("/api/fingerprint/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(q),
    }).catch(() => {});
  }, [q]);

  // Simple UI
  const ok = q.found === "true";
  return (
    <div style={{ padding: 24 }}>
      <h2>Résultat empreinte</h2>
      <p>Consultation: <b>{q.consultation_id}</b></p>
      {ok ? (
        <>
          <p>✅ Correspondance trouvée</p>
          <p>Utilisateur: <b>{q.user_id}</b></p>
          <p>Score: <b>{q.score}</b></p>
        </>
      ) : (
        <>
          <p>❌ Aucune correspondance</p>
          {q.error && <p>Détail: <code>{q.error}</code></p>}
        </>
      )}
      <button onClick={() => navigate(`/consultations/${q.consultation_id}`)}>
        Revenir à la consultation
      </button>
    </div>
  );
}
