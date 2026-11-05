// Perhitungan rekap. Setiap fungsi menerima ctx:
//   ctx.list    : kontrak yang sudah dimuat [{id, key, tahun, lot, nama, spj}]
//   ctx.src     : {id: baris data lapangan}
//   ctx.rab     : {id: ringkasan RAB}
//   ctx.kontrak : baris LIST TAGIHAN
//   ctx.get(id) : hasil rekap lain
// Baris gabungan per tahun memakai kontraktor = 'SEMUA-<tahun>'.
(() => {
  const GANTI = ['PASKA 1 PHASA', 'PRABAYAR 1 PHASA', 'PRABAYAR 3 PHASA'];
  const KAT = ['PASKA 1 PHASA', 'PRABAYAR 1 PHASA', 'PRABAYAR 3 PHASA', 'PERIKSA', 'METER BOX', 'BOX COMBO'];
  const CL = ['< 5 tahun', '5 – < 10 tahun', '10 – < 15 tahun', '≥ 15 tahun', 'Tahun tidak tercatat'];
  const FLD = ['usia_lt5', 'usia_5_10', 'usia_10_15', 'usia_ge15', 'usia_na'];
  const fieldOf = (cl) => FLD[Math.max(0, CL.indexOf(cl))] || 'usia_na';
  const zero = () => Object.fromEntries(FLD.map((f) => [f, 0]));
  const KNOWN = ['SMART', 'ITRON', 'HEXING', 'MELCOINDA', 'METBELOSA', 'WASION', 'OTHO', 'SANXING', 'LANDIS', 'GLOMET', 'EDMI', 'SCHLUMBERGER', 'FUJI', 'STAR', 'INHEMETER', 'HOLLEY', 'KAIFA', 'LINYANG', 'CONLOG', 'ACTARIS', 'ELSTER', 'MITSUBISHI', 'MIZUMI', 'BRANSTEN', 'TRIO', 'SMAR'];
  const merk = (m) => {
    const t = String(m || '').toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!t || /^\d+$/.test(t.replace(/ /g, ''))) return 'Tidak terbaca';
    const flat = t.replace(/ /g, '');
    const hit = KNOWN.find((k) => flat.startsWith(k));
    if (hit) return hit === 'SMART' || hit === 'SMAR' ? 'SMART METER' : hit;
    return t.split(' ')[0];
  };
  const semua = (c) => 'SEMUA-' + c.tahun;
  const keys = (c) => [c.id, semua(c)];
  const each = (ctx, fn) => ctx.list.forEach((c) => (ctx.src[c.id] || []).forEach((r) => fn(c, r)));
  const allKeys = (ctx) => {
    const ks = [];
    ctx.list.forEach((c) => { ks.push(c.id); if (!ks.includes(semua(c))) ks.push(semua(c)); });
    return ks;
  };

  dash.calc('rekap_kategori', {
    title: 'Realisasi per kategori',
    fn: (ctx) => {
      const acc = {};
      allKeys(ctx).forEach((k) => KAT.forEach((kat) => { acc[k + '|' + kat] = { kontraktor: k, kategori: kat, realisasi: 0, kwh_di_box: 0 }; }));
      each(ctx, (c, r) => keys(c).forEach((k) => {
        const a = acc[k + '|' + r.kategori]; if (!a) return;
        if (r.kategori === 'BOX COMBO') {
          if (r.jenis === 'Box') a.realisasi += Number(r.volume || 0);
          else if (/kWh/.test(r.jenis)) a.kwh_di_box += Number(r.volume || 0);
        } else if (r.jenis === 'Meter') a.realisasi += 1;
      }));
      return Object.values(acc);
    },
  });

  dash.calc('rekap_usia', {
    title: 'Cluster umur meter lama',
    fn: (ctx) => {
      const acc = {};
      const add = (k, kat, cl, u) => {
        const key = k + '|' + kat + '|' + cl;
        const a = acc[key] = acc[key] || { kontraktor: k, kategori: kat, cluster_usia: cl, jumlah: 0, t: 0 };
        a.jumlah += 1; if (u != null && u !== '') a.t += Number(u);
      };
      each(ctx, (c, r) => {
        if (r.jenis !== 'Meter') return;
        keys(c).forEach((k) => { add(k, r.kategori, r.cluster_usia, r.usia); if (GANTI.includes(r.kategori)) add(k, 'PENGGANTIAN KWH', r.cluster_usia, r.usia); });
      });
      const out = [];
      allKeys(ctx).forEach((k) => ['PENGGANTIAN KWH', ...GANTI, 'PERIKSA', 'METER BOX'].forEach((kat) => CL.forEach((cl) => {
        const a = acc[k + '|' + kat + '|' + cl];
        out.push({ kontraktor: k, kategori: kat, cluster_usia: cl, jumlah: a ? a.jumlah : 0, rata_usia: a && cl !== CL[4] && a.jumlah ? Math.round((a.t / a.jumlah) * 10) / 10 : null });
      })));
      return out;
    },
  });

  dash.calc('rekap_alasan', {
    title: 'Kelompok alasan × umur',
    fn: (ctx) => {
      const acc = {};
      each(ctx, (c, r) => {
        if (r.jenis !== 'Meter' || !GANTI.includes(r.kategori)) return;
        keys(c).forEach((k) => [r.kategori, 'PENGGANTIAN KWH'].forEach((kat) => {
          const key = k + '|' + kat + '|' + r.kelompok_alasan;
          const a = acc[key] = acc[key] || { kontraktor: k, kategori: kat, kelompok_alasan: r.kelompok_alasan, jumlah: 0, ...zero() };
          a.jumlah += 1;
          a[fieldOf(r.cluster_usia)] += 1;
        }));
      });
      return Object.values(acc).sort((a, b) => b.jumlah - a.jumlah);
    },
  });

  dash.calc('rekap_alasan_detail', {
    title: 'Alasan penggantian (rinci)',
    fn: (ctx) => {
      const COL = { 'PASKA 1 PHASA': 'paska_1p', 'PRABAYAR 1 PHASA': 'prabayar_1p', 'PRABAYAR 3 PHASA': 'prabayar_3p' };
      const acc = {};
      each(ctx, (c, r) => {
        if (r.jenis !== 'Meter' || !COL[r.kategori]) return;
        keys(c).forEach((k) => {
          const key = k + '|' + r.alasan;
          const a = acc[key] = acc[key] || { kontraktor: k, alasan: r.alasan, kelompok_alasan: r.kelompok_alasan, jumlah: 0, paska_1p: 0, prabayar_1p: 0, prabayar_3p: 0, n: 0, t: 0 };
          a.jumlah += 1; a[COL[r.kategori]] += 1;
          if (r.usia != null && r.usia !== '') { a.n += 1; a.t += Number(r.usia); }
        });
      });
      return Object.values(acc).map((a) => ({ kontraktor: a.kontraktor, alasan: a.alasan, kelompok_alasan: a.kelompok_alasan, jumlah: a.jumlah, paska_1p: a.paska_1p, prabayar_1p: a.prabayar_1p, prabayar_3p: a.prabayar_3p, rata_usia: a.n ? Math.round((a.t / a.n) * 10) / 10 : null })).sort((a, b) => b.jumlah - a.jumlah);
    },
  });

  dash.calc('rekap_bulan', {
    title: 'Realisasi per bulan',
    fn: (ctx) => {
      const acc = {};
      each(ctx, (c, r) => {
        if (r.jenis !== 'Meter') return;
        keys(c).forEach((k) => {
          const key = k + '|' + r.bulan + '|' + r.kategori;
          acc[key] = acc[key] || { kontraktor: k, bulan: r.bulan, kategori: r.kategori, jumlah: 0 };
          acc[key].jumlah += 1;
        });
      });
      return Object.values(acc).sort((a, b) => (a.bulan < b.bulan ? -1 : a.bulan > b.bulan ? 1 : 0));
    },
  });

  dash.calc('rekap_merk', {
    title: 'Merk meter lama',
    fn: (ctx) => {
      const acc = {};
      each(ctx, (c, r) => {
        if (r.jenis !== 'Meter' || !GANTI.includes(r.kategori)) return;
        const m = merk(r.merk_lama);
        keys(c).forEach((k) => {
          const a = acc[k + '|' + m] = acc[k + '|' + m] || { kontraktor: k, merk: m, jumlah: 0, n: 0, t: 0, ...zero(), tertua: null };
          a.jumlah += 1; if (r.usia != null && r.usia !== '') { a.n += 1; a.t += Number(r.usia); }
          a[fieldOf(r.cluster_usia)] += 1;
          if (r.tahun_meter && (a.tertua == null || Number(r.tahun_meter) < a.tertua)) a.tertua = Number(r.tahun_meter);
        });
      });
      return Object.values(acc).map((a) => ({ kontraktor: a.kontraktor, merk: a.merk, jumlah: a.jumlah, ...Object.fromEntries(FLD.map((f) => [f, a[f]])), tahun_tertua: a.tertua, rata_usia: a.n ? Math.round((a.t / a.n) * 10) / 10 : null })).sort((a, b) => b.jumlah - a.jumlah);
    },
  });

  dash.calc('rekap_penyebab', {
    title: 'Penyebab per umur & jenis',
    fn: (ctx) => {
      const COL = { 'PASKA 1 PHASA': 'paska_1p', 'PRABAYAR 1 PHASA': 'prabayar_1p', 'PRABAYAR 3 PHASA': 'prabayar_3p' };
      const acc = {};
      each(ctx, (c, r) => {
        if (r.jenis !== 'Meter' || !COL[r.kategori]) return;
        const m = merk(r.merk_lama);
        keys(c).forEach((k) => [r.cluster_usia, 'Semua umur'].forEach((cl) => {
          const key = k + '|' + cl + '|' + r.alasan;
          const a = acc[key] = acc[key] || { kontraktor: k, cluster_usia: cl, alasan: r.alasan, kelompok_alasan: r.kelompok_alasan, paska_1p: 0, prabayar_1p: 0, prabayar_3p: 0, n: 0, t: 0, mp: {}, mb: {} };
          a[COL[r.kategori]] += 1;
          if (r.usia != null && r.usia !== '') { a.n += 1; a.t += Number(r.usia); }
          const mm = r.kategori === 'PASKA 1 PHASA' ? a.mp : a.mb;
          mm[m] = (mm[m] || 0) + 1;
        }));
      });
      const top = (o) => { const e = Object.entries(o).sort((x, y) => y[1] - x[1])[0]; return e ? e[0] : ''; };
      return Object.values(acc).map((a) => ({
        kontraktor: a.kontraktor, cluster_usia: a.cluster_usia, alasan: a.alasan, kelompok_alasan: a.kelompok_alasan,
        paska_1p: a.paska_1p, prabayar_1p: a.prabayar_1p, prabayar_3p: a.prabayar_3p,
        paskabayar: a.paska_1p, prabayar: a.prabayar_1p + a.prabayar_3p, jumlah: a.paska_1p + a.prabayar_1p + a.prabayar_3p,
        merk_teratas_paska: top(a.mp), merk_teratas_prabayar: top(a.mb),
        rata_usia: a.n ? Math.round((a.t / a.n) * 10) / 10 : null,
      })).sort((x, y) => y.jumlah - x.jumlah);
    },
  });

  dash.calc('rekap_penyebab_merk', {
    title: 'Merk per umur & jenis',
    fn: (ctx) => {
      const acc = {};
      each(ctx, (c, r) => {
        if (r.jenis !== 'Meter' || !GANTI.includes(r.kategori)) return;
        const m = merk(r.merk_lama);
        const jn = r.kategori === 'PASKA 1 PHASA' ? 'paskabayar' : 'prabayar';
        keys(c).forEach((k) => [r.cluster_usia, 'Semua umur'].forEach((cl) => {
          const key = k + '|' + cl + '|' + m;
          const a = acc[key] = acc[key] || { kontraktor: k, cluster_usia: cl, merk: m, paskabayar: 0, prabayar: 0 };
          a[jn] += 1;
        }));
      });
      return Object.values(acc).map((a) => ({ ...a, jumlah: a.paskabayar + a.prabayar })).sort((x, y) => y.jumlah - x.jumlah);
    },
  });

  dash.calc('capaian', {
    title: 'Capaian per kontrak',
    fn: (ctx) => {
      const kat = ctx.get('rekap_kategori');
      const bul = ctx.get('rekap_bulan');
      const real = (k, kt) => Number((kat.find((r) => r.kontraktor === k && r.kategori === kt) || {}).realisasi || 0);
      const ym = (d) => { const m = String(d || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); return m ? m[3] + '-' + m[2].padStart(2, '0') : ''; };
      const out = [];
      ctx.list.forEach((cf) => {
        const c = ctx.kontrak.find((r) => String(r.nomor_kontrak || '').startsWith(cf.spj) && String(r.nomor_kontrak || '').endsWith('/' + cf.tahun)) || {};
        const rab = ctx.rab[cf.id] || {};
        const mulai = ym(c.tanggal_awal);
        const sebelum = mulai ? bul.filter((r) => r.kontraktor === cf.id && r.bulan && r.bulan < mulai && GANTI.includes(r.kategori)).reduce((s, r) => s + Number(r.jumlah), 0) : 0;
        const row = {
          kontraktor: cf.id, tahun: cf.tahun, lot: c.nama_kontrak ? ((String(c.nama_kontrak).match(/LOT\s*(\d+)/i) || [])[1] || String(cf.lot || '')) : String(cf.lot || ''),
          pelaksana: c.pelaksana || ('PT ' + cf.nama).toUpperCase(), nomor_kontrak: c.nomor_kontrak || '',
          tanggal_awal: c.tanggal_awal || '', tanggal_akhir: c.tanggal_akhir || '', tanggal_akhir_awal: c.tanggal_akhir_awal || '', jumlah_amandemen: c.jumlah_amandemen || 0,
          nilai_kontrak: c.nilai_kontrak || 0, total_tagihan: c.total_tagihan || 0, tagihan_terakhir: c.tagihan_terakhir || '',
          target_1p: Number(rab.volume_1p || 0), target_3p: Number(rab.volume_3p || 0), target_kwh: Number(rab.target_kwh || 0),
          paska_1p: real(cf.id, 'PASKA 1 PHASA'), prabayar_1p: real(cf.id, 'PRABAYAR 1 PHASA'), prabayar_3p: real(cf.id, 'PRABAYAR 3 PHASA'),
          periksa: real(cf.id, 'PERIKSA'), meter_box: real(cf.id, 'METER BOX'), box_combo: real(cf.id, 'BOX COMBO'),
          realisasi_rab: Number(rab.rab_realisasi_1p || 0) + Number(rab.rab_realisasi_3p || 0), sebelum_spj: sebelum,
          nilai_rab_ppn: Number(rab.nilai_rab_ppn || 0), nilai_realisasi_ppn: Number(rab.nilai_realisasi_ppn || 0),
        };
        row.realisasi_1p = row.paska_1p + row.prabayar_1p;
        row.realisasi_kwh = row.realisasi_1p + row.prabayar_3p;
        row.persen = row.target_kwh ? row.realisasi_kwh / row.target_kwh : null;
        row.selisih = row.realisasi_kwh - row.target_kwh;
        row.persen_rupiah = row.nilai_rab_ppn ? row.nilai_realisasi_ppn / row.nilai_rab_ppn : null;
        out.push(row);
      });
      const tahunList = Array.from(new Set(ctx.list.map((c) => c.tahun)));
      tahunList.forEach((th) => {
        const rs = out.filter((r) => r.tahun === th);
        const sum = (f) => rs.reduce((s, r) => s + Number(r[f] || 0), 0);
        const all = { kontraktor: 'SEMUA-' + th, tahun: th, lot: '', pelaksana: 'TOTAL ' + rs.length + ' KONTRAK ' + th, nomor_kontrak: '', tanggal_awal: '', tanggal_akhir: '', tagihan_terakhir: '' };
        ['jumlah_amandemen', 'nilai_kontrak', 'total_tagihan', 'target_1p', 'target_3p', 'target_kwh', 'paska_1p', 'prabayar_1p', 'prabayar_3p', 'periksa', 'meter_box', 'box_combo', 'realisasi_rab', 'sebelum_spj', 'realisasi_1p', 'realisasi_kwh', 'selisih', 'nilai_rab_ppn', 'nilai_realisasi_ppn'].forEach((f) => { all[f] = sum(f); });
        all.persen = all.target_kwh ? all.realisasi_kwh / all.target_kwh : null;
        all.persen_rupiah = all.nilai_rab_ppn ? all.nilai_realisasi_ppn / all.nilai_rab_ppn : null;
        out.push(all);
      });
      return out;
    },
  });
})();
