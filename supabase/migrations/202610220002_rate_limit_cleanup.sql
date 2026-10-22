-- Remove temporary pseudonymous booking rate fingerprints even during quiet periods.
-- Idempotent: keep any existing job with the same name.
do $job$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron')
     and not exists (select 1 from cron.job where jobname = 'kafe-booking-rate-cleanup') then
    perform cron.schedule(
      'kafe-booking-rate-cleanup',
      '0 * * * *',
      $command$delete from private.kafe_booking_rate_events
                where created_at < now() - interval '24 hours';$command$
    );
  end if;
end;
$job$;