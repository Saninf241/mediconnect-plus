// src/pages/DebugReset.tsx
export default function DebugReset() {
  (async () => {
    try {
      localStorage.removeItem("establishmentUserSession");
      Object.keys(localStorage)
        .filter(k => k.startsWith("wizardDraft:") || k.startsWith("fp:"))
        .forEach(k => localStorage.removeItem(k));
      sessionStorage.clear();

      if (indexedDB.databases) {
        const dbs = await indexedDB.databases();
        await Promise.all(dbs.map(db => db?.name && indexedDB.deleteDatabase(db.name)));
      }
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
    } finally {
      window.location.replace("/sign-out");
    }
  })();
  return <div style={{ padding: 24 }}>Reset en cours…</div>;
}
