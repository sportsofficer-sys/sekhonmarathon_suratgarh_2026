-- Event-day extension. Apply after 001–003 as database owner.
-- Setup remains closed. No signature, real clock, result or certificate is seeded.
begin;

update public.event_config set registration_open=false, payment_configured=false where id='suratgarh-2026';
update public.race_config set fee_paise=case race when '5' then 60000 when '10' then 70000 when '21' then 80000 end where event_id='suratgarh-2026';

create sequence if not exists marathon_private.registration_number_seq;
create sequence if not exists marathon_private.certificate_number_seq;
create table if not exists marathon_private.registration_numbers (
  registration_id uuid primary key references public.registrations(id),
  registration_number text not null unique default ('SEKO26-' || lpad(nextval('marathon_private.registration_number_seq')::text,5,'0')),
  assigned_at timestamptz not null default clock_timestamp()
);
create or replace function marathon_private.assign_registration_number()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.payment_status='verified' then
    insert into marathon_private.registration_numbers(registration_id) values(new.id) on conflict do nothing;
  end if;
  return new;
end; $$;
drop trigger if exists marathon_assign_registration_number on public.registrations;
create trigger marathon_assign_registration_number after insert or update of payment_status on public.registrations
for each row execute function marathon_private.assign_registration_number();
insert into marathon_private.registration_numbers(registration_id)
select id from public.registrations where payment_status='verified' on conflict do nothing;

create table if not exists marathon_private.event_day_settings (
  event_id text primary key references public.event_config(id),
  timing_enabled boolean not null default false,
  self_submission_open boolean not null default false,
  -- Technical sanity floors, not race eligibility or competition rules.
  minimum_seconds jsonb not null default '{"5":300,"10":600,"21":1200}'::jsonb,
  maximum_seconds integer not null default 86400 check(maximum_seconds between 3600 and 172800)
);
insert into marathon_private.event_day_settings(event_id) values('suratgarh-2026') on conflict do nothing;

create table if not exists marathon_private.race_clocks (
  event_id text not null, race text not null,
  started_at timestamptz not null, started_by uuid not null references auth.users(id),
  start_request_id uuid not null unique,
  primary key(event_id,race), foreign key(event_id,race) references public.race_config(event_id,race)
);
create table if not exists marathon_private.finish_marks (
  id uuid primary key, event_id text not null, race text not null,
  captured_at timestamptz not null, elapsed_ms bigint not null check(elapsed_ms>=0),
  captured_by uuid not null references auth.users(id),
  device_captured_at timestamptz,
  registration_id uuid unique references public.registrations(id), associated_at timestamptz,
  associated_by uuid references auth.users(id),
  foreign key(event_id,race) references marathon_private.race_clocks(event_id,race)
);
create table if not exists marathon_private.race_results (
  registration_id uuid primary key references public.registrations(id),
  elapsed_seconds integer not null check(elapsed_seconds between 1 and 172800),
  provenance text not null check(provenance in ('participant_submitted','organiser_recorded','organiser_verified','organiser_corrected')),
  status text not null check(status in ('participant_submitted','organiser_recorded','verified','correction_required','locked')),
  finish_mark_id uuid unique references marathon_private.finish_marks(id),
  recorded_by uuid not null references auth.users(id), verified_by uuid references auth.users(id),
  note text not null default '' check(char_length(note)<=1000),
  certificate_hold boolean not null default false,
  revision integer not null default 1,
  updated_at timestamptz not null default clock_timestamp()
);
create table if not exists marathon_private.event_audit (
  id bigint generated always as identity primary key,
  event_id text not null references public.event_config(id), actor_id uuid references auth.users(id),
  action text not null, registration_id uuid references public.registrations(id),
  details jsonb not null default '{}', created_at timestamptz not null default clock_timestamp()
);
create table if not exists marathon_private.certificate_settings (
  event_id text primary key references public.event_config(id), enabled boolean not null default false,
  signer_name text, signer_designation text, signature_object_path text,
  approval_reference text, approved_at timestamptz,
  verification_base_url text,
  check(not enabled or (nullif(btrim(signer_name),'') is not null and nullif(btrim(signer_designation),'') is not null
    and nullif(btrim(signature_object_path),'') is not null and nullif(btrim(approval_reference),'') is not null
    and approved_at is not null and verification_base_url is not null and verification_base_url ~ '^https://[^/?#[:space:]]+'))
);
insert into marathon_private.certificate_settings(event_id) values('suratgarh-2026') on conflict do nothing;
create table if not exists marathon_private.certificates (
  id uuid primary key default gen_random_uuid(),
  certificate_number text not null unique default ('SEKO-2026-' || lpad(nextval('marathon_private.certificate_number_seq')::text,6,'0')),
  verification_token uuid not null unique default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id), result_revision integer not null,
  kind text not null check(kind in ('participation','completion')),
  status text not null default 'pending' check(status in ('pending','ready','revoked')),
  snapshot jsonb not null, object_path text, sha256 text check(sha256 ~ '^[a-f0-9]{64}$'),
  generated_at timestamptz, revoked_at timestamptz,
  unique(registration_id,result_revision,kind)
);

