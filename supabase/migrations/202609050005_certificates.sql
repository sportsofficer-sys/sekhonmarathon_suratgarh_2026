-- Backend-only certificate issuance, and minimal token-based public verification.
begin;
grant usage on schema marathon_private to service_role;
alter table marathon_private.certificate_settings add column if not exists font_object_path text;
alter table marathon_private.certificate_settings add column if not exists fallback_font_object_path text;
alter table marathon_private.certificate_settings add column if not exists approval_revision integer not null default 1;
alter table marathon_private.certificates add column if not exists approval_revision integer not null default 1;
alter table marathon_private.certificates drop constraint if exists certificates_registration_id_result_revision_kind_key;
create unique index if not exists certificate_result_approval_unique on marathon_private.certificates(registration_id,result_revision,kind,approval_revision);
create or replace function marathon_private.version_certificate_approval()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if (to_jsonb(new)-'approval_revision') is distinct from (to_jsonb(old)-'approval_revision') then new.approval_revision:=old.approval_revision+1;
  else new.approval_revision:=old.approval_revision; end if;
  return new;
end; $$;
drop trigger if exists marathon_certificate_approval_revision on marathon_private.certificate_settings;
create trigger marathon_certificate_approval_revision before update on marathon_private.certificate_settings for each row execute function marathon_private.version_certificate_approval();
revoke all on function marathon_private.version_certificate_approval() from public,anon,authenticated,service_role;
alter table marathon_private.certificate_settings drop constraint if exists certificate_font_ready;
alter table marathon_private.certificate_settings add constraint certificate_font_ready check(not enabled or nullif(btrim(font_object_path),'') is not null);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('certificate-fonts','certificate-fonts',false,10485760,array['font/ttf','font/otf','application/octet-stream'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create or replace function marathon_private.prepare_certificate_backend(p_actor uuid,p_registration uuid,p_kind text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.registrations%rowtype; rr marathon_private.race_results%rowtype;
  s marathon_private.certificate_settings%rowtype; c marathon_private.certificates%rowtype;
  n text; snap jsonb; event_date text;
begin
  if p_actor is null or not exists(select 1 from auth.users where id=p_actor and email_confirmed_at is not null and not coalesce(is_anonymous,false)) then
    raise exception 'Verified email is required' using errcode='42501';
  end if;
  if p_kind not in ('completion','participation') then raise exception 'Invalid certificate type'; end if;
  select * into r from public.registrations where id=p_registration for update;
  if not found or r.payment_status<>'verified' or (r.user_id<>p_actor and not exists(
    select 1 from marathon_private.organizers o where o.event_id=r.event_id and o.user_id=p_actor and o.revoked_at is null)) then
    raise exception 'Confirmed registration access is required' using errcode='42501';
  end if;
  select * into rr from marathon_private.race_results where registration_id=r.id for update;
  if not found or rr.status='correction_required' or rr.certificate_hold then raise exception 'Certificate is awaiting a valid result or organiser release'; end if;
  select * into s from marathon_private.certificate_settings where event_id=r.event_id;
  if not found or not s.enabled then raise exception 'Approved certificate signing has not been configured'; end if;
  select registration_number into n from marathon_private.registration_numbers where registration_id=r.id;
  select to_char(event_starts_at at time zone 'Asia/Kolkata','DD Mon YYYY') into event_date from public.event_config where id=r.event_id;
  snap:=jsonb_build_object('participant_name',r.full_name,'registration_number',n,'race',r.race,
    'event_date',event_date,'elapsed_seconds',rr.elapsed_seconds,'timing_provenance',rr.provenance,
    'signer_name',s.signer_name,'signer_designation',s.signer_designation,'approval_reference',s.approval_reference,
    'approval_revision',s.approval_revision,'signature_object_path',s.signature_object_path,'font_object_path',s.font_object_path,
    'fallback_font_object_path',s.fallback_font_object_path,'verification_base_url',s.verification_base_url,
    'event_title','Sekhon Indian Air Force Marathon 2026','organiser','Desert Braves · Air Force Station Suratgarh');
  insert into marathon_private.certificates(registration_id,result_revision,kind,snapshot,approval_revision)
  values(r.id,rr.revision,p_kind,snap,s.approval_revision) on conflict(registration_id,result_revision,kind,approval_revision) do nothing;
  select * into c from marathon_private.certificates where registration_id=r.id and result_revision=rr.revision and kind=p_kind and approval_revision=s.approval_revision for update;
  if c.status='revoked' then raise exception 'This certificate was revoked; an organiser must review and reissue the result'; end if;
  -- All returned signature paths/configuration are restricted to service_role.
  return jsonb_build_object('certificate',to_jsonb(c),'signature_object_path',c.snapshot->>'signature_object_path',
    'font_object_path',c.snapshot->>'font_object_path','fallback_font_object_path',c.snapshot->>'fallback_font_object_path',
    'verification_url',(c.snapshot->>'verification_base_url') || case when position('?' in (c.snapshot->>'verification_base_url'))>0 then '&' else '?' end || 'certificate=' || c.verification_token::text);
end; $$;

create or replace function public.prepare_certificate_backend(p_actor uuid,p_registration uuid,p_kind text)
returns jsonb language sql volatile security invoker set search_path='' as $$ select marathon_private.prepare_certificate_backend(p_actor,p_registration,p_kind); $$;

create or replace function marathon_private.complete_certificate_backend(p_certificate uuid,p_sha256 text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c marathon_private.certificates%rowtype; rr marathon_private.race_results%rowtype; r public.registrations%rowtype; path text;
begin
  -- Match result mutation lock order: registration, result, then certificate.
  select * into c from marathon_private.certificates where id=p_certificate;
  if not found then raise exception 'Certificate not found'; end if;
  select * into r from public.registrations where id=c.registration_id for update;
  select * into rr from marathon_private.race_results where registration_id=c.registration_id for update;
  select * into c from marathon_private.certificates where id=p_certificate for update;
  if c.status='revoked' or r.payment_status<>'verified' or rr.revision<>c.result_revision or rr.certificate_hold or rr.status='correction_required'
    or not exists(select 1 from marathon_private.certificate_settings where event_id=r.event_id and enabled and approval_revision=c.approval_revision) then raise exception 'The result or certificate approval changed; do not publish this PDF'; end if;
  if p_sha256 !~ '^[a-f0-9]{64}$' then raise exception 'A valid PDF digest is required'; end if;
  path:=c.registration_id::text || '/' || c.id::text || '.pdf';
  if not exists(select 1 from storage.objects where bucket_id='event-certificates' and name=path and metadata->>'mimetype'='application/pdf') then raise exception 'The private certificate PDF is missing'; end if;
  if c.status='ready' then
    if c.sha256<>p_sha256 then raise exception 'Issued certificate content cannot be replaced'; end if;
    return to_jsonb(c);
  end if;
  update marathon_private.certificates set status='ready',object_path=path,sha256=p_sha256,generated_at=clock_timestamp() where id=c.id returning * into c;
  insert into marathon_private.event_audit(event_id,action,registration_id,details) values(r.event_id,'certificate_generated',r.id,jsonb_build_object('certificate_id',c.id,'result_revision',c.result_revision,'sha256',p_sha256));
  return to_jsonb(c);
end; $$;

create or replace function public.complete_certificate_backend(p_certificate uuid,p_sha256 text)
returns jsonb language sql volatile security invoker set search_path='' as $$ select marathon_private.complete_certificate_backend(p_certificate,p_sha256); $$;

create or replace function marathon_private.verify_certificate(p_token uuid)
returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce((select jsonb_build_object(
    'status',case when c.status='ready' and rr.revision=c.result_revision and not rr.certificate_hold and rr.status<>'correction_required' then 'valid' when c.status='revoked' then 'revoked' else 'not_ready' end,
    'certificate_number',c.certificate_number,'kind',c.kind,'participant_name',c.snapshot->>'participant_name',
    'race',c.snapshot->>'race','event_date',c.snapshot->>'event_date','elapsed_seconds',c.snapshot->'elapsed_seconds',
    'timing_provenance',c.snapshot->>'timing_provenance','signature_type','approved visual facsimile',
    'generated_at',c.generated_at)
    from marathon_private.certificates c join marathon_private.race_results rr on rr.registration_id=c.registration_id
    where c.verification_token=p_token),'{}'::jsonb) || case when not exists(select 1 from marathon_private.certificates where verification_token=p_token) then '{"status":"not_found"}'::jsonb else '{}'::jsonb end;
$$;
create or replace function public.verify_certificate(p_token uuid)
returns jsonb language sql stable security invoker set search_path='' as $$ select marathon_private.verify_certificate(p_token); $$;

revoke all on function marathon_private.prepare_certificate_backend(uuid,uuid,text),public.prepare_certificate_backend(uuid,uuid,text),
  marathon_private.complete_certificate_backend(uuid,text),public.complete_certificate_backend(uuid,text),
  marathon_private.verify_certificate(uuid),public.verify_certificate(uuid) from public,anon,authenticated,service_role;
grant execute on function marathon_private.prepare_certificate_backend(uuid,uuid,text),public.prepare_certificate_backend(uuid,uuid,text),
  marathon_private.complete_certificate_backend(uuid,text),public.complete_certificate_backend(uuid,text) to service_role;
grant usage on schema marathon_private to anon;
grant execute on function marathon_private.verify_certificate(uuid),public.verify_certificate(uuid) to anon,authenticated;
commit;
