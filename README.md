# Dashboard Realisasi Penggantian APP 2026 – UP3 Ciracas

Halaman statis (GitHub Pages) yang membaca 4 spreadsheet pelaksana dan LIST TAGIHAN langsung dari Google Sheets setiap kali dibuka, lalu memuat ulang otomatis tiap 10 menit.

## Isi folder
| File | Fungsi |
|---|---|
| `index.html` | Tampilan dashboard |
| `data/config.enc` | **API key** dan daftar spreadsheet, terenkripsi (ubah lewat `atur-sandi.html`) |
| `data/kunci.json` | Kunci data yang dikunci kata sandi dashboard |
| `gerbang.js`, `atur-sandi.html` | Layar masuk dan halaman ganti/reset kata sandi |
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
5. Masukkan key lewat `atur-sandi.html` → bagian 4 (Pengaturan kontrak), kolom `apiKey`.

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
1. Buka `atur-sandi.html`, buka kunci, lalu di bagian 4 tambahkan satu baris di `kontraktor` (kemudian unggah `config.enc` baru ke folder `data`), misalnya:
   `{ tahun: 2027, key: 'ANGGADA', lot: 1, nama: 'Anggada Perkasa Tehnik', spj: '0012.', spreadsheetId: 'ID_SPREADSHEET' },`
2. Bagikan spreadsheet barunya "Siapa saja yang memiliki link → Pelihat".
3. Tahun 2027 otomatis muncul di filter **Tahun kontrak**; dashboard terbuka di tahun terbaru.

Spreadsheet baru harus memakai judul kolom yang sama (IDPEL, TANGGAL PENGGANTIAN, ALASAN GANTI METER, METER LAMA → TAHUN, dst.) dan nama sheet PASKA 1 PHASA, PRABAYAR 1 PHASA, PRABAYAR 3 PHASA, PERIKSA, METER BOX, BOX COMBO, RAB. Data kontrak dicocokkan ke LIST TAGIHAN lewat awalan nomor SPJ dan tahunnya.

## Data DIL (peta umur & realisasi)
Bagian "Peta umur & DIL" membaca `data/dil/ringkasan.enc` (rekap, terenkripsi kunci data dashboard) dan `data/dil/detail.enc` (detail per pelanggan, terenkripsi AES-256-GCM; kunci dari kata sandi via PBKDF2-SHA256 310.000 iterasi), hasil perbandingan dua DIL SALDO.
Untuk memperbarui dengan DIL bulan baru:
```
pip install pandas python-calamine cryptography
DIL_SANDI='kata-sandi' python tools/olah_dil.py DIL_SALDO_MASK_202412_54720_CIRACAS.xlsx DIL_SALDO_MASK_<bulan_baru>_54720_CIRACAS.xlsx
```
lalu commit folder `data/dil/` dan naikkan `DIL_VERSI` di `index.html`.
Aturan: pelanggan AKTIF di DIL awal yang punya NOMOR_METER_KWH; terganti bila nomor meternya di DIL akhir berbeda.
Umur = tahun DIL awal − TAHUN_BUAT_METER_KWH (bila kosong, TAHUN_TERA). Target: Paskabayar ≥ 15 tahun, Prabayar ≥ 10 tahun (ubah di `UMUR_PASKA` / `UMUR_PRA`).


## Kata sandi dashboard
Dashboard hanya terbuka dengan kata sandi. Pengaturan (API key, ID spreadsheet) dan rekap DIL disimpan terenkripsi
(AES-256-GCM) dengan **kunci data** acak; kunci data itu disimpan di `data/kunci.json`, dikunci kata sandi (PBKDF2-SHA256, 310.000 iterasi).
Repo publik tidak berisi pengaturan atau data dalam bentuk terbaca.

**Ganti kata sandi** (ingat sandi lama) atau **reset karena lupa** (pakai *kunci pemulihan*):
1. Buka `https://edward587-cyber.github.io/DASHBOARD-APP/atur-sandi.html` (juga ada tautan "Atur kata sandi" di menu kiri).
2. Buka kunci dengan kata sandi lama, **atau** pilih "Lupa — pakai kunci pemulihan".
3. Isi kata sandi baru → klik *Buat file kunci.json* → file terunduh.
4. Di GitHub: repo DASHBOARD-APP → folder `data` → *Add file → Upload files* → unggah `kunci.json` → *Commit changes*. Berlaku ±1 menit.

Kunci pemulihan tidak berubah saat kata sandi diganti; simpan di tempat aman. Bila kunci pemulihan **dan** kata sandi sama-sama hilang,
data terenkripsi tidak bisa dibuka lagi — buat ulang dengan `tools/kunci_dashboard.py baru` lalu enkripsi ulang pengaturan dan rekap DIL.
Mengganti kata sandi tidak mengeluarkan perangkat yang memakai "Ingat di perangkat ini"; untuk mencabut semua akses, buat kunci data baru (alat yang sama).

Tab **Peraturan TEL** punya kata sandi tambahan sendiri (daftar dokumen di `data/peraturan.enc`, dibuat dengan `tools/enkrip_peraturan.py`).
