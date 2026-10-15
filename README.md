# CEVE-IN

Aplikasi untuk mengelola CV ATS bagi banyak klien: satu data klien, banyak CV, setiap perubahan tersimpan sebagai versi.

## Menjalankan

```bash
pnpm install
pnpm db setup        # buat tabel + akun admin dari ADMIN_EMAIL / ADMIN_PASSWORD di .env.local
pnpm db seed         # opsional: klien contoh (riwayat lengkap + satu CV) dari db/seed.json, atau db/seed.example.json bila tidak ada; dilewati bila sudah ada
pnpm dev             # http://localhost:3300
```

- `.env.local` berisi `DATABASE_URL` (Postgres), akun admin awal, dan `CHROME_PATH`.
- Ekspor PDF memakai Chrome/Chromium yang sudah terpasang. Di server Linux, pasang `chromium` lalu isi `CHROME_PATH=/usr/bin/chromium`.
- Foto klien disimpan di database (JPEG 3×4, dikecilkan di browser sebelum diunggah), jadi ikut tercadangkan dan tidak bergantung pada disk server.
- Port 3300 dipilih sengaja. Jangan pakai 3000 (bentrok dengan aplikasi lain di Chrome ini).

## Supabase

Database aktif adalah proyek Supabase `favpdnjhhviwezlpskox`.

- `DATABASE_URL` memakai koneksi langsung (`db.<ref>.supabase.co:5432`, SSL wajib). Koneksi ini IPv6. Bila server tujuan tidak punya IPv6 (mis. Vercel), pakai string **Session pooler** dari Dashboard → Connect.
- Semua tabel memakai Row Level Security tanpa kebijakan, jadi REST API publik Supabase tidak bisa membaca atau menulis data. Aplikasi memakai koneksi database langsung dan tidak terpengaruh.
- `DATABASE_URL_LOKAL` menyimpan database Postgres lokal lama. Tukar nilainya ke `DATABASE_URL` untuk kerja offline.
- Skema dan data diatur lewat `pnpm db schema` (aman diulang). Jangan mengubah tabel lewat editor Supabase tanpa memperbarui `db/schema.sql`.
- `.mcp.json` mendaftarkan MCP Supabase untuk proyek ini. Jalankan `claude` lalu `/mcp` di terminal biasa dan pilih supabase → Authenticate sekali.

## Cara kerja

1. **Klien** (`/klien`) menyimpan biodata dan riwayat sekali: kerja, pendidikan, keahlian, sertifikat, organisasi, proyek, bahasa, penghargaan.
2. **CV** dibuat dari riwayat itu. Pilih entry yang dipakai, ubah poin khusus untuk CV tersebut tanpa mengubah riwayat klien, pilih template.
3. **Versi** menyimpan salinan CV beku. Versi lama bisa dilihat, diunduh, dibandingkan, dan dipulihkan.
4. **Order** mencatat pekerjaan, batas waktu, revisi, harga (bebas diisi), dan pembayaran.
5. **Pengaturan** membuka atau menutup pendaftaran mandiri klien.

Tiga jalur klien:

| Jalur | Cara |
|---|---|
| Dikelola penuh | Semua lewat admin |
| Isi data sendiri | Admin membuat tautan di *Kelola klien*; klien mengisi biodata tanpa akun |
| Login sendiri | Admin membuatkan akun, atau klien mendaftar di `/daftar` (bila dibuka di Pengaturan) |

Klien dengan akun hanya melihat datanya sendiri dan dapat membuat CV sampai batas kuotanya.

## Template dan ATS

Semua template satu kolom, tanpa tabel, ikon, atau grafik; PDF berisi teks asli. Pemeriksaan di editor memakai aturan tetap (tanpa AI) dan mencocokkan kata kunci teks lowongan dengan isi CV.

DOCX tidak memuat foto. Tempel sendiri bila diperlukan.

## Pengujian

```bash
pnpm test      # logika murni: format tanggal, HTML, pemeriksaan ATS, kata kunci
pnpm smoke     # alur penuh di Chrome (server dev harus jalan): login, CV, PDF/DOCX, versi, hak akses
```

`pnpm smoke` membuat klien uji lalu menghapusnya lagi.

## Desain

Memakai "iOS Design System": token di `design/tokens.json` → `pnpm tokens` menghasilkan `src/app/tokens.css`. Aksen biru sesuai logo (`Logo CEVEIN 1.png` dan `Logo CEVEIN 2.png`; versi kecilnya ada di `public/` dan `src/app/icon.png`).
