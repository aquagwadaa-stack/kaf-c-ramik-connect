update public.kafe_settings
set value = jsonb_set(
  value,
  '{walkInNoticeText}',
  '"Pour manger un bagel, bruncher ou boire un café, tu peux passer sans réserver selon les places. Pour peindre sur céramique, la réservation te donne la priorité."'::jsonb
)
where id = '1';