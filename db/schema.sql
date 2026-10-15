-- CEVE-IN — skema database (idempotent, aman dijalankan berulang).

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,                 -- selalu huruf kecil
  name text not null default '',
  role text not null default 'klien' check (role in ('admin','klien')),
  password_hash text not null,
  failed_logins int not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  id text primary key,                        -- sha256 dari token di cookie
  user_id uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null
);
create index if not exists sessions_user on sessions(user_id);

create table if not exists settings (
  id int primary key default 1 check (id = 1),
  nama_jasa text not null default 'CEVE-IN',
  kontak text not null default '',            -- WhatsApp/email yang tampil di portal klien
  daftar_terbuka boolean not null default false,   -- klien boleh daftar sendiri
  kuota_mandiri int not null default 1,       -- jumlah CV untuk klien yang daftar sendiri
  template_default text not null default 'klasik'
);
insert into settings (id) values (1) on conflict do nothing;

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references users(id) on delete set null,   -- kosong = dikelola admin
  nama text not null,
  hp text not null default '',
  email text not null default '',
  catatan text not null default '',           -- catatan internal, tidak tampil ke klien
  setuju_at timestamptz,                      -- waktu klien menyetujui datanya disimpan
  ingatkan_at date,                           -- tanggal follow-up (tanya pengalaman baru)
  status text not null default 'aktif' check (status in ('aktif','arsip')),
  kuota_cv int,                               -- null = tanpa batas
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  client_id uuid primary key references clients(id) on delete cascade,
  nama_lengkap text not null default '',
  tempat_lahir text not null default '',
  tgl_lahir date,
  alamat text not null default '',
  kota text not null default '',
  hp text not null default '',
  email text not null default '',
  linkedin text not null default '',
  foto_data bytea,                            -- foto 3x4 JPEG, sudah dikecilkan di browser, disimpan di database
  foto_tipe text,                             -- mis. image/jpeg
  ringkasan text not null default '',
  status_nikah text not null default '',
  agama text not null default '',
  tinggi int,
  berat int,
  updated_at timestamptz not null default now()
);

-- foto dulu disimpan sebagai berkas; sekarang di database supaya ikut tercadangkan dan jalan di server mana pun
alter table profiles add column if not exists foto_data bytea;
alter table profiles add column if not exists foto_tipe text;
alter table profiles drop column if exists foto;

create table if not exists entries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  tipe text not null check (tipe in ('kerja','pendidikan','skill','sertifikat','organisasi','proyek','bahasa','penghargaan')),
  judul text not null default '',             -- jabatan / gelar / nama skill / nama sertifikat
  instansi text not null default '',
  lokasi text not null default '',
  mulai date,
  selesai date,
  berjalan boolean not null default false,
  butir jsonb not null default '[]',          -- daftar poin (string[])
  deskripsi text not null default '',         -- skill: tingkat; pendidikan: IPK/jurusan; dst.
  urutan int not null default 0,
  updated_at timestamptz not null default now()
);
-- jenis "magang" ditambahkan setelah rilis pertama: perbarui batasan pada DB yang sudah ada
alter table entries drop constraint if exists entries_tipe_check;
alter table entries add constraint entries_tipe_check
  check (tipe in ('kerja','magang','pendidikan','skill','sertifikat','organisasi','proyek','bahasa','penghargaan'));
create index if not exists entries_client on entries(client_id, tipe, urutan);

create table if not exists cvs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  label text not null default 'CV',           -- nama internal: "CV Marketing"
  target_posisi text not null default '',
  template text not null default 'klasik',
  pakai_foto boolean not null default false,
  pakai_data_pribadi boolean not null default false,
  ringkasan_override text,
  urutan_bagian jsonb,                        -- null = urutan bawaan template
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists cvs_client on cvs(client_id);

create table if not exists cv_entries (
  cv_id uuid not null references cvs(id) on delete cascade,
  entry_id uuid not null references entries(id) on delete cascade,
  butir_override jsonb,                       -- null = pakai butir asli
  primary key (cv_id, entry_id)
);

create table if not exists versions (
  id uuid primary key default gen_random_uuid(),
  cv_id uuid not null references cvs(id) on delete cascade,
  nomor int not null,
  snapshot jsonb not null,                    -- data CV lengkap saat disimpan
  catatan text not null default '',
  created_at timestamptz not null default now(),
  unique (cv_id, nomor)
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  cv_id uuid references cvs(id) on delete set null,
  jenis text not null default 'baru' check (jenis in ('baru','update','varian','lain')),
  status text not null default 'baru' check (status in ('baru','data','draf','revisi','selesai','batal')),
  judul text not null default '',
  deadline date,
  revisi_ke int not null default 0,
  batas_revisi int not null default 2,
  harga bigint not null default 0 check (harga >= 0),
  dibayar bigint not null default 0 check (dibayar >= 0),
  catatan text not null default '',
  created_at timestamptz not null default now(),
  selesai_at timestamptz
);
create index if not exists orders_client on orders(client_id);
create index if not exists orders_status on orders(status);

create table if not exists intake_links (
  token text primary key,                     -- sha256 dari token di tautan
  client_id uuid not null references clients(id) on delete cascade,
  expires_at timestamptz not null
);

-- Supabase membuka skema public lewat REST API. RLS tanpa kebijakan = peran anon/authenticated tidak bisa membaca
-- atau menulis apa pun. Aplikasi memakai koneksi database langsung (pemilik tabel) sehingga tidak terpengaruh.
alter table users enable row level security;
alter table sessions enable row level security;
alter table settings enable row level security;
alter table clients enable row level security;
alter table profiles enable row level security;
alter table entries enable row level security;
alter table cvs enable row level security;
alter table cv_entries enable row level security;
alter table versions enable row level security;
alter table orders enable row level security;
alter table intake_links enable row level security;
