dash.calc('rekap_kategori', {
  inputs: ['m_anggada', 'm_jati', 'm_dhana', 'm_hafiz'],
  title: 'Realisasi per kategori',
  description: 'Jumlah pelanggan tercatat per sheet; BOX COMBO dihitung dari volume pekerjaan box terpasang.',
  fn: (m_anggada, m_jati, m_dhana, m_hafiz) => {
    const KAT = ['PASKA 1 PHASA', 'PRABAYAR 1 PHASA', 'PRABAYAR 3 PHASA', 'PERIKSA', 'METER BOX', 'BOX COMBO'];
    const src = { ANGGADA: m_anggada, JATI: m_jati, DHANA: m_dhana, HAFIZ: m_hafiz };
    const out = [];
    const tot = {};
    for (const [k, rows] of Object.entries(src)) {
      for (const kat of KAT) {
        const r = rows.filter((x) => x.kategori === kat);
        const realisasi = kat === 'BOX COMBO'
          ? r.filter((x) => x.jenis === 'Box').reduce((s, x) => s + Number(x.volume || 0), 0)
          : r.filter((x) => x.jenis === 'Meter').length;
        const kwh_di_box = kat === 'BOX COMBO' ? r.filter((x) => /kWh/.test(x.jenis)).reduce((s, x) => s + Number(x.volume || 0), 0) : 0;
        out.push({ kontraktor: k, kategori: kat, realisasi, kwh_di_box });
        tot[kat] = tot[kat] || { realisasi: 0, kwh_di_box: 0 };
        tot[kat].realisasi += realisasi; tot[kat].kwh_di_box += kwh_di_box;
      }
    }
    for (const kat of KAT) out.push({ kontraktor: 'SEMUA', kategori: kat, realisasi: tot[kat].realisasi, kwh_di_box: tot[kat].kwh_di_box });
    return out;
  },
});

dash.calc('rekap_usia', {
  inputs: ['m_anggada', 'm_jati', 'm_dhana', 'm_hafiz'],
  title: 'Cluster umur meter lama',
  description: 'Umur = tahun penggantian dikurangi tahun pembuatan meter lama; PENGGANTIAN KWH = Paska 1P + Prabayar 1P + Prabayar 3P.',
  fn: (m_anggada, m_jati, m_dhana, m_hafiz) => {
    const src = { ANGGADA: m_anggada, JATI: m_jati, DHANA: m_dhana, HAFIZ: m_hafiz };
    const GANTI = ['PASKA 1 PHASA', 'PRABAYAR 1 PHASA', 'PRABAYAR 3 PHASA'];
    const CL = ['< 10 tahun', '10 – < 15 tahun', '≥ 15 tahun', 'Tahun tidak tercatat'];
    const KAT = ['PENGGANTIAN KWH', ...GANTI, 'PERIKSA', 'METER BOX'];
    const acc = {};
    const add = (k, kat, cl, u) => {
      const key = k + '|' + kat + '|' + cl;
      acc[key] = acc[key] || { kontraktor: k, kategori: kat, cluster_usia: cl, jumlah: 0, total_usia: 0 };
      acc[key].jumlah += 1; if (u != null && u !== '') acc[key].total_usia += Number(u);
    };
    for (const [k, rows] of Object.entries(src)) {
      for (const r of rows) {
        if (r.jenis !== 'Meter') continue;
        for (const kk of [k, 'SEMUA']) {
          add(kk, r.kategori, r.cluster_usia, r.usia);
          if (GANTI.includes(r.kategori)) add(kk, 'PENGGANTIAN KWH', r.cluster_usia, r.usia);
        }
      }
    }
    const out = [];
    for (const k of ['SEMUA', ...Object.keys(src)]) for (const kat of KAT) for (const cl of CL) {
      const a = acc[k + '|' + kat + '|' + cl];
      out.push({ kontraktor: k, kategori: kat, cluster_usia: cl, jumlah: a ? a.jumlah : 0, rata_usia: a && cl !== CL[3] && a.jumlah ? Math.round((a.total_usia / a.jumlah) * 10) / 10 : null });
    }
    return out;
  },
});

