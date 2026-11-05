# Dashboard Realisasi Penggantian APP 2026 – UP3 Ciracas

Halaman statis (GitHub Pages) yang membaca 4 spreadsheet pelaksana dan LIST TAGIHAN langsung dari Google Sheets setiap kali dibuka, lalu memuat ulang otomatis tiap 10 menit.

## Isi folder
| File | Fungsi |
|---|---|
| `index.html` | Tampilan dashboard |
| `config.js` | **API key** dan daftar spreadsheet (ubah di sini) |
| `sumber.js` | Membaca Google Sheets, mengenali kolom dari judulnya |
| `rekap.js` | Perhitungan: per kategori, cluster umur, cluster alasan, per bulan, merk, capaian kontrak |
| `gambar.js` | Grafik dan tabel |
| `app.js` | Pemuatan data dan muat ulang otomatis |

## Langkah pemasangan

### 1. Bagikan kelima spreadsheet
Di setiap spreadsheet: **Bagikan → Akses umum → Siapa saja yang memiliki link → Pelihat**.
- 0032.Pj/2026 PT ANGGADA PERKASA TEHNIK
- 0033.Pj/2026 PT JATI TEKNIK
- 0034.Pj/2026 PT DHANA JULAGA EKADA
- 0035.Pj/2026 PT HAFIZ ENERGI TAMA
- MONITORING TAGIHAN DAL APP

> Perhatian: siapa pun yang memegang link/ID spreadsheet dapat melihat data pelanggan (nama, alamat, IDPEL).

### 2. Buat API key Google
1. Buka https://console.cloud.google.com/ → buat project (mis. `dashboard-app`).
2. **APIs & Services → Library** → cari **Google Sheets API** → **Enable**.
3. **APIs & Services → Credentials → Create credentials → API key**.
4. Klik key tersebut → **Application restrictions: Websites** → tambahkan `https://USERNAME.github.io/*`.
   **API restrictions: Restrict key** → pilih **Google Sheets API** → Save.
5. Salin key ke `config.js` pada baris `apiKey: '...'`.

### 3. Unggah ke GitHub Pages
1. Buat repository baru (mis. `dashboard-app`), unggah semua file di folder ini.
2. **Settings → Pages → Source: Deploy from a branch → Branch: main / (root)** → Save.
3. Dashboard tersedia di `https://USERNAME.github.io/dashboard-app/` dalam 1–2 menit.

## Aturan perhitungan
- Satu baris = satu pelanggan bila kolom IDPEL berisi angka ≥ 6 digit.
- Target = volume RAB "Menyetel (Montage) KWH Meter 1 Phase" (bagian PEKERJAAN METER) + "3 Phasa".
- Realisasi kWh = Paska 1P + Prabayar 1P + Prabayar 3P. Box combo = volume pekerjaan "pasang box".
- Umur = tahun penggantian − TAHUN meter lama; cluster < 10, 10 – < 15, ≥ 15 tahun.
- Alasan = kolom ALASAN GANTI METER; bila kosong, kolom KETERANGAN.

## Menambah kontrak tahun baru
1. Buka `config.js`, tambahkan satu baris di `kontraktor`, misalnya:
   `{ tahun: 2027, key: 'ANGGADA', lot: 1, nama: 'Anggada Perkasa Tehnik', spj: '0012.', spreadsheetId: 'ID_SPREADSHEET' },`
2. Bagikan spreadsheet barunya "Siapa saja yang memiliki link → Pelihat".
3. Tahun 2027 otomatis muncul di filter **Tahun kontrak**; dashboard terbuka di tahun terbaru.

Spreadsheet baru harus memakai judul kolom yang sama (IDPEL, TANGGAL PENGGANTIAN, ALASAN GANTI METER, METER LAMA → TAHUN, dst.) dan nama sheet PASKA 1 PHASA, PRABAYAR 1 PHASA, PRABAYAR 3 PHASA, PERIKSA, METER BOX, BOX COMBO, RAB. Data kontrak dicocokkan ke LIST TAGIHAN lewat awalan nomor SPJ dan tahunnya.
