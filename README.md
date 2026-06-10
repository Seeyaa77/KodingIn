# KodingIn 🚀
**KodingIn** adalah platform komunitas developer-first yang dirancang khusus untuk membagikan meme coding, diskusi Q&A, tutorial, petunjuk pemecahan masalah, dan showcase proyek lengkap dengan live-compiler sandbox.

Platform ini hadir dengan tampilan bertema **Dracula / One Dark Pro Terminal** yang estetik, modern, dan fungsional.

---

## ✨ Fitur Utama
- **Real-Time Split Markdown Editor:** Membuat thread kini lebih interaktif dengan visual editor side-by-side. Ketik kode/text markdown di sisi kiri, dan lihat preview ter-compile secara instan di sisi kanan.
- **Markdown Formatting Toolbar & Cheat Sheet:** Membantu memformat tulisan (Tebal, Miring, Code Block, Link, Quote, List) dengan cepat tanpa perlu menghafal sintaks markdown.
- **Interactive Live Code Sandbox:** Bagikan template HTML/CSS/JS Anda langsung di dalam thread. Pengguna lain dapat mengedit dan melihat hasil compile secara langsung (iframe sandbox).
- **Reputation System ("Bytes") & Levels:** Otomatisasi perhitungan reputasi pengguna berdasarkan kontribusi mereka (Upvotes, Downvotes, postingan tutorial #Tutor, serta penandaan solusi/solved).
- **GitHub Repository Preview Card:** Tempel tautan repositori GitHub Anda saat membuat thread, dan platform akan otomatis merender kartu preview repositori yang berisi bintang (stars), forks, deskripsi, dan bahasa pemrograman secara dinamis.
- **Q&A Solved System:** Penulis thread dapat menandai balasan terbaik sebagai solusi. Tindakan ini secara otomatis memberikan reward reputasi (+15 Bytes) kepada penolong pada database layer.
- **Role-Based Badges & Actions:** Menampilkan badge khusus untuk "Admin" dan mengaktifkan tombol moderasi instan (seperti tombol delete langsung di feed timeline).

---

## 🛠️ Tech Stack yang Digunakan

### 1. Frontend & Client-side
* **Framework:** Next.js 16 (App Router, React 19)
* **Pintasan Bahasa:** TypeScript (Type-safe compilation)
* **Styling:** Custom CSS + CSS Variable Dracula tokens (Sangat fleksibel, responsif, dan responsif terhadap transisi)
* **Icons:** Lucide React (Sleek developer-centric icons)
* **Markdown Renderer:** Custom component rendering markdown safely

### 2. Backend & Database
* **Database:** Supabase PostgreSQL (Relational schema)
* **Authentication:** Supabase Auth (Mendukung email login langsung & OAuth)
* **Row Level Security (RLS):** Kebijakan keamanan granular di database PostgreSQL (Hanya pembuat yang dapat mengedit postingan mereka, namun admin memiliki izin penuh)
* **Database Triggers:**
  - `handle_thread_solution_change`: Otomatisasi pembaruan reputasi (+15 Bytes) ketika solusi ditandai/dihapus pada tabel threads.
  - `sync_existing_users`: Menyinkronkan pengguna auth baru ke tabel publik.
* **Scraper API:** Node.js Express.js API endpoint untuk mengekstrak metadata repositori GitHub secara real-time.

---

## 🚀 Cara Menjalankan Project Secara Lokal

### Prasyarat
Pastikan Anda sudah menginstal:
* [Node.js](https://nodejs.org) (Versi 18+ direkomendasikan)
* [npm](https://www.npmjs.com/) atau yarn/pnpm

### Langkah 1: Kloning & Masuk ke Direktori Project
```bash
cd project3
```

### Langkah 2: Instal Dependensi
```bash
npm install
```

### Langkah 3: Konfigurasi Environment Variables
Salin berkas `.env.example` menjadi `.env.local` dan lengkapi konfigurasi Supabase Anda:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

> [!NOTE]
> Jika `.env.local` tidak diisi atau dijalankan dalam mode offline, aplikasi secara otomatis masuk ke **Mock Database Mode** menggunakan data tiruan (`localStorage`) sehingga Anda tetap dapat menguji seluruh alur autentikasi dan pembuatan postingan secara instan!

### Langkah 4: Jalankan Server Pengembangan (Development Server)
```bash
npm run dev
```

Aplikasi sekarang dapat diakses melalui browser Anda di **[http://localhost:3000](http://localhost:3000)**.

### Langkah 5: Menjalankan Database Migrations (Supabase)
Jika Anda menggunakan live Supabase database, jalankan kode SQL yang terdapat di berkas `supabase_schema.sql` langsung melalui **Supabase SQL Editor** Anda untuk mempersiapkan tabel, relasi, RLS policies, dan trigger fungsi otomatis.

---

## 📦 Struktur Skema Database
* `public.users`: Menyimpan data profil developer, tech stack, level, peran (role), dan poin reputasi (Bytes).
* `public.threads`: Menyimpan thread diskusi beserta referensi link GitHub, tag kategori, dan tanda solusi (`solved_reply_id`).
* `public.replies`: Menyimpan pesan balasan/komentar secara terstruktur (mendukung nested reply tree).
* `public.votes`: Mencatat upvotes/downvotes thread untuk mencegah voting berulang dari pengguna yang sama.

---

## 🎨 Panduan Kontribusi
1. Pastikan setiap komponen visual mengikuti aturan warna Dracula (terutama background gelap, border redup, dan teks accent biru/hijau/merah).
2. Gunakan static check `npm run build` sebelum melakukan push commit untuk memastikan tidak ada kesalahan TypeScript atau kompilasi bundler Next.js.
