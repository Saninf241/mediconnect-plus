// src/lib/realtime/waitForBiometric.ts
import { supabase } from "../supabase";

export function waitForBiometric(consultationId: string, onValidated: () => void) {
  const channel = supabase
    .channel(`bio_${consultationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "biometric_captures",
        filter: `consultation_id=eq.${consultationId}`,
      },
      () => {
        onValidated();
        channel.unsubscribe();
      }
    )
    .subscribe();

  return () => channel.unsubscribe();
}
