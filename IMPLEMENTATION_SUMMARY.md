# SISKAMLING - Sistem Keamanan Lingkungan (Neighborhood Security System)

## Ringkasan Fitur yang Sudah Diimplementasikan

### 1. **Weather Tab** ✅
- Menampilkan cuaca real-time dengan lokasi pengguna
- Rekomendasi harian berdasarkan kondisi cuaca:
  - Penggunaan sunscreen untuk cuaca panas
  - Bawa payung untuk kemungkinan hujan
  - Masker untuk cuaca ekstrem
- Integrasi OpenWeather API untuk prakiraan cuaca
- Indikator kualitas udara (PM2.5, PM10, O3, NO2)
- Tombol link langsung ke aplikasi cuaca bawaan dan pemantau kualitas udara

### 2. **Emergency Tab** ✅
- Fitur sinyal darurat dengan 4 kategori:
  - Kecelakaan (Merah: #FF6B6B)
  - Kebakaran (Orange: #FFA500)
  - Pencurian (Merah: #FF1744)
  - Medis (Hijau: #4CAF50)
- Pengiriman lokasi otomatis dengan detail:
  - Koordinat latitude/longitude
  - Nama jalan/alamat lengkap
  - Estimasi jarak dari titik penerima sinyal
- Riwayat laporan darurat dengan status:
  - Pending, In Progress, Resolved
- Detail modal untuk setiap laporan
- Integrasi Google Maps untuk melihat lokasi titik sinyal

### 3. **Chat Tab** ✅
- Komunikasi real-time dengan Koordinator RT
- Input pesan dengan keyboard awareness:
  - Input field naik otomatis saat keyboard muncul
  - Support multiline message
  - Maximum 1000 karakter per pesan
- Fitur attachment (attachment button)
- Timestamp untuk setiap pesan
- Avatar dan nama pengirim pesan
- Bubble chat dengan styling berbeda untuk user dan others

### 4. **Menu Tab** ✅
#### Sub-menu Tersedia:
- **Profil Pengguna**
  - Menampilkan nama, email, nomor HP
  - Status verifikasi profil
  - Modal untuk edit profil (placeholder)

- **Notifikasi**
  - Kategori: Approval, Status Update, General
  - Notification badge dengan counter belum dibaca
  - Unread indicator (dot blue)
  - Mark as read functionality

- **Ajukan Koordinator**
  - Pilihan level: RT, RW, Kelurahan
  - Setiap level dengan deskripsi
  - Submit permohonan dengan alert confirmation

- **FAQ (Frequently Asked Questions)**
  - Expandable accordion style
  - 3 pertanyaan umum termasuk:
    - Cara menggunakan sinyal darurat
    - Persyaratan membuat laporan
    - Cara menjadi koordinator

- **Logout**
  - Menu untuk keluar dari aplikasi

## Fitur Teknis yang Diimplementasikan

### Dependencies yang Digunakan:
- `@react-navigation/*` - Navigation routing
- `@expo/vector-icons` - Material Community Icons
- `expo-location` - Akses lokasi GPS
- `expo-constants` - Environment variables
- `axios` - HTTP requests
- `react-native-reanimated` - Animations
- `react-native-gesture-handler` - Gesture handling

### API Integration:
- **OpenWeather API** - Cuaca real-time dan kualitas udara
  - API Key: `35dd9978d3b899f5333e6bb7ea197f7e`
  - Endpoints:
    - Weather: `/data/2.5/weather`
    - Air Pollution: `/data/2.5/air_pollution`

### Keamanan & Privacy:
- Location permission request before access
- Data handling dengan proper error handling
- Modal-based UI untuk sensitive information

## Struktur Folder Project

```
frontend/
├── app/
│   ├── (tabs)/
│   │   ├── weather.tsx      ✅ Cuaca & Rekomendasi
│   │   ├── emergency.tsx    ✅ Sinyal Darurat
│   │   ├── chat.tsx         ✅ Chat Real-time
│   │   └── menu.tsx         ✅ Menu Utama
│   └── ...
├── package.json
└── ...
```

## UI/UX Features

### Design System:
- **Primary Color**: #007AFF (Blue)
- **Success Color**: #4CAF50 (Green)
- **Warning Color**: #FFC107 (Yellow)
- **Error Color**: #FF1744 (Red)
- **Background**: #F5F5F5 (Light Gray)

### Component Features:
- Bottom sheet modals dengan rounded corners
- Card-based layouts
- Color-coded status badges
- Smooth animations dan transitions
- Responsive design untuk berbagai ukuran layar
- Touch feedback pada interactive elements

## Next Steps / Belum Diimplementasikan

1. **Backend Integration**
   - API endpoints untuk menyimpan/retrieve data
   - Database setup
   - Authentication & Authorization

2. **Report/Laporan Tab**
   - Map popup UI improvements
   - Report list dengan filtering
   - Map visualization untuk laporan

3. **Advanced Features**
   - Real-time notifications
   - Push notifications
   - Offline support
   - Data sync

4. **Testing**
   - Unit tests
   - Integration tests
   - E2E tests

## Cara Menjalankan

```bash
cd frontend
npm install
npx expo start

# Pilih salah satu:
# - Press 'a' untuk Android Emulator
# - Press 'i' untuk iOS Simulator
# - Scan QR code dengan Expo Go app
```

## Notes

- Semua component menggunakan TypeScript untuk type safety
- Styling menggunakan React Native StyleSheet
- Component-based architecture untuk reusability
- State management menggunakan React useState hooks
- Semua fitur sudah fully functional dengan mock data

---

**Last Updated**: 24 May 2026
**Branch**: feature/implementation-improvements
**Status**: Ready for Backend Integration
