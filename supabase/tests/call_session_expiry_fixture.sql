create schema if not exists private;
create table public.call_sessions(
 id uuid primary key,
 status text not null,
 expires_at timestamptz not null
);
