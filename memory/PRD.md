# Arsa Wedding Gallery — PRD

## Original Problem Statement
Web app galeri foto pernikahan multi-client. Fokus utama: perbaiki fitur download foto yang rusak (tombol hanya link ke gambar cross-origin sehingga browser membuka gambar, bukan mengunduh) + panel admin (JWT) untuk kelola banyak klien tanpa ngoding. Keputusan final: tanpa watermark, tanpa proteksi akses tamu (download bebas), download per foto saja (tanpa ZIP), struktur multi-client.

## Architecture
- Frontend: React (CRA + craco), react-router, framer-motion, shadcn/ui, sonner. Fonts: Cormorant Garamond + Plus Jakarta Sans.
- Backend: FastAPI, all routes under `/api`. JWT (Bearer) admin auth, bcrypt hashing.
- DB: MongoDB — collections: `users`, `galleries`, `photos`.
- Storage: Emergent Object Storage for uploaded photos; demo photos use cross-origin `source_url` streamed through backend proxy.

## User Personas
- Tamu undangan: buka `/g/:slug`, lihat foto (lazy load, blur-in), download per foto.
- Admin (owner): login `/admin/login`, kelola galeri klien, upload/urut/hapus foto, atur branding & layout, toggle download.

## Core Requirements (static)
- Download per foto lewat backend stream (`Content-Disposition: attachment`) — lolos cross-origin.
- Multi-client galleries, tiap klien URL sendiri `/g/:slug`.
- Branding per galeri: logo, warna aksen, latar, font, judul, deskripsi, tanggal.
- Layout: grid / masonry / slideshow / fullscreen.
- Toggle download on/off per galeri — endpoint menolak (403) saat off, bukan hanya sembunyikan tombol.
- Hanya admin bisa upload/hapus/ubah (401 tanpa token).

## Implemented (2026-06)
- [x] Fix bug download: `GET /api/photos/{id}/download` stream + attachment header + nama file rapi `slug-NNN.ext`. Frontend blob-fetch download. VERIFIED via real testing.
- [x] JWT admin auth (login, me, seed admin from env, idempotent password update).
- [x] Multi-client data model + gallery CRUD.
- [x] Photo upload (object storage, multipart), soft-delete, drag reorder.
- [x] Branding + layout editor with live preview.
- [x] Download toggle with backend enforcement (403).
- [x] Demo gallery `arsa-demo` (Dniel & Sarah) seeded with 9 sample photos.
- [x] Public gallery page with 4 layouts + lightbox (prev/next/download).
- Testing: backend 14/14 pytest pass; frontend flows pass (iteration_1.json).

## Backlog / Remaining
- P1: Thumbnail/resized variants for faster gallery load (currently serves full-res through proxy).
- P1: Async image fetch (httpx/run_in_threadpool) for `source_url` to avoid blocking event loop under load.
- P2: Logo file upload (currently URL only).
- P2: Password reset / multi-admin.
- P2: Per-photo caption editing in admin UI.

## Next Tasks
- Add thumbnail generation on upload for faster public gallery.
- Optional: data-testid on photo tile to open lightbox (testing convenience).