-- Certificates are immutable snapshots: every result mutation invalidates old PDFs/verification.
create or replace function marathon_private.revoke_stale_certificates()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  update marathon_private.certificates set status='revoked',revoked_at=clock_timestamp()
  where registration_id=new.registration_id and status<>'revoked';
  return new;
end; $$;
drop trigger if exists marathon_result_certificate_invalidation on marathon_private.race_results;
create trigger marathon_result_certificate_invalidation after update on marathon_private.race_results
for each row execute function marathon_private.revoke_stale_certificates();

do $$ declare t text; begin
  foreach t in array array['registration_numbers','event_day_settings','race_clocks','finish_marks','race_results','event_audit','certificate_settings','certificates'] loop
    execute format('alter table marathon_private.%I enable row level security',t);
    execute format('revoke all on marathon_private.%I from public,anon,authenticated',t);
    execute format('grant select,insert,update,delete on marathon_private.%I to service_role',t);
  end loop;
end; $$;
revoke all on sequence marathon_private.registration_number_seq,marathon_private.certificate_number_seq from public,anon,authenticated;

create or replace function marathon_private.event_day(p_action text,p_payload jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  actor uuid:=auth.uid(); ev text:='suratgarh-2026'; org boolean;
  setting marathon_private.event_day_settings%rowtype;
  reg public.registrations%rowtype; result marathon_private.race_results%rowtype;
  mark marathon_private.finish_marks%rowtype; race_clock marathon_private.race_clocks%rowtype;
  race_id text; request_id uuid; reg_id uuid; seconds integer; target_status text; reason text;
  new_source text; v_now timestamptz:=clock_timestamp(); previous jsonb;
begin
  if actor is null or not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null and not coalesce(is_anonymous,false)) then
    raise exception 'Verified email sign-in is required' using errcode='42501';
  end if;
  org:=marathon_private.is_organizer(ev);
  select * into setting from marathon_private.event_day_settings where event_id=ev;
  if not found then raise exception 'Event-day setup is not available'; end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>8192 then raise exception 'Invalid request'; end if;

  if p_action='snapshot' then
    return jsonb_build_object('server_now',v_now,'is_organiser',org,
      'timing_enabled',setting.timing_enabled,'self_submission_open',setting.self_submission_open,
      'certificates_configured',exists(select 1 from marathon_private.certificate_settings where event_id=ev and enabled),
      'clocks',coalesce((select jsonb_agg(jsonb_build_object('race',c.race,'started_at',c.started_at)) from marathon_private.race_clocks c where c.event_id=ev),'[]'::jsonb),
      'registrations',coalesce((select jsonb_agg(jsonb_build_object(
        'id',r.id,'registration_number',n.registration_number,'full_name',r.full_name,'race',r.race,'gender',r.gender,
        'payment_status',r.payment_status,'fee_paise',r.fee_paise,'tshirt',r.tshirt,
        'transaction_id',case when org then r.transaction_id else null end,
        'receipt_path',case when org then r.receipt_path else null end,
        'result',case when rr.registration_id is null then null else jsonb_build_object('elapsed_seconds',rr.elapsed_seconds,'provenance',rr.provenance,'status',rr.status,'note',rr.note,'certificate_hold',rr.certificate_hold,'revision',rr.revision,
          'prize_eligible',rr.provenance<>'participant_submitted' and rr.status in ('verified','locked')) end,
        'certificates',coalesce((select jsonb_agg(jsonb_build_object('id',ct.id,'certificate_number',ct.certificate_number,'kind',ct.kind,'status',ct.status)) from marathon_private.certificates ct where ct.registration_id=r.id and ct.result_revision=rr.revision),'[]'::jsonb)
      ) order by r.created_at desc) from public.registrations r
       left join marathon_private.registration_numbers n on n.registration_id=r.id
       left join marathon_private.race_results rr on rr.registration_id=r.id
       where r.event_id=ev and (org or r.user_id=actor)),'[]'::jsonb),
      'unassigned_finishes',case when org then coalesce((select jsonb_agg(jsonb_build_object('id',f.id,'race',f.race,'captured_at',f.captured_at,'elapsed_ms',f.elapsed_ms,'captured_by',f.captured_by) order by f.captured_at)
        from marathon_private.finish_marks f where f.event_id=ev and f.registration_id is null),'[]'::jsonb) else '[]'::jsonb end);
  end if;

  if p_action in ('start_clock','capture_finish','associate_finish','review_result','review_payment') and not org then
    raise exception 'An active organiser role is required' using errcode='42501';
  end if;

  if p_action='start_clock' then
    if not setting.timing_enabled then raise exception 'Timing has not been enabled by the event administrator'; end if;
    race_id:=p_payload->>'race'; request_id:=(p_payload->>'request_id')::uuid;
    if race_id not in ('5','10','21') or request_id is null then raise exception 'Choose a category and request ID'; end if;
    insert into marathon_private.race_clocks(event_id,race,started_at,started_by,start_request_id)
    values(ev,race_id,v_now,actor,request_id) on conflict(event_id,race) do nothing;
    select * into race_clock from marathon_private.race_clocks where event_id=ev and race=race_id for update;
    if race_clock.start_request_id<>request_id then raise exception 'This category clock has already started and cannot be reset'; end if;
    if race_clock.started_by<>actor then raise exception 'This request belongs to another official' using errcode='42501'; end if;
    return jsonb_build_object('race',race_clock.race,'started_at',race_clock.started_at,'server_now',clock_timestamp());
  end if;

  if p_action='capture_finish' then
    race_id:=p_payload->>'race'; request_id:=(p_payload->>'request_id')::uuid;
    if request_id is null or race_id not in ('5','10','21') then raise exception 'Choose a category and request ID'; end if;
    select * into mark from marathon_private.finish_marks where id=request_id;
    if found then
      if mark.captured_by<>actor or mark.race<>race_id then raise exception 'Finish request cannot be reused'; end if;
      return to_jsonb(mark);
    end if;
    if not setting.timing_enabled then raise exception 'Timing is not enabled'; end if;
    select * into race_clock from marathon_private.race_clocks where event_id=ev and race=race_id;
    if not found then raise exception 'Start this category clock first'; end if;
    v_now:=clock_timestamp();
    if v_now<race_clock.started_at or v_now-race_clock.started_at>make_interval(secs=>setting.maximum_seconds) then raise exception 'Clock is outside the event timing window'; end if;
    insert into marathon_private.finish_marks(id,event_id,race,captured_at,elapsed_ms,captured_by,device_captured_at)
    values(request_id,ev,race_id,v_now,floor(extract(epoch from(v_now-race_clock.started_at))*1000)::bigint,actor,(p_payload->>'device_captured_at')::timestamptz)
    on conflict(id) do nothing;
    select * into mark from marathon_private.finish_marks where id=request_id;
    if mark.captured_by<>actor or mark.race<>race_id then raise exception 'Finish request cannot be reused'; end if;
    return to_jsonb(mark);
  end if;

  if p_action='associate_finish' then
    select * into mark from marathon_private.finish_marks where id=(p_payload->>'finish_id')::uuid and event_id=ev for update;
    if not found then raise exception 'Finish mark not found'; end if;
    reg_id:=(p_payload->>'registration_id')::uuid;
    if mark.registration_id is not null then
      if mark.registration_id<>reg_id then raise exception 'This finish is already assigned'; end if;
      select * into result from marathon_private.race_results where registration_id=reg_id;
      return to_jsonb(result);
    end if;
    select * into reg from public.registrations where id=reg_id and event_id=ev for update;
    if not found or reg.payment_status<>'verified' or reg.race<>mark.race then raise exception 'Choose a confirmed participant from the same category'; end if;
    select * into result from marathon_private.race_results where registration_id=reg.id for update;
    if found and (result.provenance<>'participant_submitted' or result.status='locked') then raise exception 'An official or locked result already exists; use authorised review'; end if;
    previous:=to_jsonb(result); seconds:=greatest(1,floor(mark.elapsed_ms/1000.0)::integer);
    insert into marathon_private.race_results(registration_id,elapsed_seconds,provenance,status,finish_mark_id,recorded_by)
    values(reg.id,seconds,'organiser_recorded','organiser_recorded',mark.id,actor)
    on conflict(registration_id) do update set elapsed_seconds=excluded.elapsed_seconds,provenance=excluded.provenance,status=excluded.status,
      finish_mark_id=excluded.finish_mark_id,recorded_by=actor,verified_by=null,note='',
      revision=marathon_private.race_results.revision+1,updated_at=clock_timestamp();
    update marathon_private.finish_marks set registration_id=reg.id,associated_at=clock_timestamp(),associated_by=actor where id=mark.id;
    insert into marathon_private.event_audit(event_id,actor_id,action,registration_id,details) values(ev,actor,p_action,reg.id,jsonb_build_object('before',previous,'finish_id',mark.id));
    select * into result from marathon_private.race_results where registration_id=reg.id;
    return to_jsonb(result);
  end if;

  if p_action='self_time' then
    reg_id:=(p_payload->>'registration_id')::uuid; seconds:=(p_payload->>'elapsed_seconds')::integer;
    select * into reg from public.registrations where id=reg_id and event_id=ev and user_id=actor for update;
    if not found or reg.payment_status<>'verified' then raise exception 'A confirmed registration owned by this email is required' using errcode='42501'; end if;
    select * into result from marathon_private.race_results where registration_id=reg.id for update;
    if found then
      if result.provenance<>'participant_submitted' or result.status='locked' then raise exception 'This result is official or locked; contact an organiser'; end if;
      if result.status='participant_submitted' and result.elapsed_seconds=seconds then return to_jsonb(result); end if;
      if result.status<>'correction_required' then raise exception 'A time was already submitted; ask an organiser to request a correction'; end if;
    end if;
    if not setting.self_submission_open then raise exception 'Finish-time submission is not open'; end if;
    select * into race_clock from marathon_private.race_clocks where event_id=ev and race=reg.race;
    if not found then raise exception 'Your category clock has not started'; end if;
    if seconds is null or seconds<coalesce((setting.minimum_seconds->>reg.race)::integer,1) or seconds>setting.maximum_seconds
       or seconds>extract(epoch from(clock_timestamp()-race_clock.started_at))+60 then
      raise exception 'Check HH:MM:SS against the finish clock; this time is outside the accepted range';
    end if;
    previous:=to_jsonb(result);
    insert into marathon_private.race_results(registration_id,elapsed_seconds,provenance,status,recorded_by)
    values(reg.id,seconds,'participant_submitted','participant_submitted',actor)
    on conflict(registration_id) do update set elapsed_seconds=excluded.elapsed_seconds,status=excluded.status,note='',recorded_by=actor,
      revision=marathon_private.race_results.revision+1,updated_at=clock_timestamp();
    insert into marathon_private.event_audit(event_id,actor_id,action,registration_id,details) values(ev,actor,p_action,reg.id,jsonb_build_object('before',previous,'elapsed_seconds',seconds));
    select * into result from marathon_private.race_results where registration_id=reg.id;
    return to_jsonb(result);
  end if;

  if p_action='review_payment' then
    reg_id:=(p_payload->>'registration_id')::uuid; target_status:=p_payload->>'status'; reason:=left(btrim(coalesce(p_payload->>'note','')),1000);
    if target_status not in ('verified','rejected') then raise exception 'Choose verified or rejected'; end if;
    if target_status='rejected' and length(reason)<5 then raise exception 'Explain why the payment needs correction'; end if;
    select * into reg from public.registrations where id=reg_id and event_id=ev for update;
    if not found then raise exception 'Registration not found'; end if;
    if reg.payment_status=target_status then return jsonb_build_object('payment_status',reg.payment_status); end if;
    if reg.payment_status<>'pending_review' then raise exception 'This payment was already reviewed. An administrator must handle corrections'; end if;
    update public.registrations set payment_status=target_status,reviewed_by=actor,review_note=reason where id=reg.id;
    insert into marathon_private.event_audit(event_id,actor_id,action,registration_id,details) values(ev,actor,p_action,reg.id,jsonb_build_object('status',target_status,'note',reason));
    return jsonb_build_object('payment_status',target_status);
  end if;

  if p_action='review_result' then
    reg_id:=(p_payload->>'registration_id')::uuid; target_status:=p_payload->>'status'; reason:=left(btrim(coalesce(p_payload->>'note','')),1000);
    if target_status not in ('verified','correction_required','locked') or length(reason)<5 then raise exception 'Choose a result decision and record its evidence/reason'; end if;
    select * into reg from public.registrations where id=reg_id and event_id=ev for update;
    if not found or reg.payment_status<>'verified' then raise exception 'Confirmed registration not found'; end if;
    select * into result from marathon_private.race_results where registration_id=reg.id for update;
    if not found then raise exception 'No result has been submitted'; end if;
    if result.status='locked' then raise exception 'Locked results cannot be changed through the portal'; end if;
    if (p_payload->>'expected_revision')::integer is distinct from result.revision then raise exception 'This result changed since you opened it. Refresh and review the latest result'; end if;
    seconds:=coalesce((p_payload->>'elapsed_seconds')::integer,result.elapsed_seconds);
    if seconds<1 or seconds>setting.maximum_seconds then raise exception 'Invalid elapsed time'; end if;
    previous:=to_jsonb(result); new_source:=result.provenance;
    if seconds<>result.elapsed_seconds then new_source:='organiser_corrected';
    elsif result.provenance='participant_submitted' and target_status in ('verified','locked') then new_source:='organiser_verified'; end if;
    update marathon_private.race_results set elapsed_seconds=seconds,provenance=new_source,status=target_status,note=reason,
      verified_by=case when target_status in ('verified','locked') then actor else null end,
      certificate_hold=coalesce((p_payload->>'certificate_hold')::boolean,result.certificate_hold),revision=revision+1,updated_at=clock_timestamp()
    where registration_id=reg.id;
    insert into marathon_private.event_audit(event_id,actor_id,action,registration_id,details) values(ev,actor,p_action,reg.id,jsonb_build_object('before',previous,'status',target_status,'note',reason));
    select * into result from marathon_private.race_results where registration_id=reg.id;
    return to_jsonb(result);
  end if;
  raise exception 'Unknown event-day action';
end; $$;

create or replace function public.event_day(p_action text,p_payload jsonb default '{}')
returns jsonb language sql volatile security invoker set search_path='' as $$ select marathon_private.event_day(p_action,p_payload); $$;
revoke all on function marathon_private.assign_registration_number(),marathon_private.revoke_stale_certificates(),marathon_private.event_day(text,jsonb),public.event_day(text,jsonb) from public,anon,authenticated;
grant execute on function marathon_private.event_day(text,jsonb),public.event_day(text,jsonb) to authenticated;

-- Signature and PDF files are backend-only. No public/read upload policy is granted.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('certificate-signatures','certificate-signatures',false,2097152,array['image/png']),
       ('event-certificates','event-certificates',false,10485760,array['application/pdf'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
commit;
