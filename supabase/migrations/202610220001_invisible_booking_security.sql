-- Invisible, server-side abuse prevention for public reservations.
-- No captcha, client-side tracking, or change to staff/owner permissions.
-- Keep only salted HMAC fingerprints for 24h, never raw IP, email or phone.
create table if not exists private.kafe_booking_rate_secret (
  id integer primary key default 1 check (id = 1),
  secret text not null
);
insert into private.kafe_booking_rate_secret (id, secret)
values (1, encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (id) do nothing;

create table if not exists private.kafe_booking_rate_events (
  id bigint generated always as identity primary key,
  fingerprint text not null,
  created_at timestamptz not null default now()
);
create index if not exists kafe_booking_rate_events_lookup
  on private.kafe_booking_rate_events (fingerprint, created_at desc);
revoke all on private.kafe_booking_rate_secret from public, anon, authenticated;
revoke all on private.kafe_booking_rate_events from public, anon, authenticated;

create or replace function private.enforce_kafe_public_booking_rate(p_value jsonb)
returns void
language plpgsql security definer set search_path = ''
as $func$
declare
  v_secret text;
  v_headers jsonb := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  v_ip text := nullif(trim(split_part(coalesce(v_headers->>'x-forwarded-for', ''), ',', 1)), '');
  v_email text := lower(trim(coalesce(p_value->>'email', '')));
  v_phone text := regexp_replace(coalesce(p_value->>'phone', ''), '[^0-9]', '', 'g');
  v_ip_hash text;
  v_email_hash text;
  v_phone_hash text;
  v_key text;
  v_count integer;
  v_keys text[] := array[]::text[];
begin
  -- Called only by the anonymous online reservation flow, not staff walk-ins.
  select secret into v_secret from private.kafe_booking_rate_secret where id = 1;
  if v_secret is null then raise exception 'KAFE_SECURITY_NOT_CONFIGURED'; end if;

  -- X-Forwarded-For is supplied by the gateway. Contact limits remain a
  -- secondary defense if a proxy omits or allows spoofing of this header.
  if v_ip is not null then
    if length(v_ip) > 45 or v_ip !~ '^[0-9a-fA-F:.]+$' then
      v_ip := null;
    else
      begin
        v_ip := host(v_ip::inet);
      exception when invalid_text_representation then v_ip := null;
      end;
    end if;
  end if;

  if v_ip is not null then
    v_ip_hash := encode(extensions.hmac('ip:' || v_ip, v_secret, 'sha256'), 'hex');
    v_keys := array_append(v_keys, v_ip_hash);
  end if;
  if v_email <> '' then
    v_email_hash := encode(extensions.hmac('email:' || v_email, v_secret, 'sha256'), 'hex');
    v_keys := array_append(v_keys, v_email_hash);
  end if;
  if length(v_phone) >= 8 then
    v_phone_hash := encode(extensions.hmac('phone:' || v_phone, v_secret, 'sha256'), 'hex');
    v_keys := array_append(v_keys, v_phone_hash);
  end if;
  if cardinality(v_keys) = 0 then return; end if;

  -- Serialize concurrent submissions so parallel bot requests cannot bypass quotas.
  perform pg_advisory_xact_lock(hashtext('kafe-public-booking-rate')::bigint);
  delete from private.kafe_booking_rate_events
   where created_at < now() - interval '24 hours';

  foreach v_key in array v_keys loop
    select count(*) into v_count from private.kafe_booking_rate_events
    where fingerprint = v_key and created_at >= now() - interval '10 minutes';
    if v_count >= (case when v_key = v_ip_hash then 12 else 5 end) then
      raise exception 'KAFE_RATE_LIMITED';
    end if;
    select count(*) into v_count from private.kafe_booking_rate_events
    where fingerprint = v_key and created_at >= now() - interval '24 hours';
    if v_count >= (case when v_key = v_ip_hash then 60 else 16 end) then
      raise exception 'KAFE_RATE_LIMITED';
    end if;
  end loop;

  insert into private.kafe_booking_rate_events (fingerprint)
  select unnest(v_keys);
  -- Failed/invalid bookings roll back these records with the reservation.
end;
$func$;
revoke all on function private.enforce_kafe_public_booking_rate(jsonb)
  from public, anon, authenticated;

-- Harden the actual private booking function as well as the public wrapper.
-- A caller cannot forge a staff approval even if it bypasses the wrapper.
-- Keep the existing complex seating, schedule and payment logic untouched.
do $patch$
declare
  v_definition text;
  v_anchor text := '  perform pg_advisory_xact_lock(hashtext(''kafe-reservations-'' || p_date::text));';
  v_rate_anchor text := '  perform private.expire_kafe_no_shows();';
begin
  select pg_get_functiondef('private.create_kafe_reservation(jsonb,date,text,integer)'::regprocedure)
    into v_definition;
  if strpos(v_definition, 'perform private.enforce_kafe_public_booking_rate(p_value);') > 0 then
    return; -- idempotent
  end if;
  if strpos(v_definition, v_anchor) = 0 or strpos(v_definition, v_rate_anchor) = 0 then
    raise exception 'KAFE_SECURITY_PATCH_ANCHOR_NOT_FOUND';
  end if;

  v_definition := replace(v_definition, v_anchor,
    '  -- Never trust staff approval/payment flags in a public booking payload.' || E'\n' ||
    '  p_value := p_value - array[' || E'\n' ||
    '    ''groupApprovedAt'', ''groupApprovedBy'', ''groupApprovedByEmail'',' || E'\n' ||
    '    ''decisionAt'', ''decisionBy'', ''decisionMessage'', ''depositPaidAt'',' || E'\n' ||
    '    ''sumupCheckoutId'', ''depositRecordedBy'', ''paymentRequestEmailSentAt'',' || E'\n' ||
    '    ''depositReceiptEmailSentAt'', ''reservationCreatedEmailSentAt'',' || E'\n' ||
    '    ''adminAlertEmailSentAt'', ''adminPushSentAt'', ''reminderEmailSentAt''' || E'\n' ||
    '  ];' || E'\n\n' || v_anchor
  );
  v_definition := replace(v_definition, v_rate_anchor,
    '  perform private.enforce_kafe_public_booking_rate(p_value);' || E'\n' || v_rate_anchor
  );
  execute v_definition;
end;
$patch$;
