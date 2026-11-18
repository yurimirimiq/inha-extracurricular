-- 팀원 구하기 게시판. Supabase 대시보드 → SQL Editor에 붙여넣고 한 번 실행.
-- 진짜 로그인이 없어서 누구나 읽고 쓸 수 있고, 지우기는 글 쓴 브라우저의 비밀 열쇠가 맞을 때만 됨(js/board.js 설명 참고).

create table posts (
  id bigint generated always as identity primary key,
  program text not null check (char_length(program) between 1 and 100),
  title text not null check (char_length(title) between 1 and 60),
  body text not null check (char_length(body) between 1 and 1000),
  contact text not null check (char_length(contact) between 1 and 100),
  author text not null check (char_length(author) <= 10),
  owner_tag text not null check (owner_tag ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);

create table comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references posts (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 300),
  author text not null check (char_length(author) <= 10),
  owner_tag text not null check (owner_tag ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);
create index on comments (post_id);

-- 읽기와 새로 쓰기만 허용. 고치기·지우기는 직접 못 하고 아래 함수로만.
alter table posts enable row level security;
alter table comments enable row level security;
revoke all on posts, comments from anon;
grant select on posts, comments to anon;
grant insert (program, title, body, contact, author, owner_tag) on posts to anon;
grant insert (post_id, body, author, owner_tag) on comments to anon;
create policy "누구나 읽기" on posts for select to anon using (true);
create policy "누구나 쓰기" on posts for insert to anon with check (true);
create policy "누구나 읽기" on comments for select to anon using (true);
create policy "누구나 쓰기" on comments for insert to anon with check (true);

-- 지우기: 보낸 열쇠의 해시가 글에 적힌 owner_tag와 같을 때만. 지웠으면 true.
create function delete_post(p_id bigint, p_key text) returns boolean
language sql security definer set search_path = public as $$
  with gone as (
    delete from posts where id = p_id and owner_tag = encode(sha256(convert_to(p_key, 'UTF8')), 'hex') returning 1
  ) select exists (select 1 from gone);
$$;

create function delete_comment(p_id bigint, p_key text) returns boolean
language sql security definer set search_path = public as $$
  with gone as (
    delete from comments where id = p_id and owner_tag = encode(sha256(convert_to(p_key, 'UTF8')), 'hex') returning 1
  ) select exists (select 1 from gone);
$$;

revoke all on function delete_post(bigint, text), delete_comment(bigint, text) from public;
grant execute on function delete_post(bigint, text), delete_comment(bigint, text) to anon;
