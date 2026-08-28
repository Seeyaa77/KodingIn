# KodingIn

Platform media sharing khusus developer untuk berbagi proyek, diskusi Q&A, tutorial, dan meme coding.

## Fitur Utama
* **Live Markdown & Sandbox Editor:** Editor side-by-side dengan preview markdown instan dan code execution playground.
* **Markdown Formatting Toolbar:** Toolbar untuk mempermudah penulisan markdown (Tebal, Miring, Code Block, Link, dll) beserta quick Cheat Sheet.
* **Reputation (Bytes) System:** Poin reputasi otomatis berdasarkan kontribusi user (voting, tag `#Tutor`, dan penandaan solusi/solved).
* **GitHub Repository Preview:** Otomatis merender info repository GitHub (bintang, fork, deskripsi) saat link di-paste.
* **Q&A Solved:** Penulis thread dapat menandai balasan terbaik sebagai solusi (+15 Bytes reward untuk solver).
* **Responsive Direct Messaging (Inbox):** Sistem pesan langsung (DM) responsif dengan antarmuka chat bubble modern, mendukung Markdown rendering, dan dilengkapi quick actions template (share code, apresiasi).

## Tech Stack
* **Frontend:** Next.js (App Router), React, TypeScript, Custom CSS, Lucide Icons
* **Backend & Database:** Supabase Auth & PostgreSQL, Express.js (GitHub Scraper API)

## Cara Pemakaian

### 1. Setup Lokal
Instal dependensi:
```bash
npm install
```

### 2. Environment Variables
Buat berkas `.env.local` lalu isi dengan kunci Supabase Anda:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```
*(Jika dikosongkan, aplikasi akan berjalan dalam **Mock Mode** dengan database tiruan di localStorage)*

### 3. Jalankan Aplikasi
Jalankan dev server:
```bash
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

### 4. Database Setup (Opsional)
Jika menggunakan live Supabase database, jalankan query dari berkas `supabase_schema.sql` di SQL Editor dashboard Supabase Anda.

XoXo
