-- Support d'une file d'attente (patients avec ou sans RDV prealable) : on
-- distingue l'heure planifiee (appointment_date, deja existante) de l'heure
-- d'arrivee reelle au cabinet (checked_in_at), utilisee pour ordonner la
-- file en FIFO independamment de l'heure de RDV.
alter table public.appointments
  add column checked_in_at timestamp without time zone;
