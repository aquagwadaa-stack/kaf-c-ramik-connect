-- Rules confirmed at the 8 September meeting. Preserve opening/payment switches and all other settings.
update public.kafe_settings
set value = value || jsonb_build_object(
  'slotDurationMinutes', 180,
  'depositThreshold', 8,
  'manualConfirmationThreshold', 8,
  'depositFixedAmount', 100,
  'cafeClosingTime', coalesce(value->>'cafeClosingTime', '18:30')
), updated_at = now()
where id = 'main';
