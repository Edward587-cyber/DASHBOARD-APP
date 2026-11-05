// Pengaturan dashboard. Ubah di sini bila ada kontrak/spreadsheet baru.
window.DASH_CONFIG = {
  // API key Google (Sheets API). Lihat README.md langkah 2.
  apiKey: 'ISI_API_KEY_DI_SINI',

  // Muat ulang otomatis (menit). 0 = matikan.
  refreshMinutes: 10,

  // Spreadsheet MONITORING TAGIHAN DAL APP (sheet LIST TAGIHAN)
  tagihanId: '1_FRf27QSQUGIZQL-mtQTuaLINbQTv67AtYQNCTM3Zpg',
  tagihanRange: "'LIST TAGIHAN'!A3:T300",

  // Spreadsheet per pelaksana. key dipakai di filter, spj = awalan nomor kontrak di LIST TAGIHAN.
  kontraktor: [
    { key: 'DHANA', lot: 1, nama: 'Dhana Julaga Ekada', spj: '0034.', spreadsheetId: '1c0cwmfHEbjzfRPNkf9AmZd9ZTbVf1iEsp-WMr3faD84' },
    { key: 'HAFIZ', lot: 2, nama: 'Hafiz Energi Tama', spj: '0035.', spreadsheetId: '1jApDU9718Z_4UCeXZi23FuljMxfD4vE-eEpI1S8D88A' },
    { key: 'ANGGADA', lot: 3, nama: 'Anggada Perkasa Tehnik', spj: '0032.', spreadsheetId: '1GBDHUVTF8qQO82nikhuqQK8bTedNhP_2EGe1eQYodLs' },
    { key: 'JATI', lot: 4, nama: 'Jati Teknik', spj: '0033.', spreadsheetId: '17ew_BeliYP7eC61ND41P2XV7GrT-GwBecy8tibgWUZ4' },
  ],
};
