# Siskamling Mobile App - PRD

## Overview
Aplikasi mobile **Siskamling (Sistem Keamanan Lingkungan)** untuk komunitas RT/RW Indonesia. Aplikasi ini memungkinkan warga, koordinator RW, dan koordinator kelurahan untuk berkoordinasi terkait keamanan lingkungan, cuaca harian, peringatan bencana, dan komunikasi grup.

## Target Pengguna
- Warga (citizen) - akses dasar
- Koordinator RW - akses koordinasi RW
- Koordinator Kelurahan - akses koordinasi kelurahan (semua RW)

## Core Features

### 1. Tab Darurat (Emergency)
- Tombol SOS besar untuk darurat umum
- 3 tombol darurat spesifik: MEDIS, KRIMINAL, KEBAKARAN
- **Live GPS location** dikirim bersama notifikasi
- Mode toggle: Di Rumah / Pergi
- Routing notifikasi: warga RW → koordinator RW → koordinator kelurahan
- Riwayat notifikasi terkirim
- Menu profile dengan opsi "Undang Teman" + Logout

### 2. Tab Cuaca (Weather)
- Section "Cuaca Hari Ini" di paling atas
- Section "Kondisi Saat Ini" dengan stats (kelembaban, angin, visibilitas, UV, hujan)
- Air Quality Index (AQI) dengan progress bar
- **Rekomendasi harian**: Sunscreen / Payung / Masker dengan status WAJIB/OPSIONAL
- Prakiraan 5 hari ke depan
- Switch bahasa ID/EN
- Mock weather data (siap untuk integrasi OpenWeatherMap)

### 3. Tab Bencana (Disaster)
- Status keseluruhan: Aman/Waspada/Siaga/Awas
- **Data Gempa Real-time dari BMKG** (data.bmkg.go.id)
- Grid 6 jenis bencana: Gempa, Tsunami, Gunung Meletus, Tanah Longsor, Banjir, Angin Kencang
- **Peta Live OpenStreetMap** menampilkan titik laporan warga
- Modal lapor bencana dengan tipe + deskripsi + GPS
- Daftar laporan terbaru warga

### 4. Tab Chat
- **Role-based access**:
  - Warga: 1 grup (Warga RW)
  - Koordinator RW: 2 grup (Warga RW + Koordinator RW se-Kelurahan)
  - Koordinator Kelurahan: 3 grup (semua di atas + Koordinator Kelurahan)
- Sub-tab "Anggota" - daftar warga di RW yang sama
- Tombol "Undang Teman" via native share

## Tech Stack
- **Frontend**: React Native + Expo Router + TypeScript
- **Backend**: FastAPI (Python) + MongoDB + Motor
- **Auth**: JWT bearer tokens + bcrypt
- **Maps**: OpenStreetMap via WebView/iframe
- **API Integration**: BMKG (data.bmkg.go.id) - real earthquake data

## Database Collections
- `users` - profile + role + kelurahan/rw/rt + mode + language
- `emergency_alerts` - dengan live GPS + routing info
- `chat_messages` - room_id-based dengan role context
- `disaster_reports` - user-submitted disaster reports

## Bilingual Support
- Bahasa Indonesia (default)
- English
- Switcher di header tab Cuaca

## Security
- JWT-based authentication (7-day expiry)
- bcrypt password hashing
- Role-based access control untuk chat rooms
- ObjectId validation untuk mencegah 500 errors

## Status
✅ MVP Complete - all 4 tabs functional, 33/33 backend tests pass, frontend e2e verified
