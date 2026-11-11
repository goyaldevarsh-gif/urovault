create table if not exists public.records (
  user_id uuid not null default auth.uid(),
  k text not null,
  d text,
  mt bigint not null,
  del boolean not null default false,
  dev text,
  srv timestamptz not null default now(),
  primary key (user_id, k)
);
create index if not exists records_srv on public.records (user_id, srv);
create or replace function public.touch_srv() returns trigger language plpgsql as $$ begin new.srv := clock_timestamp(); return new; end $$;
drop trigger if exists records_touch on public.records;
create trigger records_touch before insert or update on public.records for each row execute function public.touch_srv();
alter table public.records enable row level security;
drop policy if exists own_records on public.records;
create policy own_records on public.records for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
insert into storage.buckets (id, name, public) values ('media', 'media', false) on conflict (id) do nothing;
drop policy if exists own_media on storage.objects;
create policy own_media on storage.objects for all to authenticated using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
