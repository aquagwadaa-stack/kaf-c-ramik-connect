update public.kafe_settings
set
  value = value || jsonb_build_object(
    'configurationVersion', 5,
    'depositThreshold', 8,
    'depositFixedAmount', 100,
    'manualConfirmationThreshold', 8,
    'cancellationNoticeHours', 48,
    'groupDepositForfeitHours', 24,
    'kitchenClosingTime', '17:30'
  ),
  updated_at = now()
where id = 'main';
