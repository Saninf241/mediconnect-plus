// src/components/ui/BiometryBanner.tsx
export default function BiometryBanner() {
  return (
    <div className="p-4 mb-4 bg-yellow-100 border border-yellow-300 text-yellow-700 rounded">
      ⚠ L’appareil biométrique n’est pas détecté. Vous pouvez continuer à consulter et enrichir le dossier médical, mais la transmission vers l’assureur sera bloquée.
    </div>
  );
}
