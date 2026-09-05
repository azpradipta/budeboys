-- Skema awal Healthalk, dijalankan sekali lewat Supabase SQL Editor.
-- Kolom `data` menyimpan objek aplikasi utuh sebagai JSONB, kolom lain untuk
-- indexing dan kepemilikan. RLS yang menjaga tiap user hanya melihat barisnya.
-- Bila APP_ENCRYPTION_KEY diisi, `data` berisi envelope AES-256-GCM, bukan JSON.

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
