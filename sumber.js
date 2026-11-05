// Membaca Google Sheets langsung (Sheets API v4, API key) dan mengubahnya menjadi baris data.
(() => {
  const API = 'https://sheets.googleapis.com/v4/spreadsheets/';
  const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim().toUpperCase();
  const colL = (i) => { let s = ''; i += 1; while (i > 0) { const r = (i - 1) % 26; s = String.fromCharCode(65 + r) + s; i = Math.floor((i - 1) / 26); } return s; };
  const q = (t) => "'" + t.replace(/'/g, "''") + "'";
  const KAT = ['PASKA 1 PHASA', 'PRABAYAR 1 PHASA', 'PRABAYAR 3 PHASA', 'PERIKSA', 'METER BOX', 'BOX COMBO'];
  const MON = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, MEI: 5, JUN: 6, JUL: 7, AUG: 8, AGU: 8, AGT: 8, SEP: 9, OCT: 10, OKT: 10, NOV: 11, DEC: 12, DES: 12 };

  async function api(key, path) {
    const r = await fetch(API + path + (path.includes('?') ? '&' : '?') + 'key=' + encodeURIComponent(key));
    let j = {};
    try { j = await r.json(); } catch (e) { /* kosong */ }
    if (!r.ok) {
      const msg = (j.error && j.error.message) || ('HTTP ' + r.status);
      throw new Error(msg);
    }
    return j;
  }
  const titles = async (key, id) => ((await api(key, id + '?fields=sheets.properties.title')).sheets || []).map((s) => s.properties.title);
  const batch = async (key, id, ranges) => {
    if (!ranges.length) return [];
    const j = await api(key, id + '/values:batchGet?' + ranges.map((r) => 'ranges=' + encodeURIComponent(r)).join('&'));
    return (j.valueRanges || []).map((v) => v.values || []);
  };

  // ---------- tanggal, umur, alasan ----------
  const dmyRaw = (s) => {
    s = String(s ?? '').trim();
    if (!s) return null;
    let m;
    if (/^\d{5}(\.\d+)?$/.test(s)) { const d = new Date(Date.UTC(1899, 11, 30) + Number(s) * 864e5); return { a: d.getUTCDate(), b: d.getUTCMonth() + 1, y: d.getUTCFullYear(), fix: true }; }
    if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return { a: +m[3], b: +m[2], y: +m[1], fix: true };
    if ((m = s.match(/^(\d{1,2})([-\/. ])(\d{1,2})[-\/. ](\d{2,4})/))) return { a: +m[1], b: +m[3], y: +m[4], fix: m[2] !== '/' };
    if ((m = s.match(/^(\d{1,2})[-\/. ]+([A-Za-z]{3,})[-\/., ]+(\d{2,4})/))) { const mo = MON[m[2].slice(0, 3).toUpperCase()]; return mo ? { a: +m[1], b: mo, y: +m[3], fix: true } : null; }
    if ((m = s.match(/^([A-Za-z]{3,})[ ]+(\d{1,2}),?[ ]+(\d{4})/))) { const mo = MON[m[1].slice(0, 3).toUpperCase()]; return mo ? { a: +m[2], b: mo, y: +m[3], fix: true } : null; }
    return null;
  };
  // Format garis miring (dd/mm vs mm/dd) ditentukan dari mayoritas kolom.
  const resolveDates = (vals) => {
    const raws = vals.map(dmyRaw);
    let dmy = 0, mdy = 0;
    raws.forEach((r) => { if (r && !r.fix) { if (r.a > 12 && r.b <= 12) dmy++; else if (r.b > 12 && r.a <= 12) mdy++; } });
    const mode = mdy > dmy ? 'mdy' : 'dmy';
    return raws.map((r) => {
      if (!r) return null;
      const mdy = !r.fix && (r.a > 12 ? false : r.b > 12 ? true : mode === 'mdy');
      const mo = mdy ? r.a : r.b;
      const dd = mdy ? r.b : r.a;
      const y = r.y < 100 ? 2000 + r.y : r.y;
      if (!(mo >= 1 && mo <= 12) || y < 2015 || y > 2035) return null;
      const ok = dd >= 1 && dd <= 31;
      return y + '-' + String(mo).padStart(2, '0') + (ok ? '-' + String(dd).padStart(2, '0') : '');
    });
  };
  const tahunOf = (v) => { const m = String(v ?? '').match(/(19[5-9]\d|20[0-3]\d)/); return m ? +m[1] : null; };
  const kelompok = (s) => {
    const t = norm(s);
    if (!t || t === '-') return 'Tanpa keterangan';
    if (/TERBAKAR|PETIR|HANGUS|MELELEH/.test(t)) return 'Terbakar / tersambar petir';
    if (/MACET|TIDAK BERPUTAR|TDK BERPUTAR|EDRUM|E-DRUM|BERHENTI/.test(t)) return 'Meter macet';
    if (/BURAM|LCD|DISPLAY|BLANK|LAYAR|MATI/.test(t)) return 'Display buram / mati';
    if (/TUA/.test(t)) return 'Meter tua';
    if (/KEYPAD|TOKEN|KWH|KREDIT|RELAY|TAMPER|TEMPER|PERIKSA|ERROR|EROR|PERIODIK|KCT/.test(t)) return 'Gangguan fungsi prabayar';
    if (/RUSAK|PECAH|COVER|TERMINAL|SEGEL|HILANG|DICURI/.test(t)) return 'Meter rusak fisik';
    if (/P2TL/.test(t)) return 'Eks P2TL';
    if (/BOX|PANEL|PASANG|PEMASANGAN/.test(t)) return 'Pekerjaan box / pasang baru';
    return 'Lainnya';
  };
  const cluster = (u) => (u == null ? 'Tahun tidak tercatat' : u < 5 ? '< 5 tahun' : u < 10 ? '5 – < 10 tahun' : u < 15 ? '10 – < 15 tahun' : '≥ 15 tahun');

  // ---------- kolom dikenali dari judul ----------
  const findHeader = (rows) => { for (let i = 0; i < rows.length; i++) if ((rows[i] || []).some((c) => norm(c) === 'IDPEL')) return i; return -1; };
  const mapCols = (H, S) => {
    const h = (H || []).map(norm), s = (S || []).map(norm);
    const idx = (f) => h.findIndex(f);
    const c = {};
    c.idpel = idx((x) => x === 'IDPEL');
    c.tgl = idx((x) => x.startsWith('TANGGAL PENGGANTIAN') || x.startsWith('TANGGAL PERIKSA') || x.startsWith('TGL PENGGANTIAN'));
    c.tglIn = idx((x) => x.startsWith('TANGGAL INPUT'));
    const L0 = idx((x) => x === 'METER LAMA');
    c.tahun = -1; c.merk = -1;
    if (L0 >= 0) {
      let end = Math.max(h.length, s.length);
      for (let j = L0 + 1; j < Math.max(h.length, s.length); j++) if (h[j]) { end = j; break; }
      for (let j = L0; j < end; j++) { if (s[j] === 'TAHUN' && c.tahun < 0) c.tahun = j; if (s[j] === 'MERK' && c.merk < 0) c.merk = j; }
    }
    c.alasan = idx((x) => x.startsWith('ALASAN'));
    const after = Math.max(c.alasan, c.tgl);
    c.ket = h.findIndex((x, j) => x === 'KETERANGAN' && j > after);
    if (c.ket < 0) c.ket = h.findIndex((x, j) => x === 'KET' && j > after);
    return c;
  };
  const KEYS = ['idpel', 'tgl', 'tglIn', 'tahun', 'merk', 'alasan', 'ket'];
  const buildRows = (kategori, cols) => {
    const n = Math.max(0, ...KEYS.map((k) => cols[k].length));
    const dates = resolveDates(Array.from({ length: n }, (_, i) => (cols.tgl[i] ?? '') || (cols.tglIn[i] ?? '')));
    const out = [];
    for (let i = 0; i < n; i++) {
      const id = String(cols.idpel[i] ?? '').replace(/\s/g, '');
      if (!/^\d{6,}$/.test(id)) continue;
      const tgl = dates[i] || '';
      const bulan = tgl.slice(0, 7);
      const th = tahunOf(cols.tahun[i]);
      const ref = bulan ? +bulan.slice(0, 4) : new Date().getFullYear();
      let us = th == null ? null : ref - th;
      if (us != null && us < 0) us = null;
      const al = String(cols.alasan[i] ?? '').replace(/\s+/g, ' ').trim();
      const kt = String(cols.ket[i] ?? '').replace(/\s+/g, ' ').trim();
      const raw = al && al !== '-' ? al : kt;
      out.push({ kategori, jenis: 'Meter', bulan: bulan || '', tanggal: tgl.length === 10 ? tgl : '', tahun_meter: th, usia: us, cluster_usia: cluster(us), alasan: raw ? raw.toUpperCase() : '(KOSONG)', kelompok_alasan: kelompok(raw), merk_lama: norm(cols.merk[i]) || '-', pekerjaan: '', volume: 1 });
    }
    return out;
  };
  const colsFrom2D = (data, c) => { const o = {}; KEYS.forEach((k) => { o[k] = data.map((r) => (c[k] >= 0 ? (r || [])[c[k]] ?? '' : '')); }); return o; };

  const parseBox = (all) => {
    const rows = [];
    let pk = null;
    for (let i = 0; i < all.length; i++) {
      const r = (all[i] || []).map(norm);
      if (r.includes('PEKERJAAN') && r.includes('VOLUME')) { pk = { p: r.indexOf('PEKERJAAN'), v: r.indexOf('VOLUME') }; continue; }
      if (r.includes('IDPEL')) { pk = null; continue; }
      if (!pk) continue;
      const job = String(all[i][pk.p] ?? '').replace(/\s+/g, ' ').trim();
      const vol = Number(String(all[i][pk.v] ?? '').replace(',', '.'));
      if (!job || !(vol > 0)) continue;
      const J = job.toUpperCase();
      const jenis = /BONGKAR/.test(J) ? 'Bongkar' : /BOX/.test(J) ? 'Box' : /KWH|METER/.test(J) ? 'kWh meter' : 'Lainnya';
      rows.push({ kategori: 'BOX COMBO', jenis, bulan: '', tahun_meter: null, usia: null, cluster_usia: cluster(null), alasan: '', kelompok_alasan: '', merk_lama: '', pekerjaan: J, volume: vol });
    }
    const h = findHeader(all);
    if (h >= 0) buildRows('BOX COMBO', colsFrom2D(all.slice(h + 2), mapCols(all[h], all[h + 1]))).forEach((r) => { r.jenis = 'kWh meter (pelanggan)'; rows.push(r); });
    return rows;
  };

  const parseRab = (rows) => {
    const num = (v) => { const d = String(v ?? '').replace(/[^0-9]/g, ''); return d ? Number(d) : 0; };
    const out = { volume_1p: 0, volume_3p: 0, volume_apkt_1p: 0, rab_realisasi_1p: 0, rab_realisasi_3p: 0, nilai_rab_ppn: 0, nilai_realisasi_ppn: 0, jumlah_biaya: 0, jumlah_biaya_real: 0 };
    let seksi = '';
    for (const r of rows) {
      const t = (r || []).join(' ').replace(/\s+/g, ' ').toUpperCase().trim();
      if (/PEKERJAAN LOKET|APKT/.test(t) && !/MENYETEL/.test(t)) seksi = 'apkt';
      else if (t === 'PEKERJAAN METER') seksi = 'meter';
      if (/MENYETEL.*1 PHASE/.test(t)) {
        if (seksi === 'apkt') out.volume_apkt_1p += num(r[4]);
        else if (!out.volume_1p) { out.volume_1p = num(r[4]); out.rab_realisasi_1p = num(r[8]); }
      } else if (/MENYETEL.*3 PHASA/.test(t) && !out.volume_3p) { out.volume_3p = num(r[4]); out.rab_realisasi_3p = num(r[8]); }
      else if (/JUMLAH BIAYA/.test(t) && !out.jumlah_biaya) { out.jumlah_biaya = num(r[7]); out.jumlah_biaya_real = num(r[9]); }
      else if (/TOTAL \+ PPN/.test(t) && !out.nilai_rab_ppn) { out.nilai_rab_ppn = num(r[7]); out.nilai_realisasi_ppn = num(r[9]); }
    }
    out.target_kwh = out.volume_1p + out.volume_3p;
    return [out];
  };

  const parseTagihan = (rows) => {
    const s = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
    const num = (v) => { const d = String(v ?? '').replace(/[^0-9]/g, ''); return d ? Number(d) : null; };
    const out = [];
    let cur = null;
    for (const r of rows) {
      const nomor = s(r[2]);
      if (nomor && /\//.test(nomor)) {
        cur = { nomor_kontrak: nomor, nama_kontrak: s(r[1]), pelaksana: s(r[3]).toUpperCase(), tanggal_awal: s(r[6]), tanggal_akhir_awal: s(r[7]), tanggal_akhir: s(r[7]),
          jumlah_amandemen: s(r[9]) && s(r[9]) !== '-' ? 1 : 0, amandemen_terakhir: s(r[9]) === '-' ? '' : s(r[9]),
          nilai_kontrak: num(r[13]), nilai_realisasi_spj: num(r[11]), tagihan_terakhir: s(r[16]), total_tagihan: num(r[17]) || 0, keterangan: s(r[19]) };
        out.push(cur);
        continue;
      }
      if (!cur || s(r[0]) || s(r[1])) { if (s(r[1])) cur = null; continue; }
      if (s(r[7])) cur.tanggal_akhir = s(r[7]);
      if (s(r[9]) && s(r[9]) !== '-') { cur.jumlah_amandemen += 1; cur.amandemen_terakhir = s(r[9]); }
      if (s(r[16])) cur.tagihan_terakhir = s(r[16]);
      if (num(r[17])) cur.total_tagihan += num(r[17]);
      if (s(r[19])) cur.keterangan = s(r[19]);
    }
    return out;
  };

  // Satu spreadsheet pelaksana: 3 permintaan (judul sheet, header, kolom yang dipakai + RAB + BOX COMBO).
  async function bacaPelaksana(key, id) {
    const t = await titles(key, id);
    const sheets = t.map((title) => ({ title, kat: KAT.find((k) => norm(title) === k) })).filter((x) => x.kat);
    const meterSheets = sheets.filter((x) => x.kat !== 'BOX COMBO');
    const heads = await batch(key, id, meterSheets.map((x) => q(x.title) + '!A1:AF8'));
    const plan = [];
    const ranges = [];
    meterSheets.forEach((x, i) => {
      const h = findHeader(heads[i]);
      if (h < 0) return;
      const c = mapCols(heads[i][h], heads[i][h + 1]);
      const start = h + 3;
      const p = { kat: x.kat, idx: {} };
      KEYS.forEach((k) => { if (c[k] >= 0) { p.idx[k] = ranges.length; ranges.push(q(x.title) + '!' + colL(c[k]) + start + ':' + colL(c[k])); } });
      plan.push(p);
    });
    const box = sheets.find((x) => x.kat === 'BOX COMBO');
    const iBox = box ? ranges.push(q(box.title) + '!A1:AC') - 1 : -1;
    const iRab = t.includes('RAB') ? ranges.push('RAB!A1:J40') - 1 : -1;
    const vals = await batch(key, id, ranges);
    const rows = [];
    plan.forEach((p) => {
      const cols = {};
      KEYS.forEach((k) => { cols[k] = p.idx[k] == null ? [] : vals[p.idx[k]].map((r) => (r || [])[0] ?? ''); });
      buildRows(p.kat, cols).forEach((r) => rows.push(r));
    });
    if (iBox >= 0) parseBox(vals[iBox]).forEach((r) => rows.push(r));
    return { rows, rab: iRab >= 0 ? parseRab(vals[iRab]) : [{}], sheets: sheets.map((x) => x.title) };
  }

  // Status pembayaran terakhir dari sheet PROGRES PEK (tabel KONTRAK MURNI), digabung ke data kontrak.
  const parseProgres = (rows) => {
    const o = {};
    (rows || []).forEach((r) => {
      const no = String((r || [])[0] || '').trim();
      if (/^\d{3,4}\.[A-Za-z]+\//.test(no)) o[no] = String(r[9] || '').trim();
    });
    return o;
  };
  async function bacaTagihan(key, id, range) {
    let v, p = [];
    try { [v, p] = await batch(key, id, [range, "'PROGRES PEK'!A1:K150"]); } catch (e) { [v] = await batch(key, id, [range]); }
    const st = parseProgres(p);
    return parseTagihan(v).map((k) => ({ ...k, status_pembayaran: st[k.nomor_kontrak] || '' }));
  }

  window.SUMBER = { bacaPelaksana, bacaTagihan };
})();