dash.calc('rekap_alasan', {
  inputs: ['m_anggada', 'm_jati', 'm_dhana', 'm_hafiz'],
  title: 'Kelompok alasan × umur',
  description: 'Alasan ganti meter (kolom ALASAN, bila kosong kolom KETERANGAN) dikelompokkan, dipecah per cluster umur.',
  fn: (m_anggada, m_jati, m_dhana, m_hafiz) => {
    const src = { ANGGADA: m_anggada, JATI: m_jati, DHANA: m_dhana, HAFIZ: m_hafiz };
    const GANTI = ['PASKA 1 PHASA', 'PRABAYAR 1 PHASA', 'PRABAYAR 3 PHASA'];
    const acc = {};
    for (const [k, rows] of Object.entries(src)) for (const r of rows) {
      if (r.jenis !== 'Meter' || !GANTI.includes(r.kategori)) continue;
      for (const kk of [k, 'SEMUA']) for (const kat of [r.kategori, 'PENGGANTIAN KWH']) {
        const key = kk + '|' + kat + '|' + r.kelompok_alasan;
        const a = acc[key] = acc[key] || { kontraktor: kk, kategori: kat, kelompok_alasan: r.kelompok_alasan, jumlah: 0, usia_lt10: 0, usia_10_15: 0, usia_ge15: 0, usia_na: 0 };
        a.jumlah += 1;
        if (r.cluster_usia === '< 10 tahun') a.usia_lt10 += 1;
        else if (r.cluster_usia === '10 – < 15 tahun') a.usia_10_15 += 1;
        else if (r.cluster_usia === '≥ 15 tahun') a.usia_ge15 += 1;
        else a.usia_na += 1;
      }
    }
    return Object.values(acc).sort((a, b) => b.jumlah - a.jumlah);
  },
});

dash.calc('rekap_alasan_detail', {
  inputs: ['m_anggada', 'm_jati', 'm_dhana', 'm_hafiz'],
  title: 'Alasan penggantian (rinci)',
  description: 'Teks alasan seperti tertulis di sheet (huruf besar), dihitung per kategori, dengan rata-rata umur meter lama.',
  fn: (m_anggada, m_jati, m_dhana, m_hafiz) => {
    const src = { ANGGADA: m_anggada, JATI: m_jati, DHANA: m_dhana, HAFIZ: m_hafiz };
    const COL = { 'PASKA 1 PHASA': 'paska_1p', 'PRABAYAR 1 PHASA': 'prabayar_1p', 'PRABAYAR 3 PHASA': 'prabayar_3p' };
    const acc = {};
    for (const [k, rows] of Object.entries(src)) for (const r of rows) {
      if (r.jenis !== 'Meter' || !COL[r.kategori]) continue;
      for (const kk of [k, 'SEMUA']) {
        const key = kk + '|' + r.alasan;
        const a = acc[key] = acc[key] || { kontraktor: kk, alasan: r.alasan, kelompok_alasan: r.kelompok_alasan, jumlah: 0, paska_1p: 0, prabayar_1p: 0, prabayar_3p: 0, n_usia: 0, total_usia: 0 };
        a.jumlah += 1; a[COL[r.kategori]] += 1;
        if (r.usia != null && r.usia !== '') { a.n_usia += 1; a.total_usia += Number(r.usia); }
      }
    }
    return Object.values(acc).map((a) => ({ kontraktor: a.kontraktor, alasan: a.alasan, kelompok_alasan: a.kelompok_alasan, jumlah: a.jumlah, paska_1p: a.paska_1p, prabayar_1p: a.prabayar_1p, prabayar_3p: a.prabayar_3p, rata_usia: a.n_usia ? Math.round((a.total_usia / a.n_usia) * 10) / 10 : null })).sort((a, b) => b.jumlah - a.jumlah);
  },
});

