-- 见账账号同步数据表；在你自己的 Supabase SQL Editor 中执行。
-- 不要放入任何真实财务数据或密钥。
create table if not exists public.jianzhang_ledgers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);

alter table public.jianzhang_ledgers enable row level security;

revoke all on public.jianzhang_ledgers from anon;
grant select, insert, update on public.jianzhang_ledgers to authenticated;

drop policy if exists "owner_select" on public.jianzhang_ledgers;
drop policy if exists "owner_insert" on public.jianzhang_ledgers;
drop policy if exists "owner_update" on public.jianzhang_ledgers;

create policy "owner_select" on public.jianzhang_ledgers
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "owner_insert" on public.jianzhang_ledgers
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "owner_update" on public.jianzhang_ledgers
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- updated_at 由数据库维护；revision 的版本校验在客户端 PATCH 过滤条件中进行。
create or replace function public.jianzhang_set_updated_at()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists jianzhang_update_time on public.jianzhang_ledgers;
create trigger jianzhang_update_time before update on public.jianzhang_ledgers
  for each row execute function public.jianzhang_set_updated_at();
