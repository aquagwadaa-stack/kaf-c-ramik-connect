update public.kafe_settings
set
  value = jsonb_set(
    jsonb_set(
      value,
      '{reservationConditionsText}',
      to_jsonb(
        'Annulation possible jusqu''à 48 h avant. Au-delà, merci d''appeler le Kafé. Une réservation est libérée après plus de 35 minutes de retard. Pour les groupes, l''acompte est conservé si l''annulation intervient moins de 24 h avant.'::text
      ),
      true
    ),
    '{lateArrivalGraceMinutes}',
    '35'::jsonb,
    true
  ),
  updated_at = now()
where id = 'main';

update public.kafe_waiver_signatures
set
  reservation_ref = nullif(value ->> 'reservationRef', ''),
  document_version = coalesce(nullif(value ->> 'documentVersion', ''), document_version),
  signed_at = coalesce(nullif(value ->> 'signedAt', '')::timestamptz, signed_at),
  updated_at = now()
where
  reservation_ref is distinct from nullif(value ->> 'reservationRef', '')
  or document_version is distinct from coalesce(nullif(value ->> 'documentVersion', ''), document_version)
  or signed_at is distinct from coalesce(nullif(value ->> 'signedAt', '')::timestamptz, signed_at);