dash.calc('rekap_bulan', {
  inputs: ['m_anggada', 'm_jati', 'm_dhana', 'm_hafiz'],
  title: 'Realisasi per bulan',
  description: 'Jumlah pelanggan per bulan tanggal penggantian/periksa (bila kosong, tanggal input); tanpa tanggal terbaca ditulis kosong.',
  fn: (m_anggada, m_jati, m_dhana, m_hafiz) => {
    const src = { ANGGADA: m_anggada, JATI: m_jati, DHANA: m_dhana, HAFIZ: m_hafiz };
    const acc = {};
    for (const [k, rows] of Object.entries(src)) for (const r of rows) {
      if (r.jenis !== 'Meter') continue;
      for (const kk of [k, 'SEMUA']) {
        const key = kk + '|' + r.bulan + '|' + r.kategori;
        acc[key] = acc[key] || { kontraktor: kk, bulan: r.bulan, kategori: r.kategori, jumlah: 0 };
        acc[key].jumlah += 1;
      }
    }
    return Object.values(acc).sort((a, b) => (a.bulan < b.bulan ? -1 : a.bulan > b.bulan ? 1 : 0));
  },
});

dash.calc('rekap_merk', {
  inputs: ['m_anggada', 'm_jati', 'm_dhana', 'm_hafiz'],
  title: 'Merk meter lama',
  description: 'Merk meter lama pada penggantian kWh, disatukan per nama pabrikan, dengan rata-rata umur.',
  fn: (m_anggada, m_jati, m_dhana, m_hafiz) => {
    const src = { ANGGADA: m_anggada, JATI: m_jati, DHANA: m_dhana, HAFIZ: m_hafiz };
    const GANTI = ['PASKA 1 PHASA', 'PRABAYAR 1 PHASA', 'PRABAYAR 3 PHASA'];
    const KNOWN = ['SMART', 'ITRON', 'HEXING', 'MELCOINDA', 'METBELOSA', 'WASION', 'OTHO', 'SANXING', 'LANDIS', 'GLOMET', 'EDMI', 'SCHLUMBERGER', 'FUJI', 'STAR', 'INHEMETER', 'HOLLEY', 'KAIFA', 'LINYANG', 'CONLOG', 'ACTARIS', 'ELSTER', 'MITSUBISHI', 'MIZUMI', 'BRANSTEN', 'TRIO'];
    const merk = (m) => {
      const t = String(m || '').toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
      if (!t || t === '-' || /^\d+$/.test(t.replace(/ /g, ''))) return 'Tidak terbaca';
      const flat = t.replace(/ /g, '');
      const hit = KNOWN.find((k) => flat.startsWith(k));
      if (hit) return hit === 'SMART' ? 'SMART METER' : hit;
      return t.split(' ')[0];
    };
    const acc = {};
    for (const [k, rows] of Object.entries(src)) for (const r of rows) {
      if (r.jenis !== 'Meter' || !GANTI.includes(r.kategori)) continue;
      const m = merk(r.merk_lama);
      for (const kk of [k, 'SEMUA']) {
        const key = kk + '|' + m;
        const a = acc[key] = acc[key] || { kontraktor: kk, merk: m, jumlah: 0, n: 0, t: 0 };
        a.jumlah += 1; if (r.usia != null && r.usia !== '') { a.n += 1; a.t += Number(r.usia); }
      }
    }
    return Object.values(acc).map((a) => ({ kontraktor: a.kontraktor, merk: a.merk, jumlah: a.jumlah, rata_usia: a.n ? Math.round((a.t / a.n) * 10) / 10 : null })).sort((a, b) => b.jumlah - a.jumlah);
  },
});

