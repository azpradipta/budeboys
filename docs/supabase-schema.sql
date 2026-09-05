-- Run this once in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
--
-- Storage strategy: each row keeps its full app-level object as JSONB in
-- `data` (matching lib/types.ts's ConsultationSession / StoredPrescriptionRecord
-- shapes exactly), with a few columns pulled out for indexing, ownership,
-- and Row Level Security. This means the API routes barely change shape —
-- they read/write the same JSON they always did, just via Postgres now.
--
-- RLS is the real enforcement layer: even if application code had a bug and
-- forgot to filter by user, Postgres itself refuses to return or write rows
-- that don't belong to the requesting user (auth.uid()).

create table if not exists public.consultations (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prescriptions (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  consultation_id text not null references public.consultations (id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists consultations_user_id_idx on public.consultations (user_id);
create index if not exists prescriptions_user_id_idx on public.prescriptions (user_id);
create index if not exists prescriptions_consultation_id_idx on public.prescriptions (consultation_id);

alter table public.consultations enable row level security;
alter table public.prescriptions enable row level security;

drop policy if exists "Users manage their own consultations" on public.consultations;
create policy "Users manage their own consultations"
  on public.consultations
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage their own prescriptions" on public.prescriptions;
create policy "Users manage their own prescriptions"
  on public.prescriptions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
