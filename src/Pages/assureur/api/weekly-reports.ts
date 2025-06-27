// src/pages/api/weekly-reports.ts
export async function loader() {
  return new Response(
    JSON.stringify([
      {
        id: "rpt-001",
        week: "29 avril - 5 mai 2025",
        created_at: "2025-05-06T12:00:00Z",
        url: "https://zwxegqevthzfphdqtjew.supabase.co/storage/v1/object/public/weekly-reports/test-report.pdf"
      }
    ]),
    { headers: { "Content-Type": "application/json" } }
  );
}
