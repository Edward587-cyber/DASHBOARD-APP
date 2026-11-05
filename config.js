// Pengaturan dashboard. Ubah di sini bila ada kontrak/spreadsheet baru.
window.DASH_CONFIG = {
  // API key Google (Sheets API). Lihat README.md langkah 2.
  apiKey: 'AIzaSyCkbnLe1J7XaaGwIvZjPT2SIfXwguHWMt8',

  // Muat ulang otomatis (menit). 0 = matikan.
  refreshMinutes: 10,

  // Spreadsheet MONITORING TAGIHAN DAL APP (sheet LIST TAGIHAN)
  tagihanId: '1_FRf27QSQUGIZQL-mtQTuaLINbQTv67AtYQNCTM3Zpg',
  tagihanRange: "'LIST TAGIHAN'!A3:T300",

  // Spreadsheet per pelaksana.
  //   tahun : tahun kontrak (muncul otomatis sebagai pilihan filter Tahun)
  //   key   : nama singkat pelaksana (huruf besar, tanpa spasi)
  //   lot   : nomor lot, spj : awalan nomor kontrak di LIST TAGIHAN (mis. '0032.')
  // Kontrak tahun baru cukup ditambah barisnya di sini, contoh:
  //   { tahun: 2027, key: 'ANGGADA', lot: 1, nama: 'Anggada Perkasa Tehnik', spj: '0012.', spreadsheetId: 'ID_SPREADSHEET' },
  kontraktor: [
    { tahun: 2026, key: 'DHANA', lot: 1, nama: 'Dhana Julaga Ekada', spj: '0034.', spreadsheetId: '1c0cwmfHEbjzfRPNkf9AmZd9ZTbVf1iEsp-WMr3faD84' },
    { tahun: 2026, key: 'HAFIZ', lot: 2, nama: 'Hafiz Energi Tama', spj: '0035.', spreadsheetId: '1jApDU9718Z_4UCeXZi23FuljMxfD4vE-eEpI1S8D88A' },
    { tahun: 2026, key: 'ANGGADA', lot: 3, nama: 'Anggada Perkasa Tehnik', spj: '0032.', spreadsheetId: '1GBDHUVTF8qQO82nikhuqQK8bTedNhP_2EGe1eQYodLs' },
    { tahun: 2026, key: 'JATI', lot: 4, nama: 'Jati Teknik', spj: '0033.', spreadsheetId: '17ew_BeliYP7eC61ND41P2XV7GrT-GwBecy8tibgWUZ4' },
  ],
};
