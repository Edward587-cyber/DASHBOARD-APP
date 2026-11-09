// Tab "Materi presentasi": menyusun slide Kinerja Dal APP (format slide 46–50 bahan Analisa Susut)
// dari data dashboard + isian form, lalu mengekspor ke PowerPoint (.pptx) atau PNG.
(() => {
  const nf = new Intl.NumberFormat('id-ID');
  const pf = (v, d = 2) => (v == null || !isFinite(v) ? '—' : new Intl.NumberFormat('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v * 100) + '%');
  const rp = (v) => 'Rp ' + nf.format(Math.round(v || 0));
  const $ = (s, r = document) => r.querySelector(s);
  const KEY = 'rp-materi-v1';
  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const BL = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
  const HB = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const LOGO = 'logo-pln.png?v=2';
  const C = { navy: '#0b2a5b', blue: '#1565c0', blue2: '#1e88e5', sky: '#29b6f6', red: '#e53935', orange: '#fb8c00', yellow: '#fbc02d', green: '#2e7d32', green2: '#43a047', grey: '#90a4ae', light: '#eef5fc', line: '#d6e4f3', text: '#1b2b40', muted: '#5b6b7f' };

  // ---------- data isian (tersimpan di browser ini) ----------
  const bawaan = () => ({
    periode: 'Oktober 2026',
    lbkb: {
      macet: { to: [4, 1, 5, 2, 0, 1, 2, 0], h1: [3, 1, 4, 2, 0, 1, 2, 0], gt: [1, 0, 1, 0, 0, 0, 0, 0] },
      buram: { to: [1, 0, 0, 0, 0, 0, 0, 0], h1: [1, 0, 0, 0, 0, 0, 0, 0], gt: [0, 0, 0, 0, 0, 0, 0, 0] },
      bulan: [[47, 40, 7], [153, 153, 4], [16, 15, 1], [47, 44, 5], [37, 33, 4], [57, 47, 10], [22, 22, 0], [56, 53, 3], [56, 56, 2], [16, 15, 1], ['', '', ''], ['', '', '']].map(([target, macet, buram]) => ({ target, macet, buram })),
      lesson: 'Penerimaan & Pengiriman TO koordinasi antara Cater dan APP update berkala.\nMemastikan TO dikerjakan maksimal H+1 jika terdapat kendala rumah kosong dll.\nUntuk wilayah kesatuan, perlunya dilengkapi surat pemberitahuan untuk dijadwalkan eksekusi.',
    },
    rkm: {
      targetTua: 8821, targetRusak: 5234,
      bulan: BL.map(() => ({ tTua: '', rTua: '', tRusak: '', rRusak: '' })),
      upaya: 'Evaluasi internal dengan koordinator mitra kerja.\nVerifikasi data meter tua dengan melakukan validasi DIL vs ACMT.\nMemastikan surat edaran dan sosialisasi pelanggan tidak lewat dari tanggal.\nPemberian TO ganti meter dilengkapi dengan titik koordinat.\nMeminta mitra kerja untuk menambah jumlah tenaga kerja.',
    },
    fso: { totalWo: 1311, viaFso: 1299, nonFso: 0, wwo: 12, target: 100, bulan: BL.map((_, i) => (i === 9 ? { total: 1311, via: 1299 } : { total: '', via: '' })), kendalaJudul: 'Aplikasi FSO bermasalah', kendala: 'Petugas mengalami kendala akses/koneksi pada aplikasi FSO sehingga perlu refreshment ulang penggunaan FSO.\nMenu FSO pada AP2T terkadang bermasalah.' },
    dok: { judul: 'Refreshment dan Knowledge Sharing', sub: 'dengan Petugas APP-Yantek', ket: 'Berbagi ilmu memperkuat tim, menjaga layanan yang lebih baik' },
    kontrak: { skki: 'I/2026.M/0001-B2/0/U.CRS', tanggal: '13 April 2026', t1f: 10667, t3pra: 104, t3pas: 273, nilaiJasa: 1005520610, realisasiRp: '' },
  });
  let M;
  try { M = Object.assign(bawaan(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { M = bawaan(); }
  const FOTO = {}; // foto hanya disimpan di memori halaman (tidak diunggah ke mana pun)
  if (!Array.isArray(M.fso.bulan) || M.fso.bulan.length !== 12) M.fso.bulan = BL.map(() => ({ total: '', via: '' }));
  if (M.fso.target == null) M.fso.target = 100;
  const bulanIdx = () => BULAN.findIndex((b) => String(M.periode || '').toLowerCase().startsWith(b.toLowerCase()));
  // bulan periode laporan selalu mengikuti isian Total WO & Via FSO di atas
  const sinkronFso = () => { const i = bulanIdx(); if (i >= 0) M.fso.bulan[i] = { total: M.fso.totalWo, via: M.fso.viaFso }; };
  sinkronFso();
  const simpan = () => { try { localStorage.setItem(KEY, JSON.stringify(M)); } catch (e) { /* abaikan */ } };
  const num = (v) => (v === '' || v == null || isNaN(Number(v)) ? null : Number(v));

  // ---------- RKM dari DIL ----------
  function rkmDariDil() {
    const r = window.DIL_RING; if (!r) return false;
    M.rkm.dariDil = r.periode_awal + '-' + r.periode_akhir;
    const th = String(Number(dash.params().tahun) || new Date().getFullYear());
    let ct = 0, cr = 0;
    BL.forEach((_, i) => {
      const m = th + '-' + String(i + 1).padStart(2, '0');
      const rows = r.per_bulan.filter((x) => x.bulan_ganti === m);
      const tua = rows.filter((x) => x.target).reduce((s, x) => s + x.jumlah, 0);
      const rusak = rows.filter((x) => !x.target).reduce((s, x) => s + x.jumlah, 0);
      const ada = rows.length > 0;
      ct += tua; cr += rusak;
      const b = M.rkm.bulan[i];
      b.rTua = ada ? ct : ''; b.rRusak = ada ? cr : '';
      b.tTua = Math.round(M.rkm.targetTua * (i + 1) / 12); b.tRusak = Math.round(M.rkm.targetRusak * (i + 1) / 12);
    });
    return true;
  }

  // ---------- kerangka slide ----------
  const h = (tag, attrs = {}, ...kids) => {
    const e = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => { if (k === 'style') e.style.cssText = v; else if (k === 'class') e.className = v; else e.setAttribute(k, v); });
    kids.flat().forEach((k) => { if (k == null) return; e.append(k.nodeType ? k : document.createTextNode(String(k))); });
    return e;
  };
  const slide = (judul, isi, opsi = {}) => {
    const s = h('div', { class: 'sl' });
    s.append(
      h('div', { class: 'sl-top' }, h('div', { class: 'sl-title' }, judul, opsi.sub ? h('small', {}, opsi.sub) : null), h('img', { class: 'sl-logo', src: LOGO, alt: 'PLN' })),
      h('div', { class: 'sl-body' }, isi),
      h('div', { class: 'sl-foot' }, h('span', {}, 'Monitoring Dal APP · UP3 Ciracas'), h('span', {}, M.periode)),
    );
    return s;
  };
  const panel = (judul, isi, cls = '') => h('div', { class: 'sl-panel ' + cls }, h('div', { class: 'sl-ph' }, judul), h('div', { class: 'sl-pb' }, isi));
  const svgEl = (w, hh) => { const n = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); n.setAttribute('viewBox', `0 0 ${w} ${hh}`); n.setAttribute('width', w); n.setAttribute('height', hh); return n; };
  const daftar = (txt) => h('ol', { class: 'sl-list' }, String(txt || '').split('\n').map((t) => t.trim()).filter(Boolean).map((t) => h('li', {}, t)));

  // batang horizontal berkelompok (per hari baca)
  function barH(rows, series, w, hh) {
    const n = svgEl(w, hh); const s = d3.select(n);
    const L = 34, R = 16, T = 6, B = 40;
    const mx = Math.max(1, d3.max(series, (se) => d3.max(se.v)));
    const x = d3.scaleLinear([0, mx], [L, w - R]).nice();
    const y = d3.scaleBand(rows, [T, hh - B]).padding(0.25);
    const bh = y.bandwidth() / series.length;
    x.ticks(5).forEach((t) => { s.append('line').attr('x1', x(t)).attr('x2', x(t)).attr('y1', T).attr('y2', hh - B).attr('stroke', C.line); s.append('text').attr('x', x(t)).attr('y', hh - B + 14).attr('text-anchor', 'middle').attr('font-size', 11).attr('fill', C.muted).text(nf.format(t)); });
    rows.forEach((r, i) => {
      s.append('text').attr('x', L - 8).attr('y', y(r) + y.bandwidth() / 2).attr('dy', '0.35em').attr('text-anchor', 'end').attr('font-size', 12).attr('font-weight', 700).attr('fill', C.text).text(r);
      series.forEach((se, j) => {
        const v = Number(se.v[i] || 0);
        s.append('rect').attr('x', L).attr('y', y(r) + j * bh).attr('width', Math.max(0, x(v) - L)).attr('height', bh - 1).attr('fill', se.c);
        if (j === 1 || v) s.append('text').attr('x', x(v) + 4).attr('y', y(r) + j * bh + bh / 2).attr('dy', '0.35em').attr('font-size', 10).attr('font-weight', 700).attr('fill', se.c).text(v ? nf.format(v) : (j === 1 ? '0' : ''));
      });
    });
    let lx = L;
    series.forEach((se) => { s.append('rect').attr('x', lx).attr('y', hh - 16).attr('width', 10).attr('height', 10).attr('fill', se.c); s.append('text').attr('x', lx + 14).attr('y', hh - 7).attr('font-size', 11).attr('fill', C.text).text(se.n); lx += 30 + se.n.length * 6.2; });
    return n;
  }
  // batang vertikal berkelompok (per bulan)
  function barV(labels, series, w, hh, opts = {}) {
    const n = svgEl(w, hh); const s = d3.select(n);
    const L = 44, R = opts.legendRight ? 150 : 10, T = 14, B = opts.legendRight ? 26 : 44;
    const mx = Math.max(1, d3.max(series, (se) => d3.max(se.v.map((v) => Number(v) || 0))));
    const y = d3.scaleLinear([0, mx * 1.1], [hh - B, T]).nice();
    const x = d3.scaleBand(labels, [L, w - R]).padding(0.18);
    const bw = x.bandwidth() / series.length;
    y.ticks(5).forEach((t) => { s.append('line').attr('x1', L).attr('x2', w - R).attr('y1', y(t)).attr('y2', y(t)).attr('stroke', C.line); s.append('text').attr('x', L - 6).attr('y', y(t)).attr('dy', '0.35em').attr('text-anchor', 'end').attr('font-size', 11).attr('fill', C.muted).text(nf.format(t)); });
    labels.forEach((lb, i) => {
      s.append('text').attr('x', x(lb) + x.bandwidth() / 2).attr('y', hh - B + 16).attr('text-anchor', 'middle').attr('font-size', 11).attr('fill', C.text).text(lb);
      series.forEach((se, j) => {
        const v = num(se.v[i]); if (v == null) return;
        s.append('rect').attr('x', x(lb) + j * bw).attr('y', y(v)).attr('width', Math.max(1, bw - 2)).attr('height', Math.max(0, y(0) - y(v))).attr('fill', se.c);
        if (opts.labels) s.append('text').attr('x', x(lb) + j * bw + bw / 2).attr('y', y(v) - 3).attr('text-anchor', 'middle').attr('font-size', 10).attr('font-weight', 700).attr('fill', se.c).text(nf.format(v));
      });
    });
    if (opts.legendRight) {
      series.forEach((se, j) => { s.append('rect').attr('x', w - R + 14).attr('y', T + 40 + j * 22).attr('width', 12).attr('height', 12).attr('fill', se.c); s.append('text').attr('x', w - R + 32).attr('y', T + 50 + j * 22).attr('font-size', 11).attr('fill', C.text).text(se.n); });
    } else {
      let lx = L;
      series.forEach((se) => { s.append('rect').attr('x', lx).attr('y', hh - 14).attr('width', 10).attr('height', 10).attr('fill', se.c); s.append('text').attr('x', lx + 14).attr('y', hh - 5).attr('font-size', 11).attr('fill', C.text).text(se.n); lx += 30 + se.n.length * 6.2; });
    }
    return n;
  }
  // garis persentase penggunaan FSO Januari–Desember
  function trenFso(w, hh) {
    const F = M.fso, bi = bulanIdx();
    const pts = F.bulan.map((b, i) => { const t = num(b.total), v = num(b.via); return { i, p: t ? v / t : null, aktif: i === bi }; });
    const ada = pts.filter((d) => d.p != null);
    const tg = num(F.target) != null && F.target !== '' ? Number(F.target) / 100 : null;
    const n = svgEl(w, hh); const s = d3.select(n);
    const L = 40, R = 10, T = 22, B = 22;
    const lo = Math.min(tg ?? 1, d3.min(ada, (d) => d.p) ?? 1);
    const y0 = Math.max(0, Math.floor((lo - 0.02) * 20) / 20);
    const y = d3.scaleLinear([y0, 1], [hh - B, T]);
    const x = d3.scalePoint(d3.range(12), [L + 10, w - R - 10]);
    y.ticks(4).forEach((t) => { s.append('line').attr('x1', L).attr('x2', w - R).attr('y1', y(t)).attr('y2', y(t)).attr('stroke', C.line); s.append('text').attr('x', L - 5).attr('y', y(t)).attr('dy', '0.35em').attr('text-anchor', 'end').attr('font-size', 10).attr('fill', C.muted).text(Math.round(t * 100) + '%'); });
    BL.forEach((b, i) => s.append('text').attr('x', x(i)).attr('y', hh - 6).attr('text-anchor', 'middle').attr('font-size', 10).attr('font-weight', i === bi ? 800 : 400).attr('fill', i === bi ? C.navy : C.muted).text(b));
    if (tg != null) { s.append('line').attr('x1', L).attr('x2', w - R).attr('y1', y(tg)).attr('y2', y(tg)).attr('stroke', C.green2).attr('stroke-width', 1.5).attr('stroke-dasharray', '5 4'); s.append('text').attr('x', w - R).attr('y', y(tg) - 4).attr('text-anchor', 'end').attr('font-size', 9).attr('font-weight', 700).attr('fill', C.green2).text('Target ' + pf(tg, 0)); }
    const area = d3.area().x((d) => x(d.i)).y0(y(y0)).y1((d) => y(d.p));
    const line = d3.line().defined((d) => d.p != null).x((d) => x(d.i)).y((d) => y(d.p));
    if (ada.length > 1) s.append('path').attr('d', area(ada)).attr('fill', C.sky).attr('opacity', 0.15);
    s.append('path').attr('d', line(ada)).attr('fill', 'none').attr('stroke', C.blue2).attr('stroke-width', 2.5);
    ada.forEach((d) => {
      s.append('circle').attr('cx', x(d.i)).attr('cy', y(d.p)).attr('r', d.aktif ? 5 : 3.5).attr('fill', d.aktif ? C.navy : '#fff').attr('stroke', d.aktif ? C.navy : C.blue2).attr('stroke-width', 2);
      s.append('text').attr('x', x(d.i)).attr('y', y(d.p) - 8).attr('text-anchor', 'middle').attr('font-size', d.aktif ? 10 : 8.5).attr('font-weight', 700).attr('fill', d.aktif ? C.navy : C.blue).text(pf(d.p, 1).replace('%', ''));
    });
    if (!ada.length) s.append('text').attr('x', w / 2).attr('y', hh / 2).attr('text-anchor', 'middle').attr('font-size', 12).attr('fill', C.muted).text('Isi data bulanan di form untuk menampilkan tren');
    return n;
  }
  function donut(items, w, center, sub) {
    const n = svgEl(w, w); const s = d3.select(n).append('g').attr('transform', `translate(${w / 2},${w / 2})`);
    const tot = d3.sum(items, (d) => d.v);
    const arc = d3.arc().innerRadius(w * 0.32).outerRadius(w * 0.48);
    s.selectAll('path').data(d3.pie().sort(null).value((d) => d.v)(tot ? items : [{ v: 1, c: C.line }])).join('path').attr('d', arc).attr('fill', (d) => d.data.c);
    s.append('text').attr('text-anchor', 'middle').attr('dy', sub ? '0.1em' : '0.35em').attr('font-size', w * 0.15).attr('font-weight', 800).attr('fill', C.navy).text(center);
    if (sub) s.append('text').attr('text-anchor', 'middle').attr('dy', '1.6em').attr('font-size', w * 0.08).attr('font-weight', 700).attr('fill', C.navy).text(sub);
    return n;
  }
  const tabel = (head, rows, opts = {}) => h('table', { class: 'sl-tbl ' + (opts.cls || '') }, h('thead', {}, h('tr', {}, head.map((x) => h('th', {}, x)))), h('tbody', {}, rows.map((r) => h('tr', { class: r.cls || '' }, r.cells.map((c, i) => h('td', { class: (opts.left || []).includes(i) ? 'l' : (c && c.hl ? 'hl' : '') }, c && c.hl ? c.t : c))))));

  // ---------- slide 1: LBKB ----------
  function sLbkb() {
    const L = M.lbkb;
    const sum = (a) => a.reduce((s, v) => s + (Number(v) || 0), 0);
    const ser = (o) => [{ n: 'TO = ' + sum(o.to), v: o.to, c: C.blue }, { n: 'Realisasi H+1 = ' + sum(o.h1), v: o.h1, c: C.red }, { n: 'Realisasi >H+1 = ' + sum(o.gt), v: o.gt, c: C.yellow }];
    const bi = BULAN.findIndex((b) => M.periode.toLowerCase().startsWith(b.toLowerCase()));
    const blnNama = (BULAN[bi] || M.periode).toUpperCase();
    const rows = L.bulan.map((b, i) => ({ cells: [BULAN[i].toUpperCase(), b.macet === '' ? '-' : nf.format(b.macet), b.buram === '' ? '-' : nf.format(b.buram), b.macet === '' ? '-' : nf.format((Number(b.macet) || 0) + (Number(b.buram) || 0))] }));
    const tm = sum(L.bulan.map((b) => b.macet)), tb = sum(L.bulan.map((b) => b.buram));
    rows.push({ cls: 'tot', cells: ['TOTAL', nf.format(tm), nf.format(tb), nf.format(tm + tb)] });
    const lastI = L.bulan.reduce((a, b, i) => (b.macet !== '' ? i : a), -1);
    const prevI = Math.max(0, bi > 0 ? bi - 1 : lastI);
    const pv = L.bulan[prevI] || {};
    const kondisi = h('div', { class: 'sl-kond' }, h('b', {}, 'Kondisi :'), h('p', {}, 'Total LBKB macet buram ' + BULAN[prevI] + ' ' + M.periode.split(' ').pop() + ' = ', h('span', { class: 'pill' }, nf.format((Number(pv.macet) || 0) + (Number(pv.buram) || 0))), ' plg dengan komposisi Macet ', h('span', { class: 'pill' }, nf.format(Number(pv.macet) || 0)), ' plg dan Buram ', h('span', { class: 'pill' }, nf.format(Number(pv.buram) || 0)), ' plg.'));
    return slide('LBKB METER MACET BURAM ' + M.periode.split(' ').pop(), h('div', { class: 'g-lbkb' },
      panel('LBKB MACET ' + blnNama + ' ' + M.periode.split(' ').pop(), barH(HB, ser(L.macet), 400, 212), 'a'),
      panel('LBKB BURAM ' + blnNama + ' ' + M.periode.split(' ').pop(), barH(HB, ser(L.buram), 400, 212), 'b'),
      panel('Kondisi & Lesson Learned', h('div', {}, kondisi, h('b', { class: 'sl-sub' }, 'Lesson Learned :'), daftar(L.lesson)), 'c'),
      panel('LBKB ' + M.periode.split(' ').pop(), barV(BL, [{ n: 'Target', v: L.bulan.map((b) => b.target), c: C.blue }, { n: 'Realisasi', v: L.bulan.map((b) => (b.macet === '' ? '' : (Number(b.macet) || 0) + (Number(b.buram) || 0))), c: C.red }], 520, 230, { labels: true }), 'd'),
      h('div', { class: 'e' }, tabel(['BULAN', 'LBKB MACET', 'LBKB BURAM', 'REALISASI'], rows, { cls: 'green' })),
    ));
  }

  // ---------- slide 2: RKM UID ----------
  function sRkm() {
    const R = M.rkm;
    const last = (k) => { const v = R.bulan.map((b) => num(b[k])).filter((x) => x != null); return v.length ? v[v.length - 1] : 0; };
    const rt = last('rTua'), rr = last('rRusak');
    const tot = rt + rr, tt = Number(R.targetTua) + Number(R.targetRusak);
    const chart = barV(BL, [
      { n: 'Target Meter Tua', v: R.bulan.map((b) => b.tTua), c: C.blue },
      { n: 'Realisasi Meter Tua', v: R.bulan.map((b) => b.rTua), c: C.orange },
      { n: 'Target Meter Rusak', v: R.bulan.map((b) => b.tRusak), c: C.green },
      { n: 'Realisasi Meter Rusak', v: R.bulan.map((b) => b.rRusak), c: C.sky },
    ], 760, 300, { legendRight: true });
    const tbl = tabel(['', 'Target', 'Realisasi', ''], [
      { cells: ['Tua', nf.format(R.targetTua), nf.format(rt), { hl: 1, t: pf(rt / R.targetTua, 0) }] },
      { cells: ['Rusak', nf.format(R.targetRusak), nf.format(rr), { hl: 1, t: pf(rr / R.targetRusak, 1) }] },
    ], { cls: 'big', left: [0] });
    const kondisi = h('p', { class: 'sl-kond' }, 'Target RKM UID sebesar ', h('span', { class: 'pill' }, nf.format(tt)), ', Realisasi ganti meter total = ', h('span', { class: 'pill' }, nf.format(tot)), ' plg (', h('span', { class: 'pill' }, pf(tt ? tot / tt : null, 1)), ') dengan komposisi meter tua sebanyak ', h('span', { class: 'pill' }, nf.format(rt)), ' plg (', h('span', { class: 'pill' }, pf(R.targetTua ? rt / R.targetTua : null, 0)), ').');
    return slide('RKM GANTI METER UID', h('div', { class: 'g-rkm' },
      h('div', { class: 'a' }, panel('RKM UID', chart), tbl),
      h('div', { class: 'b' }, panel('Kondisi', kondisi), panel('Upaya', daftar(R.upaya))),
    ));
  }

  // ---------- slide 3: FSO ----------
  function sFso() {
    const F = M.fso;
    const tot = Number(F.totalWo) || 0, via = Number(F.viaFso) || 0, non = Number(F.nonFso) || 0, w = Number(F.wwo) || 0;
    const p = tot ? via / tot : null;
    const tile = (label, v, c) => h('div', { class: 'fso-tile' }, h('i', { style: 'background:' + c }), h('div', {}, h('span', {}, label), h('b', {}, nf.format(v)), h('small', {}, 'WO')));
    return slide('REALISASI FSO', h('div', { class: 'g-fso' },
      h('div', { class: 'fso-tiles' }, tile('Total WO', tot, C.blue), tile('Ganti Meter Via FSO', via, C.sky), tile('Ganti Meter Non FSO', non, C.green2), tile('WWO Belum Ditindaklanjuti', w, C.orange),
        h('div', { class: 'fso-pct' }, donut([{ v: via, c: C.blue2 }, { v: Math.max(0, tot - via), c: C.line }], 96, pf(p)), h('div', {}, h('span', {}, '% Penggunaan FSO Ganti Meter'), h('b', {}, pf(p))))),
      panel('RINCIAN PELAKSANAAN FSO – UP3 CIRACAS (' + M.periode.toUpperCase() + ')', tabel(['NO', 'UP3', 'Total WO', 'Ganti Meter Via FSO', 'Ganti Meter Non FSO', 'WWO Belum Ditindaklanjuti', '% Penggunaan FSO Ganti Meter'], [{ cells: ['1', 'CIRACAS', nf.format(tot), nf.format(via), nf.format(non), nf.format(w), { hl: 1, t: pf(p) }] }]), 'r'),
      panel('KENDALA YANG DIHADAPI', h('div', {}, h('b', { class: 'sl-sub' }, '1  ' + F.kendalaJudul.toUpperCase()), daftar(F.kendala)), 'k'),
      panel('KOMPOSISI PELAKSANAAN WO', h('div', { class: 'fso-komp' }, donut([{ v: via, c: C.blue2 }, { v: non, c: C.orange }, { v: w, c: C.yellow }], 150, nf.format(tot), 'WO'),
        h('ul', { class: 'sl-leg' }, [['Ganti Meter Via FSO', via, C.blue2], ['Ganti Meter Non FSO', non, C.orange], ['WWO Belum Ditindaklanjuti', w, C.yellow]].map(([l, v, c]) => h('li', {}, h('i', { style: 'background:' + c }), l, h('b', {}, nf.format(v) + ' (' + pf(tot ? v / tot : 0) + ')'))))), 'p'),
      panel('TREN PENGGUNAAN FSO ' + String(M.periode).split(' ').pop(), h('div', { class: 'fso-tren' }, trenFso(372, 214), h('p', {}, '% penggunaan FSO = ganti meter via FSO ÷ total WO')), 'q'),
    ), { sub: 'GANTI METER – UP3 CIRACAS · ' + M.periode.toUpperCase() });
  }

  // ---------- slide 4: dokumentasi ----------
  function sDok() {
    const D = M.dok;
    const foto = FOTO.dok ? h('img', { class: 'dok-img', src: FOTO.dok, alt: 'Dokumentasi' }) : h('div', { class: 'dok-img kosong' }, 'Unggah foto kegiatan di form');
    return slide(D.judul.toUpperCase(), h('div', { class: 'g-dok' }, foto, h('div', { class: 'dok-ket' }, h('p', {}, '“' + D.ket + '”'))), { sub: D.sub.toUpperCase() });
  }

  // ---------- slide 5: kontrak murni ----------
  function sKontrak() {
    const K = M.kontrak;
    const th = Number(dash.params().tahun);
    const rows = (dash.data('capaian').status === 'ok' ? dash.data('capaian').data : []).filter((r) => Number(r.tahun) === th);
    const kk = rows.filter((r) => !String(r.kontraktor).startsWith('SEMUA')).sort((a, b) => String(a.nomor_kontrak).localeCompare(String(b.nomor_kontrak)));
    const all = rows.find((r) => String(r.kontraktor).startsWith('SEMUA')) || {};
    const body = kk.map((r) => ({ cells: [r.nomor_kontrak, r.pelaksana, r.tanggal_akhir_awal || r.tanggal_akhir, nf.format(r.target_kwh), nf.format(r.realisasi_kwh), pf(r.persen), { hl: 1, t: pf(r.persen_rupiah) }, (r.status_pembayaran || r.tagihan_terakhir || '—').replace(/^Tagihan\s+/i, '').toUpperCase()] }));
    body.push({ cls: 'tot', cells: ['', 'Total Penggantian kWh meter', '', nf.format(all.target_kwh || 0), nf.format(all.realisasi_kwh || 0), pf(all.persen), '', ''] });
    const realRp = num(K.realisasiRp) != null ? num(K.realisasiRp) : (all.nilai_realisasi_ppn || 0);
    const fotos = h('div', { class: 'kt-foto' }, ['k1', 'k2'].map((k) => (FOTO[k] ? h('img', { src: FOTO[k], alt: 'Foto' }) : h('div', { class: 'kosong' }, 'Foto (unggah di form)'))));
    const pagu = panel('Pagu SKKI B2 Ganti meter ' + th, h('div', { class: 'pagu' },
      h('div', {}, h('p', {}, h('b', {}, 'No SKKI'), h('br'), K.skki), h('p', {}, h('b', {}, 'Tanggal'), h('br'), K.tanggal), h('p', {}, h('b', {}, 'Target Total Ganti meter'))),
      h('div', {}, h('ol', { class: 'sl-list' }, h('li', {}, '1 fasa = ' + nf.format(K.t1f) + ' bh'), h('li', {}, '3 fasa Prabayar = ' + nf.format(K.t3pra) + ' bh'), h('li', {}, '3 fasa Paskabayar = ' + nf.format(K.t3pas) + ' bh')),
        h('p', {}, h('b', {}, 'Nilai Jasa = ' + rp(K.nilaiJasa))), h('p', { class: 'hlbox' }, 'Realisasi saat ini = ' + rp(realRp) + ' (' + pf(K.nilaiJasa ? realRp / K.nilaiJasa : null) + ')'))));
    return slide('REALISASI KONTRAK MURNI - PRK ' + th, h('div', { class: 'g-kt' },
      panel('KONTRAK MURNI ' + th, tabel(['No SPJ', 'Nama Pelaksana Pekerjaan', 'Tanggal Akhir SPJ', 'Target', 'Realisasi', '% Realisasi Pemasangan', '% Rupiah Pekerjaan', 'Status Pembayaran Terakhir'], body, { left: [0, 1] }), 'a'),
      fotos, pagu,
    ));
  }

  const SLIDES = [
    { id: 'lbkb', nama: 'LBKB meter macet buram', fn: sLbkb },
    { id: 'rkm', nama: 'RKM ganti meter UID', fn: sRkm },
    { id: 'fso', nama: 'Realisasi FSO', fn: sFso },
    { id: 'dok', nama: 'Dokumentasi kegiatan', fn: sDok },
    { id: 'kontrak', nama: 'Realisasi kontrak murni', fn: sKontrak },
  ];

  // ---------- form ----------
  const inp = (val, on, attrs = {}) => { const e = h('input', Object.assign({ value: val ?? '' }, attrs)); e.addEventListener('input', () => { on(e.value); simpan(); jadwal(); }); return e; };
  const area = (val, on) => { const e = h('textarea', { rows: 4 }); e.value = val || ''; e.addEventListener('input', () => { on(e.value); simpan(); jadwal(); }); return e; };
  const fld = (label, el) => h('label', { class: 'mf' }, h('span', {}, label), el);
  const grid = (cols, rows, get, set) => h('table', { class: 'mg' }, h('thead', {}, h('tr', {}, cols.map((c) => h('th', {}, c)))), h('tbody', {}, rows.map((r, i) => h('tr', {}, h('th', {}, r), cols.slice(1).map((_, j) => h('td', {}, inp(get(i, j), (v) => set(i, j, v), { inputmode: 'numeric' })))))));
  const fotoInput = (key) => { const e = h('input', { type: 'file', accept: 'image/*' }); e.addEventListener('change', () => { const f = e.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { FOTO[key] = rd.result; jadwal(); }; rd.readAsDataURL(f); }); return e; };

  function form(id) {
    const box = h('div', { class: 'mform' });
    if (id === 'lbkb') {
      const L = M.lbkb;
      ['macet', 'buram'].forEach((k) => box.append(h('h5', {}, 'LBKB ' + k + ' per hari baca'), grid(['Hari baca', 'TO', 'Realisasi H+1', 'Realisasi >H+1'], HB, (i, j) => L[k][['to', 'h1', 'gt'][j]][i], (i, j, v) => { L[k][['to', 'h1', 'gt'][j]][i] = num(v) ?? 0; })));
      box.append(h('h5', {}, 'Rekap per bulan'), grid(['Bulan', 'Target', 'Macet', 'Buram'], BULAN, (i, j) => L.bulan[i][['target', 'macet', 'buram'][j]], (i, j, v) => { L.bulan[i][['target', 'macet', 'buram'][j]] = v === '' ? '' : num(v) ?? ''; }));
      box.append(fld('Lesson learned (satu baris satu poin)', area(L.lesson, (v) => { L.lesson = v; })));
    }
    if (id === 'rkm') {
      const R = M.rkm;
      box.append(h('div', { class: 'mrow' }, fld('Target meter tua (setahun)', inp(R.targetTua, (v) => { R.targetTua = num(v) || 0; })), fld('Target meter rusak (setahun)', inp(R.targetRusak, (v) => { R.targetRusak = num(v) || 0; }))));
      const btn = h('button', { type: 'button', class: 'rp-btn primary' }, 'Isi realisasi dari DIL');
      btn.addEventListener('click', () => { if (rkmDariDil()) { simpan(); gambarSemua(); } else btn.textContent = 'Data DIL belum termuat'; });
      box.append(h('p', { class: 'mnote' }, 'Kumulatif per bulan. Tombol di bawah mengisi realisasi dari perbandingan DIL (meter tua = target umur; rusak = selain itu) dan target bulanan secara proporsional.'), btn);
      box.append(grid(['Bulan', 'Target tua', 'Realisasi tua', 'Target rusak', 'Realisasi rusak'], BULAN, (i, j) => R.bulan[i][['tTua', 'rTua', 'tRusak', 'rRusak'][j]], (i, j, v) => { R.bulan[i][['tTua', 'rTua', 'tRusak', 'rRusak'][j]] = v === '' ? '' : num(v) ?? ''; }));
      box.append(fld('Upaya (satu baris satu poin)', area(R.upaya, (v) => { R.upaya = v; })));
    }
    if (id === 'fso') {
      const F = M.fso;
      box.append(h('div', { class: 'mrow' }, fld('Total WO', inp(F.totalWo, (v) => { F.totalWo = num(v) || 0; })), fld('Ganti meter via FSO', inp(F.viaFso, (v) => { F.viaFso = num(v) || 0; })), fld('Ganti meter non FSO', inp(F.nonFso, (v) => { F.nonFso = num(v) || 0; })), fld('WWO belum ditindaklanjuti', inp(F.wwo, (v) => { F.wwo = num(v) || 0; }))));
      const bi = bulanIdx();
      box.append(h('h5', {}, 'Tren bulanan (isi setiap bulan)'), h('p', { class: 'mnote' }, 'Baris bulan periode laporan' + (bi >= 0 ? ' (' + BULAN[bi] + ')' : '') + ' otomatis mengikuti Total WO dan Via FSO di atas. Persentase dihitung otomatis.'));
      const pctCell = (i) => { const t = num(F.bulan[i].total), v = num(F.bulan[i].via); return t ? pf(v / t) : '—'; };
      const pcts = [];
      box.append(h('table', { class: 'mg' }, h('thead', {}, h('tr', {}, ['Bulan', 'Total WO', 'Via FSO', '% FSO'].map((c) => h('th', {}, c)))),
        h('tbody', {}, BULAN.map((b, i) => {
          const pc = h('td', { class: 'mpct' }, pctCell(i)); pcts[i] = pc;
          const cell = (k) => h('td', {}, inp(F.bulan[i][k], (v) => { F.bulan[i][k] = v === '' ? '' : num(v) ?? ''; pc.textContent = pctCell(i); }, i === bi ? { inputmode: 'numeric', disabled: '', 'data-fso-bi': k } : { inputmode: 'numeric' }));
          return h('tr', {}, h('th', {}, b), cell('total'), cell('via'), pc);
        }))));
      box.append(fld('Target % penggunaan FSO (kosongkan bila tidak ada)', inp(F.target, (v) => { F.target = v === '' ? '' : num(v) ?? ''; }, { inputmode: 'decimal' })));
      const segar = () => { sinkronFso(); if (bi < 0) return; box.querySelectorAll('[data-fso-bi]').forEach((e) => { e.value = F.bulan[bi][e.dataset.fsoBi]; }); pcts[bi].textContent = pctCell(bi); simpan(); };
      box.querySelectorAll('.mrow input').forEach((e) => e.addEventListener('input', segar));
      box.append(fld('Judul kendala', inp(F.kendalaJudul, (v) => { F.kendalaJudul = v; })), fld('Uraian kendala (satu baris satu poin)', area(F.kendala, (v) => { F.kendala = v; })));
    }
    if (id === 'dok') {
      const D = M.dok;
      box.append(fld('Judul', inp(D.judul, (v) => { D.judul = v; })), fld('Subjudul', inp(D.sub, (v) => { D.sub = v; })), fld('Keterangan', inp(D.ket, (v) => { D.ket = v; })), fld('Foto kegiatan', fotoInput('dok')));
    }
    if (id === 'kontrak') {
      const K = M.kontrak;
      box.append(h('p', { class: 'mnote' }, 'Tabel kontrak diisi otomatis dari dashboard (target RAB, realisasi pemasangan, % rupiah = jumlah biaya realisasi ÷ jumlah biaya RAB, status pembayaran dari PROGRES PEK) untuk tahun yang dipilih di menu samping.'));
      box.append(h('div', { class: 'mrow' }, fld('No SKKI', inp(K.skki, (v) => { K.skki = v; })), fld('Tanggal SKKI', inp(K.tanggal, (v) => { K.tanggal = v; }))));
      box.append(h('div', { class: 'mrow' }, fld('Target 1 fasa', inp(K.t1f, (v) => { K.t1f = num(v) || 0; })), fld('Target 3 fasa prabayar', inp(K.t3pra, (v) => { K.t3pra = num(v) || 0; })), fld('Target 3 fasa paskabayar', inp(K.t3pas, (v) => { K.t3pas = num(v) || 0; }))));
      box.append(h('div', { class: 'mrow' }, fld('Nilai jasa (Rp)', inp(K.nilaiJasa, (v) => { K.nilaiJasa = num(v) || 0; })), fld('Realisasi Rp (kosong = otomatis dari RAB)', inp(K.realisasiRp, (v) => { K.realisasiRp = v; }))));
      box.append(h('div', { class: 'mrow' }, fld('Foto 1', fotoInput('k1')), fld('Foto 2', fotoInput('k2'))));
    }
    return box;
  }

  // ---------- tampilan ----------
  let pilih = 'lbkb';
  let t;
  const jadwal = () => { clearTimeout(t); t = setTimeout(gambarSemua, 150); };
  function skala(wrap) {
    const sl = wrap.querySelector('.sl'); if (!sl) return;
    const w = wrap.clientWidth || 800;
    sl.style.transform = 'scale(' + w / 1280 + ')';
    wrap.style.height = (720 * w / 1280) + 'px';
  }
  function gambarSemua() {
    const prev = $('#mt-prev'); if (!prev || !prev.clientWidth) return;
    const def = SLIDES.find((s) => s.id === pilih);
    const wrap = h('div', { class: 'sl-wrap' }, def.fn());
    prev.replaceChildren(wrap); skala(wrap);
    document.querySelectorAll('#mt-list button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.s === pilih)));
  }
  function bukaForm() { const f = $('#mt-form'); if (f) f.replaceChildren(form(pilih)); }

  // ---------- ekspor ----------
  const muatSkrip = (src) => new Promise((ok, no) => { if ([...document.scripts].some((s) => s.src === src)) return ok(); const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('Gagal memuat pustaka ekspor')); document.head.append(s); });
  async function render(def) {
    const host = h('div', { style: 'position:fixed;left:-20000px;top:0;width:1280px;height:720px;' });
    const node = def.fn(); host.append(node); document.body.append(host);
    await new Promise((r) => setTimeout(r, 60));
    try { return await window.htmlToImage.toPng(node, { pixelRatio: 2, width: 1280, height: 720, backgroundColor: '#ffffff', skipFonts: true }); } finally { host.remove(); }
  }
  const info = (t) => { const e = $('#mt-info'); if (e) e.textContent = t; };
  const unduhUrl = (url, name) => { const a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); setTimeout(() => a.remove(), 500); };
  async function eksporPng() {
    info('Menyiapkan gambar…');
    await muatSkrip('https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js');
    const def = SLIDES.find((s) => s.id === pilih);
    unduhUrl(await render(def), 'Slide_' + def.id + '_' + M.periode.replace(/\s+/g, '_') + '.png');
    info('PNG diunduh.');
  }
  async function eksporPptx() {
    info('Menyiapkan PowerPoint…');
    await muatSkrip('https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js');
    await muatSkrip('https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js');
    const pptx = new window.PptxGenJS(); pptx.layout = 'LAYOUT_WIDE'; pptx.title = 'Kinerja Dal APP ' + M.periode;
    const pakai = SLIDES.filter((s) => $('#mt-ikut-' + s.id)?.checked !== false);
    for (const [i, def] of pakai.entries()) {
      info('Menyusun slide ' + (i + 1) + ' dari ' + pakai.length + '…');
      pptx.addSlide().addImage({ data: await render(def), x: 0, y: 0, w: 13.333, h: 7.5 });
    }
    await pptx.writeFile({ fileName: 'Kinerja_Dal_APP_' + M.periode.replace(/\s+/g, '_') + '.pptx' });
    info('PowerPoint diunduh (' + pakai.length + ' slide).');
  }

  function mulai() {
    const list = $('#mt-list'); if (!list) return;
    list.replaceChildren(...SLIDES.map((s, i) => {
      const b = h('button', { type: 'button', 'data-s': s.id }, h('b', {}, String(i + 1)), s.nama);
      b.addEventListener('click', () => { pilih = s.id; bukaForm(); gambarSemua(); });
      const cb = h('input', { type: 'checkbox', id: 'mt-ikut-' + s.id, title: 'Ikut diekspor' }); cb.checked = true;
      return h('div', { class: 'mt-item' }, b, cb);
    }));
    const per = $('#mt-periode'); if (per) { per.value = M.periode; per.addEventListener('input', () => { M.periode = per.value; sinkronFso(); simpan(); jadwal(); if (pilih === 'fso') bukaForm(); }); }
    $('#mt-png')?.addEventListener('click', () => eksporPng().catch((e) => info('Gagal: ' + e.message)));
    $('#mt-pptx')?.addEventListener('click', () => eksporPptx().catch((e) => info('Gagal: ' + e.message)));
    $('#mt-reset')?.addEventListener('click', () => { const p = M.periode; M = bawaan(); M.periode = p; simpan(); bukaForm(); gambarSemua(); info('Isian dikembalikan ke contoh bawaan.'); });
    $('#mt-json')?.addEventListener('click', () => unduhUrl(URL.createObjectURL(new Blob([JSON.stringify(M, null, 2)], { type: 'application/json' })), 'isian_materi_' + M.periode.replace(/\s+/g, '_') + '.json'));
    $('#mt-impor')?.addEventListener('change', (e) => { const f = e.target.files[0]; if (!f) return; f.text().then((t) => { M = Object.assign(bawaan(), JSON.parse(t)); simpan(); bukaForm(); gambarSemua(); info('Isian dimuat dari file.'); }).catch(() => info('File isian tidak valid.')); });
    // isi ulang dari DIL bila tabel masih kosong atau sebelumnya diisi dari DIL periode lain
    const perluIsi = (r) => !M.rkm.bulan.some((b) => b.rTua !== '') || (M.rkm.dariDil && r && M.rkm.dariDil !== r.periode_awal + '-' + r.periode_akhir);
    window.addEventListener('dil-siap', () => { if (perluIsi(window.DIL_RING) && rkmDariDil()) { simpan(); bukaForm(); gambarSemua(); } }, { once: true });
    if (window.DIL_RING && perluIsi(window.DIL_RING)) { rkmDariDil(); simpan(); }
    bukaForm();
    dash.onData(() => { if (pilih === 'kontrak') jadwal(); });
    window.addEventListener('resize', jadwal);
    window.MATERI_GAMBAR = gambarSemua;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai); else mulai();
})();
