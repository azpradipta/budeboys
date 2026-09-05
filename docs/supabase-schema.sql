-- Jalankan sekali di Supabase SQL Editor (Dashboard, SQL Editor, New query).
--
-- Strategi penyimpanan: tiap baris menyimpan objek aplikasinya utuh sebagai
-- JSONB di kolom `data`, mengikuti bentuk ConsultationSession dan
-- StoredPrescriptionRecord di lib/types.ts. Beberapa kolom dikeluarkan
-- terpisah untuk indexing, kepemilikan, dan Row Level Security.
--
-- RLS adalah lapisan penegak sesungguhnya: sekalipun kode aplikasi lupa
-- memfilter per user, Postgres tetap menolak membaca atau menulis baris yang
-- bukan milik pemanggil (auth.uid()).
--
-- Enkripsi at rest: bila APP_ENCRYPTION_KEY diisi, kolom `data` tidak berisi
-- JSON terbaca, melainkan envelope AES-256-GCM ({ __enc, iv, tag, ct }) dari
-- lib/server/crypto.ts yang terikat pada user_id barisnya. Route API
-- mengenkripsi saat menulis dan mendekripsi saat membaca, jadi aplikasi tetap
-- melihat bentuk yang sama.

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
