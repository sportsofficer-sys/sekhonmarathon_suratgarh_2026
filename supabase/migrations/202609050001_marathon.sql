-- PROPOSAL: run as project owner in a NEW Supabase project's SQL Editor.
-- Does not configure Auth/SMTP or deploy an Edge Function. Read README.md first.
-- Never add marathon_private to the Data API's exposed schemas.
begin;

create schema if not exists marathon_private;
revoke all on schema marathon_private from public, anon, authenticated;
grant usage on schema marathon_private to authenticated, service_role;

create table if not exists public.event_config (
  id text primary key,
  registration_open boolean not null default false,
  payment_configured boolean not null default false,
  event_starts_at timestamptz not null,
  registration_deadline timestamptz not null,
  payment_qr_url text,
  payee_name text,
  upi_id text,
  contact_phone text,
  contact_email text,
  updated_at timestamptz not null default now(),
  constraint event_config_deadline_before_event check (registration_deadline < event_starts_at),
  constraint event_config_payment_ready check (
    not payment_configured or (
      nullif(btrim(payment_qr_url), '') is not null
      and payment_qr_url like 'https://%'
      and nullif(btrim(payee_name), '') is not null
      and nullif(btrim(upi_id), '') is not null
    )
  ),
  constraint event_config_open_requires_payment check (not registration_open or payment_configured)
);

insert into public.event_config (
  id, registration_open, payment_configured, event_starts_at, registration_deadline
) values (
  'suratgarh-2026', false, false,
  '2026-10-04T05:00:00+05:30', '2026-09-27T23:59:59+05:30'
) on conflict (id) do nothing;

create table if not exists public.race_config (
  event_id text not null references public.event_config(id),
  race text not null check (race in ('5', '10', '21')),
  fee_paise integer not null check (fee_paise > 0),
  primary key (event_id, race)
);
insert into public.race_config(event_id, race, fee_paise) values
  ('suratgarh-2026', '5', 39900),
  ('suratgarh-2026', '10', 89900),
  ('suratgarh-2026', '21', 89900)
on conflict (event_id, race) do nothing;

