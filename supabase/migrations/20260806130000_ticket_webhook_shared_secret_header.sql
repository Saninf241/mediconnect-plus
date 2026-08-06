-- Suite du correctif notify-ticket-email (voir supabase/functions/notify-ticket-email/index.ts) :
-- les 2 "Database Webhooks" configures via l'UI Studio (notify-new-ticket sur
-- support_tickets, notify-new-ticket-message sur support_ticket_messages) sont
-- en realite de simples triggers Postgres (supabase_functions.http_request).
-- On les recree a l'identique (meme url/method/params/timeout) en ajoutant le
-- header x-webhook-secret, pour matcher la verification ajoutee cote fonction.
drop trigger if exists "notify-new-ticket" on public.support_tickets;
create trigger "notify-new-ticket"
after insert on public.support_tickets
for each row
execute function supabase_functions.http_request(
  'https://zwxegqevthzfphdqtjew.supabase.co/functions/v1/notify-ticket-email',
  'POST',
  '{"Content-type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3eGVncWV2dGh6ZnBoZHF0amV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTExMjI5OSwiZXhwIjoyMDU0Njg4Mjk5fQ.qXu29r14dphkDnehU0IkoEb5RW6ZNTqScBQuGuroNlg","x-webhook-secret":"0owzHD92CHjIRUTia5ky5CzzTAt4FQP7fLzqg8Gu"}',
  '{}',
  '3000'
);

drop trigger if exists "notify-new-ticket-message" on public.support_ticket_messages;
create trigger "notify-new-ticket-message"
after insert on public.support_ticket_messages
for each row
execute function supabase_functions.http_request(
  'https://zwxegqevthzfphdqtjew.supabase.co/functions/v1/notify-ticket-email',
  'POST',
  '{"Content-type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3eGVncWV2dGh6ZnBoZHF0amV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTExMjI5OSwiZXhwIjoyMDU0Njg4Mjk5fQ.qXu29r14dphkDnehU0IkoEb5RW6ZNTqScBQuGuroNlg","x-webhook-secret":"0owzHD92CHjIRUTia5ky5CzzTAt4FQP7fLzqg8Gu"}',
  '{}',
  '5000'
);