dash.calc('capaian', {
  inputs: ['kontrak', 'rab_anggada', 'rab_jati', 'rab_dhana', 'rab_hafiz', 'rekap_kategori', 'rekap_bulan'],
  title: 'Capaian per kontrak',
  description: 'Target = volume RAB montage kWh 1 phasa + 3 phasa; realisasi kWh = Paska 1P + Prabayar 1P + Prabayar 3P; data kontrak dari LIST TAGIHAN.',
  fn: (kontrak, rab_anggada, rab_jati, rab_dhana, rab_hafiz, rekap_kategori, rekap_bulan) => {
    const SPJ = { ANGGADA: '0032.', JATI: '0033.', DHANA: '0034.', HAFIZ: '0035.' };
    const RAB = { ANGGADA: rab_anggada[0] || {}, JATI: rab_jati[0] || {}, DHANA: rab_dhana[0] || {}, HAFIZ: rab_hafiz[0] || {} };
    const real = (k, kat) => Number((rekap_kategori.find((r) => r.kontraktor === k && r.kategori === kat) || {}).realisasi || 0);
    const ym = (d) => { const m = String(d || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); return m ? m[3] + '-' + m[2].padStart(2, '0') : ''; };
    const out = [];
    for (const k of Object.keys(SPJ)) {
      const c = kontrak.find((r) => String(r.nomor_kontrak || '').startsWith(SPJ[k]) && /PJ/i.test(r.nomor_kontrak)) || {};
      const rab = RAB[k];
      const mulai = ym(c.tanggal_awal);
      const sebelum = mulai ? rekap_bulan.filter((r) => r.kontraktor === k && r.bulan && r.bulan < mulai && ['PASKA 1 PHASA', 'PRABAYAR 1 PHASA', 'PRABAYAR 3 PHASA'].includes(r.kategori)).reduce((s, r) => s + Number(r.jumlah), 0) : 0;
      const row = {
        kontraktor: k, lot: (String(c.nama_kontrak || '').match(/LOT\s*(\d+)/i) || [])[1] || '', pelaksana: c.pelaksana || '', nomor_kontrak: c.nomor_kontrak || '',
        tanggal_awal: c.tanggal_awal || '', tanggal_akhir: c.tanggal_akhir || '', jumlah_amandemen: c.jumlah_amandemen || 0,
        nilai_kontrak: c.nilai_kontrak || 0, total_tagihan: c.total_tagihan || 0, tagihan_terakhir: c.tagihan_terakhir || '',
        target_1p: Number(rab.volume_1p || 0), target_3p: Number(rab.volume_3p || 0), target_kwh: Number(rab.target_kwh || 0),
        paska_1p: real(k, 'PASKA 1 PHASA'), prabayar_1p: real(k, 'PRABAYAR 1 PHASA'), prabayar_3p: real(k, 'PRABAYAR 3 PHASA'),
        periksa: real(k, 'PERIKSA'), meter_box: real(k, 'METER BOX'), box_combo: real(k, 'BOX COMBO'),
        realisasi_rab: Number(rab.rab_realisasi_1p || 0) + Number(rab.rab_realisasi_3p || 0), sebelum_spj: sebelum,
      };
      row.realisasi_1p = row.paska_1p + row.prabayar_1p;
      row.realisasi_kwh = row.realisasi_1p + row.prabayar_3p;
      row.persen = row.target_kwh ? row.realisasi_kwh / row.target_kwh : null;
      row.selisih = row.realisasi_kwh - row.target_kwh;
      out.push(row);
    }
    const sum = (f) => out.reduce((s, r) => s + Number(r[f] || 0), 0);
    const all = { kontraktor: 'SEMUA', lot: '', pelaksana: 'TOTAL 4 KONTRAK', nomor_kontrak: '', tanggal_awal: '', tanggal_akhir: '', jumlah_amandemen: sum('jumlah_amandemen') };
    for (const f of ['nilai_kontrak', 'total_tagihan', 'target_1p', 'target_3p', 'target_kwh', 'paska_1p', 'prabayar_1p', 'prabayar_3p', 'periksa', 'meter_box', 'box_combo', 'realisasi_rab', 'sebelum_spj', 'realisasi_1p', 'realisasi_kwh', 'selisih']) all[f] = sum(f);
    all.tagihan_terakhir = '';
    all.persen = all.target_kwh ? all.realisasi_kwh / all.target_kwh : null;
    out.push(all);
    return out;
  },
});