create table if not exists marathon_private.invitations (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.event_config(id),
  label text not null,
  code_sha256 text not null check (code_sha256 ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (event_id, code_sha256)
);

create table if not exists marathon_private.memberships (
  event_id text not null references public.event_config(id),
  user_id uuid not null references auth.users(id),
  invitation_id uuid not null references marathon_private.invitations(id),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (event_id, user_id)
);

create table if not exists marathon_private.organizers (
  event_id text not null references public.event_config(id),
  user_id uuid not null references auth.users(id),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (event_id, user_id)
);

-- A single counter per Auth UUID, across all event IDs, prevents changing the
-- event argument to reset the allowance. Only wrong invitation codes count.
create table if not exists marathon_private.invitation_attempts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null default now(),
  failed_attempts integer not null default 0 check (failed_attempts between 0 and 5),
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id text not null default 'suratgarh-2026' references public.event_config(id),
  user_id uuid not null references auth.users(id),
  submission_id uuid not null,
  full_name text not null check (char_length(btrim(full_name)) between 2 and 120),
  mobile text not null check (mobile ~ '^[6-9][0-9]{9}$'),
  email text not null check (char_length(email) between 3 and 254),
  dob date not null check (dob >= date '1900-01-01'),
  gender text not null check (gender in ('male', 'female', 'other', 'prefer_not_to_say')),
  race text not null,
  tshirt text not null check (tshirt in ('XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL')),
  blood_group text not null check (blood_group in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown')),
  emergency_contact text not null check (emergency_contact ~ '^[6-9][0-9]{9}$'),
  city text not null check (char_length(btrim(city)) between 2 and 100),
  participant_type text not null check (participant_type in ('airwarrior', 'family')),
  transaction_id text not null check (transaction_id ~ '^[A-Za-z0-9-]{6,64}$'),
  receipt_path text not null unique,
  consent boolean not null check (consent is true),
  fee_paise integer not null check (fee_paise > 0),
  payment_status text not null default 'pending_review' check (payment_status in ('pending_review', 'verified', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  review_note text check (char_length(review_note) <= 1000),
  foreign key (event_id, race) references public.race_config(event_id, race),
  unique (user_id, submission_id),
  constraint registrations_review_state check (
    (payment_status = 'pending_review' and reviewed_at is null and reviewed_by is null)
    or (payment_status in ('verified', 'rejected') and reviewed_at is not null and reviewed_by is not null)
  )
);
create index if not exists registrations_owner_idx on public.registrations(user_id, created_at desc);
create index if not exists registrations_review_idx on public.registrations(event_id, payment_status, created_at);
create unique index if not exists registrations_unique_transaction_idx
  on public.registrations(event_id, lower(btrim(transaction_id)));

alter table public.event_config enable row level security;
alter table public.race_config enable row level security;
alter table public.registrations enable row level security;
alter table marathon_private.invitations enable row level security;
alter table marathon_private.memberships enable row level security;
alter table marathon_private.organizers enable row level security;
alter table marathon_private.invitation_attempts enable row level security;

revoke all on table public.event_config, public.race_config, public.registrations from public, anon, authenticated;
revoke all on all tables in schema marathon_private from public, anon, authenticated;
grant select on table public.event_config, public.race_config to anon, authenticated;
grant select on table public.registrations to authenticated;
grant select, insert, update, delete on table public.event_config, public.race_config, public.registrations to service_role;
grant select, insert, update, delete on all tables in schema marathon_private to service_role;

-- These helpers never accept a caller-supplied user ID. Their only identity
-- source is auth.uid(). The private schema is deliberately not exposed by API.
create or replace function marathon_private.is_member(p_event_id text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from marathon_private.memberships m
    where m.event_id = p_event_id and m.user_id = (select auth.uid()) and m.revoked_at is null
  );
$$;

create or replace function marathon_private.is_organizer(p_event_id text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from marathon_private.organizers o
    where o.event_id = p_event_id and o.user_id = (select auth.uid()) and o.revoked_at is null
  );
$$;

create or replace function public.get_my_membership(p_event_id text default 'suratgarh-2026')
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'is_member', marathon_private.is_member(p_event_id),
    'is_organizer', marathon_private.is_organizer(p_event_id)
  );
$$;

create or replace function marathon_private.redeem_invitation(p_code text, p_event_id text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_attempt marathon_private.invitation_attempts%rowtype;
  v_invitation_id uuid;
  v_code_hash text;
  v_membership_revoked_at timestamptz;
  v_failed integer;
  v_wait integer;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'code', 'authentication_required');
  end if;
  if not exists (
    select 1 from auth.users u where u.id = v_user_id
    and u.email_confirmed_at is not null and u.email is not null
    and not coalesce(u.is_anonymous, false)
  ) then
    return jsonb_build_object('ok', false, 'code', 'verified_email_required');
  end if;

  -- Unknown events and events past deadline cannot receive memberships.
  -- Deliberately permit joining before registration_open becomes true.
  if not exists (
    select 1 from public.event_config e where e.id = p_event_id and v_now <= e.registration_deadline
  ) then
    return jsonb_build_object('ok', false, 'code', 'event_unavailable');
  end if;

  -- Serialize attempts for this account. ON CONFLICT + row lock prevents
  -- simultaneous calls from all seeing the same pre-increment counter.
  insert into marathon_private.invitation_attempts(user_id, window_started_at, updated_at)
  values (v_user_id, v_now, v_now) on conflict (user_id) do nothing;
  select * into v_attempt from marathon_private.invitation_attempts a
  where a.user_id = v_user_id for update;
  v_now := clock_timestamp();

  -- Serialize same-user membership decisions under the attempt row lock too.
  select m.revoked_at into v_membership_revoked_at
  from marathon_private.memberships m where m.event_id = p_event_id and m.user_id = v_user_id;
  if found then
    if v_membership_revoked_at is null then
      return jsonb_build_object('ok', true, 'code', 'already_member');
    end if;
    return jsonb_build_object('ok', false, 'code', 'contact_organizer');
  end if;

  if v_attempt.blocked_until is not null and v_attempt.blocked_until > v_now then
    v_wait := greatest(1, ceil(extract(epoch from (v_attempt.blocked_until - v_now)))::integer);
    return jsonb_build_object('ok', false, 'code', 'rate_limited', 'retry_after_seconds', v_wait);
  end if;
  if v_attempt.window_started_at <= v_now - interval '15 minutes'
     or (v_attempt.blocked_until is not null and v_attempt.blocked_until <= v_now) then
    update marathon_private.invitation_attempts
    set failed_attempts = 0, blocked_until = null, window_started_at = v_now, updated_at = v_now
    where user_id = v_user_id;
    v_attempt.failed_attempts := 0;
  end if;

  -- Codes are 32 random hex characters. Trim/normalize only; no plaintext is
  -- stored. Hashing random, high-entropy codes does not require a password KDF.
  if p_code is not null and char_length(p_code) <= 128
     and lower(btrim(p_code)) ~ '^[0-9a-f]{32}$' then
    v_code_hash := encode(sha256(convert_to(lower(btrim(p_code)), 'UTF8')), 'hex');
    select i.id into v_invitation_id from marathon_private.invitations i
    where i.event_id = p_event_id and i.code_sha256 = v_code_hash
      and i.revoked_at is null and i.expires_at > v_now
    for update;
  end if;

  if v_invitation_id is null then
    v_failed := v_attempt.failed_attempts + 1;
    update marathon_private.invitation_attempts
    set failed_attempts = v_failed,
        blocked_until = case when v_failed >= 5 then v_now + interval '15 minutes' else null end,
        updated_at = v_now
    where user_id = v_user_id;
    -- MUST NOT RAISE or set an HTTP error status here: returning an ordinary
    -- JSON result lets PostgREST commit the counter update on this RPC request.
    if v_failed >= 5 then
      return jsonb_build_object('ok', false, 'code', 'rate_limited', 'retry_after_seconds', 900);
    end if;
    return jsonb_build_object('ok', false, 'code', 'invalid_invitation');
  end if;

  insert into marathon_private.memberships(event_id, user_id, invitation_id, granted_at)
  values (p_event_id, v_user_id, v_invitation_id, v_now);
  update marathon_private.invitation_attempts
  set failed_attempts = 0, blocked_until = null, window_started_at = v_now, updated_at = v_now
  where user_id = v_user_id;
  return jsonb_build_object('ok', true, 'code', 'membership_granted');
end;
$$;

-- A narrow invoker wrapper exposes the private operation without placing a
-- SECURITY DEFINER function in an API-exposed schema.
create or replace function public.redeem_invitation(
  p_code text, p_event_id text default 'suratgarh-2026'
) returns jsonb language sql volatile security invoker set search_path = '' as $$
  select marathon_private.redeem_invitation(p_code, p_event_id);
$$;

-- DB validation is defense in depth behind an authenticated Edge Function.
-- The Edge Function must still validate its caller, JSON schema and image bytes.
create or replace function marathon_private.validate_registration_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_event public.event_config%rowtype;
  v_email text;
  v_receipt_metadata jsonb;
  v_now timestamptz := clock_timestamp();
begin
  if tg_op = 'UPDATE' then
    if (to_jsonb(new) - array['payment_status','reviewed_at','reviewed_by','review_note'])
       is distinct from
       (to_jsonb(old) - array['payment_status','reviewed_at','reviewed_by','review_note']) then
      raise exception 'Submitted registration fields are immutable';
    end if;
    if old.payment_status <> 'pending_review' or new.payment_status not in ('verified', 'rejected') then
      raise exception 'Invalid payment review transition';
    end if;
    if not exists (
      select 1 from marathon_private.organizers o where o.event_id = new.event_id
      and o.user_id = new.reviewed_by and o.revoked_at is null
    ) then
      raise exception 'An active organizer must review the payment';
    end if;
    new.reviewed_at := v_now;
    return new;
  end if;

  select * into v_event from public.event_config e where e.id = new.event_id for share;
  if not found or not v_event.registration_open or not v_event.payment_configured
     or v_now > v_event.registration_deadline then
    raise exception 'Registration is not open';
  end if;
  perform 1 from marathon_private.memberships m where m.event_id = new.event_id
  and m.user_id = new.user_id and m.revoked_at is null for share;
  if not found then
    raise exception 'An active invitation membership is required';
  end if;
  select u.email into v_email from auth.users u where u.id = new.user_id
  and u.email_confirmed_at is not null and not coalesce(u.is_anonymous, false);
  if v_email is null then
    raise exception 'Verified email is required';
  end if;
  new.email := v_email;
  select r.fee_paise into new.fee_paise from public.race_config r
  where r.event_id = new.event_id and r.race = new.race;
  if new.fee_paise is null then
    raise exception 'Invalid race category';
  end if;
  if new.dob > (v_now at time zone 'Asia/Kolkata')::date then
    raise exception 'Date of birth cannot be in the future';
  end if;
  if new.receipt_path !~ (
    '^' || new.user_id::text || '/' || new.submission_id::text || '/receipt\.(jpg|png)$'
  ) then
    raise exception 'Invalid payment receipt path';
  end if;
  select o.metadata into v_receipt_metadata from storage.objects o
  where o.bucket_id = 'payment-receipts' and o.name = new.receipt_path;
  if not found or v_receipt_metadata is null
     or coalesce((v_receipt_metadata->>'size')::bigint, 0) not between 1 and 5242880
     or coalesce(v_receipt_metadata->>'mimetype', '') not in ('image/jpeg','image/png') then
    raise exception 'A valid owned payment receipt is required';
  end if;
  new.full_name := btrim(new.full_name);
  new.city := btrim(new.city);
  new.transaction_id := lower(btrim(new.transaction_id));
  new.payment_status := 'pending_review';
  new.reviewed_at := null;
  new.reviewed_by := null;
  new.review_note := null;
  new.created_at := v_now;
  return new;
end;
$$;

drop trigger if exists marathon_validate_registration_write on public.registrations;
create trigger marathon_validate_registration_write
before insert or update on public.registrations
for each row execute function marathon_private.validate_registration_write();

-- Reset privileges only for this proposal's functions, not unrelated functions.
revoke all on function marathon_private.is_member(text) from public, anon, authenticated;
revoke all on function marathon_private.is_organizer(text) from public, anon, authenticated;
revoke all on function marathon_private.redeem_invitation(text,text) from public, anon, authenticated;
revoke all on function marathon_private.validate_registration_write() from public, anon, authenticated;
revoke all on function public.get_my_membership(text) from public, anon, authenticated;
revoke all on function public.redeem_invitation(text,text) from public, anon, authenticated;
grant execute on function marathon_private.is_member(text), marathon_private.is_organizer(text),
  marathon_private.redeem_invitation(text,text),
  public.get_my_membership(text), public.redeem_invitation(text,text) to authenticated;

drop policy if exists marathon_event_config_read on public.event_config;
create policy marathon_event_config_read on public.event_config for select to anon, authenticated using (true);
drop policy if exists marathon_race_config_read on public.race_config;
create policy marathon_race_config_read on public.race_config for select to anon, authenticated using (true);
drop policy if exists marathon_registration_read on public.registrations;
create policy marathon_registration_read on public.registrations for select to authenticated
using (user_id = (select auth.uid()) or marathon_private.is_organizer(event_id));
-- Intentionally no registration INSERT / UPDATE / DELETE policy for users.

-- Bucket configuration is allowed through SQL; never INSERT/DELETE object rows.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('payment-receipts', 'payment-receipts', false, 5242880,
  array['image/jpeg','image/png'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists marathon_receipt_upload on storage.objects;
-- No browser upload policy. Only the authenticated Edge Function, after its
-- membership check, may write with its backend key. Such objects have NULL
-- owner_id, so use the server-controlled UUID path for owner read permissions.
drop policy if exists marathon_receipt_read on storage.objects;
create policy marathon_receipt_read on storage.objects for select to authenticated using (
  bucket_id = 'payment-receipts' and (
    (storage.foldername(name))[1] = (select auth.uid()::text)
    or (select marathon_private.is_organizer('suratgarh-2026'))
  )
);
-- No INSERT / UPDATE / DELETE user policy. Edge upload uses upsert:false.

commit;
