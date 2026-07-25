-- Visibilite atténuée des flags anti-fraude pour le medecin concerne : il
-- doit voir qu'une de ses consultations est "en revue" pour comprendre un
-- eventuel retard/blocage, SANS connaitre la regle precise ni le seuil
-- declenche (risque de contournement si un medecin de mauvaise foi
-- ajuste son comportement pour passer sous le radar). consultations_anomalies_7d
-- reste strictement assureur/admin -- cette fonction ne renvoie que des ids,
-- jamais type/title/message, et s'auto-filtre sur le medecin appelant via
-- doctor_can_read_consultation (meme fonction que la RLS patients/consultations).
create or replace function public.doctor_flagged_consultation_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select distinct a.consultation_id
  from consultations_anomalies_7d a
  join consultations c on c.id = a.consultation_id
  where a.consultation_id is not null
    and public.doctor_can_read_consultation(c.doctor_id);
$$;

grant execute on function public.doctor_flagged_consultation_ids() to authenticated;
