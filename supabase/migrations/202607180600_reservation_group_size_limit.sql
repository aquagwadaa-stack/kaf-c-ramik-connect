alter table public.kafe_reservations
  drop constraint if exists kafe_reservations_people_check;

alter table public.kafe_reservations
  add constraint kafe_reservations_people_check
  check (people between 1 and 15);
