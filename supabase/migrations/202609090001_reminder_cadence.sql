-- Keep the existing authenticated command; only reduce the reminder scheduling delay.
do $$
declare reminder_job bigint;
begin
  select jobid into reminder_job from cron.job
  where jobname = 'kafe-emails-reminders-hourly';
  if reminder_job is not null then
    perform cron.alter_job(reminder_job, schedule := '*/5 * * * *');
  end if;
end;
$$;
