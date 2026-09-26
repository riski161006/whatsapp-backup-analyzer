# WhatsApp Backup Analyzer

Aplikasi untuk ekstrak dan analisis pesan WhatsApp dari file backup.

## Fitur
- Upload file backup WhatsApp (.tar.gz)
- Ekstrak database WhatsApp
- Analisis nomor telepon
- Normalisasi format nomor Indonesia
- Deteksi duplikat

## Cara Instalasi di Termux

### 1. Install Node.js
```bash
pkg update
pkg upgrade
pkg install nodejs npm
```

### 2. Clone Repository
```bash
git clone https://github.com/riski161006/whatsapp-backup-analyzer.git
cd whatsapp-backup-analyzer
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Jalankan Server
```bash
npm start
```

Server akan berjalan di: `http://localhost:3000`

### 5. Buka di Browser
Buka browser HP/PC dan akses:
```
http://127.0.0.1:3000
```

## Struktur Folder
```
whatsapp-backup-analyzer/
├─ public/
│  ├─ styles.css
│  └─ script.js
├─ views/
│  └─ index.ejs
├─ uploads/          (tempat upload file)
├─ extracted/        (hasil ekstrak)
├─ data/
│  └─ records.json   (data hasil analisis)
├─ package.json
├─ server.js
└─ README.md
```

## API Endpoints

### GET /
Halaman utama dengan statistik data.

### POST /api/import
Upload dan import file backup WhatsApp.

**Parameter:**
- `file`: File .tar.gz backup WhatsApp

**Response:**
```json
{
  "success": true,
  "message": "Import berhasil dari backup WhatsApp.",
  "summary": {
    "total": 100,
    "valid": 95
  }
}
```

## Fitur Normalisasi Nomor

Aplikasi otomatis menormalisasi nomor telepon Indonesia:
- `+62812...` → `6281...`
- `08` → `628`
- `8` → `628`

## Troubleshooting

### Error: Cannot find module 'express'
```bash
npm install
```

### Port 3000 sudah digunakan
```bash
PORT=4000 npm start
```

### Tidak bisa akses dari browser
Cek IP Termux:
```bash
ifconfig
```

Akses dengan IP yang muncul:
```
http://<IP_TERMUX>:3000
```

## License
MIT
