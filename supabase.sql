-- Supabase 대시보드 → SQL Editor에 붙여넣고 한 번 실행.
-- 계정마다 마일리지 기록 한 줄. 본인 것만 읽고 쓸 수 있음.
create table if not exists records (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table records enable row level security;

create policy "본인 기록만" on records
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
