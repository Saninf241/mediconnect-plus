import { supabase } from "../../../lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { search, status, clinicId, dateStart, dateEnd } = body;

    let query = supabase
      .from("consultations")
      .select(
        `
        id,
        created_at,
        amount,
        status,
        patient:patients ( id, name ),
        doctor:clinic_staff ( id, name ),
        clinic:clinics ( id, name )
      `
      );

    if (status) query = query.eq("status", status);
    if (clinicId) query = query.eq("clinic_id", clinicId);
    if (dateStart) query = query.gte("created_at", dateStart);
    if (dateEnd) query = query.lte("created_at", dateEnd);

    const { data, error } = await query;

    if (error) throw error;

    // recherche plein texte
    const filtered = data?.filter((c) => {
      const q = search?.toLowerCase?.() || "";
      return (
        c.patient?.name?.toLowerCase?.().includes(q) ||
        c.doctor?.name?.toLowerCase?.().includes(q) ||
        c.clinic?.name?.toLowerCase?.().includes(q)
      );
    });

    return new Response(JSON.stringify(filtered), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message || "Erreur interne" }),
      { status: 500 }
    );
  }
}
