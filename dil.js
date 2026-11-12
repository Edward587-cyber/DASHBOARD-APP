// Bagian "Peta umur meter (DIL)": membaca data/dil/ringkasan.enc (rekap, terenkripsi kunci data dashboard) dan, saat diunduh, data/dil/detail.enc (terenkripsi).
(() => {
  const R = window.RP;
  const { nf, pf } = R;
  const V = '?v=' + (window.DIL_VERSI || '1');
  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const S = { ring: null, detail: null, jenis: 'Semua', status: 'belum', kelSort: 'sisa', kelCari: '' };
  const GREEN = 'var(--color-ok)', RED = 'var(--color-bad)', GREY = 'var(--cds-chart-muted)';
  const pick = (rows, f) => rows.filter((r) => f(r));
  const sum = (rows, k) => rows.reduce((s, r) => s + Number(r[k] || 0), 0);
  const jenisOk = (r) => S.jenis === 'Semua' || r.jenis === S.jenis;
  const bln = (m) => { const [y, mm] = m.split('-'); return ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][+mm - 1] + ' ' + y.slice(2); };
  const per = (p) => bln(p.slice(0, 4) + '-' + p.slice(4));

  // ---------- ringkasan ----------
  function kpi() {
    const box = $('#dil-kpi'); if (!box) return;
    box.replaceChildren();
    const rows = S.ring.per_jenis_umur;
    const t = (j) => pick(rows, (r) => r.target && r.jenis === j);
    const tile = (lbl, n, sub, frac) => {
      const d = el('div', 'rp-kpi');
      d.append(el('span', 'lbl', lbl), el('span', 'val', nf.format(n)));
      if (frac != null) { const b = el('div', 'rp-bar'); const i = el('i'); i.style.width = Math.min(100, frac * 100) + '%'; b.append(i); d.append(b); }
      d.append(el('span', 'sub', sub)); box.append(d);
    };
    const bu = S.ring.batas_umur;
    const J = S.jenis === 'Semua' ? ['Paskabayar', 'Prabayar'] : [S.jenis];
    J.forEach((j) => {
      const r = t(j), n = sum(r, 'jumlah'), g = sum(r, 'terganti');
      tile('Target ' + j.toLowerCase() + ' ≥ ' + bu[j] + ' tahun', n, nf.format(g) + ' terganti (' + pf.format(n ? g / n : 0) + ') · sisa ' + nf.format(sum(r, 'belum')), n ? g / n : 0);
    });
    const rj = pick(rows, jenisOk);
    const tAll = pick(rj, (r) => r.target);
    const lbl = S.jenis === 'Semua' ? '' : ' · ' + S.jenis.toLowerCase();
    if (S.jenis !== 'Semua') {
      const nt = pick(rj, (r) => !r.target);
      tile('Meter bukan target' + lbl, sum(nt, 'jumlah'), nf.format(sum(nt, 'terganti')) + ' terganti (' + pf.format(sum(nt, 'jumlah') ? sum(nt, 'terganti') / sum(nt, 'jumlah') : 0) + ')');
    }
    tile('Sisa target belum diganti' + lbl, sum(tAll, 'belum'), 'dari ' + nf.format(sum(tAll, 'jumlah')) + ' meter target');
    tile('Semua meter terganti' + lbl, sum(rj, 'terganti'), per(S.ring.periode_awal) + ' → ' + per(S.ring.periode_akhir) + ', semua umur');
    const cap = $('#dil-periode');
    if (cap) cap.textContent = 'DIL ' + S.ring.periode_awal + ' → ' + S.ring.periode_akhir + ' · ' + nf.format(S.ring.populasi) + ' pelanggan aktif · umur dihitung terhadap tahun ' + S.ring.tahun_acuan_umur + ' · diolah ' + S.ring.dibuat;
  }

  // ---------- umur populasi ----------
  function umur() {
    const box = $('#dil-umur'); if (!box) return;
    const rows = S.ring.per_jenis_umur;
    const cats = [];
    (S.jenis === 'Semua' ? ['Paskabayar', 'Prabayar'] : [S.jenis]).forEach((j) => R.CL.forEach((c) => {
      const r = pick(rows, (x) => x.jenis === j && x.cluster === c);
      const n = sum(r, 'jumlah'); if (!n) return;
      const tgt = r.some((x) => x.target);
      cats.push({ label: (tgt ? '★ ' : '') + j + ' · ' + c, total: n, g: sum(r, 'terganti'), b: sum(r, 'belum'), o: sum(r, 'hilang') + sum(r, 'kosong'), end: nf.format(n) + ' · ' + pf.format(sum(r, 'terganti') / n) + ' terganti' });
    }));
    R.hstack(box, cats, (c) => [{ v: c.g, color: GREEN, op: 1 }, { v: c.b, color: GREY, op: 1 }, { v: c.o, color: 'var(--color-warn)', op: 1 }], {
      tip: (c) => [[GREEN, 1, 'Terganti', nf.format(c.g)], [GREY, 1, 'Belum terganti', nf.format(c.b)], ['var(--color-warn)', 1, 'Lainnya', nf.format(c.o)]],
    });
  }

  // ---------- per bulan ----------
  function bulan() {
    const box = $('#dil-bulan'); if (!box) return;
    box.replaceChildren();
    const rows = S.ring.per_bulan;
    const keysAll = [['Paskabayar', true, 'Paska · target umur'], ['Paskabayar', false, 'Paska · lainnya'], ['Prabayar', true, 'Prabayar · target umur'], ['Prabayar', false, 'Prabayar · lainnya']];
    const colAll = ['var(--c1)', 'color-mix(in srgb, var(--c1) 45%, transparent)', 'var(--c2)', 'color-mix(in srgb, var(--c2) 45%, transparent)'];
    const idx = keysAll.map((k, i) => i).filter((i) => S.jenis === 'Semua' || keysAll[i][0] === S.jenis);
    const keys = idx.map((i) => keysAll[i]); const col = idx.map((i) => colAll[i]);
    const months = Array.from(new Set(rows.map((r) => r.bulan_ganti))).sort();
    const data = months.map((m) => { const o = { m }; keys.forEach(([j, t], i) => { o[i] = sum(pick(rows, (r) => r.bulan_ganti === m && r.jenis === j && r.target === t), 'jumlah'); }); return o; });
    const lg = $('#dil-bulan-leg'); if (lg) R.legend(lg, keys.map((k, i) => [col[i], 1, k[2]]));
    const W = box.clientWidth || 700, H = 260;
    const svgN = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); box.append(svgN); box.style.minHeight = H + 'px';
    const svg = d3.select(svgN).attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('height', H);
    const KS = keys.map((_, i) => i);
    const tot = (d) => KS.reduce((s, i) => s + (d[i] || 0), 0);
    const st = d3.stack().keys(KS)(data);
    const y = d3.scaleLinear([0, d3.max(data, tot) || 1], [H - 24, 8]).nice();
    const t0 = svg.append('text').text(nf.format(y.domain()[1])); const L = t0.node().getComputedTextLength() + 10; t0.remove();
    const x = d3.scaleBand(months, [L, W - 4]).padding(0.2);
    y.ticks(4).forEach((t) => {
      svg.append('line').attr('x1', L).attr('x2', W - 4).attr('y1', y(t)).attr('y2', y(t)).attr('stroke', 'var(--cds-chart-grid)');
      svg.append('text').attr('x', L - 6).attr('y', y(t)).attr('dy', '0.35em').attr('text-anchor', 'end').text(nf.format(t));
    });
    const every = Math.max(1, Math.ceil(52 / x.bandwidth()));
    months.forEach((m, i) => { if (i % every === 0) svg.append('text').attr('x', x(m) + x.bandwidth() / 2).attr('y', H - 6).attr('text-anchor', 'middle').text(bln(m)); });
    const bw = Math.min(30, x.bandwidth());
    st.forEach((s, si) => svg.append('g').selectAll('rect').data(s).join('rect')
      .attr('x', (d) => x(d.data.m) + (x.bandwidth() - bw) / 2).attr('width', bw)
      .attr('y', (d) => y(d[1])).attr('height', (d) => Math.max(0, y(d[0]) - y(d[1]) - (d[1] > d[0] ? 1 : 0))).attr('fill', col[si])
      .on('mousemove', (ev, d) => R.showTip(box, ev, bln(d.data.m) + ' · total ' + nf.format(tot(d.data)), keys.map((k, i) => [col[i], 1, k[2], nf.format(d.data[i])])))
      .on('mouseleave', () => R.hideTip(box)));
  }

  // ---------- merk target ----------
  function merk() {
    const box = $('#dil-merk'); if (!box) return;
    const rows = pick(S.ring.per_merk, (r) => r.target && jenisOk(r));
    const o = {};
    rows.forEach((r) => { const a = o[r.merk] = o[r.merk] || { label: r.merk, g: 0, b: 0, total: 0 }; a.g += r.terganti; a.b += r.belum; a.total += r.jumlah; });
    const cats = Object.values(o).sort((a, b) => b.total - a.total).slice(0, 12).map((c) => ({ ...c, end: nf.format(c.total) + ' · sisa ' + nf.format(c.b) }));
    if (!cats.length) { box.replaceChildren(el('p', 'rp-cap', 'Tidak ada data.')); return; }
    R.hstack(box, cats, (c) => [{ v: c.g, color: GREEN, op: 1 }, { v: c.b, color: GREY, op: 1 }], {
      tip: (c) => [[GREEN, 1, 'Terganti', nf.format(c.g) + ' (' + pf.format(c.g / c.total) + ')'], [GREY, 1, 'Belum terganti', nf.format(c.b)]],
    });
  }

  // ---------- kelurahan ----------
  function kelurahan() {
    const tb = $('#dil-kel tbody'); if (!tb) return;
    tb.replaceChildren();
    const o = {};
    S.ring.per_kelurahan.forEach((r) => {
      if (!r.target || !jenisOk(r)) return;
      const k = r.kelurahan + '|' + r.kecamatan;
      const a = o[k] = o[k] || { kel: r.kelurahan, kec: r.kecamatan, pt: 0, pg: 0, bt: 0, bg: 0 };
      if (r.jenis === 'Paskabayar') { a.pt += r.jumlah; a.pg += r.terganti; } else { a.bt += r.jumlah; a.bg += r.terganti; }
    });
    let rows = Object.values(o).map((a) => ({ ...a, t: a.pt + a.bt, g: a.pg + a.bg, sisa: a.pt + a.bt - a.pg - a.bg }));
    rows.forEach((a) => { a.p = a.t ? a.g / a.t : 0; });
    if (S.kelCari) rows = rows.filter((a) => (a.kel + ' ' + a.kec).toUpperCase().includes(S.kelCari));
    const by = { sisa: (a, b) => b.sisa - a.sisa, persen: (a, b) => a.p - b.p, nama: (a, b) => a.kel.localeCompare(b.kel) };
    rows.sort(by[S.kelSort]);
    rows.forEach((a) => {
      const tr = el('tr');
      const td = (t, cls) => { const c = el('td', cls, t); tr.append(c); return c; };
      td(a.kel, 'l'); td(a.kec || '—', 'l');
      td(nf.format(a.pt)); td(nf.format(a.pg)); td(nf.format(a.bt)); td(nf.format(a.bg)); td(nf.format(a.sisa));
      const p = td('');
      const s = el('span', a.p >= 0.5 ? 'ok' : a.p >= 0.2 ? 'warn' : 'bad', pf.format(a.p));
      const m = el('span', 'rp-mini'); const i = el('i'); i.style.width = a.p * 100 + '%'; i.style.background = a.p >= 0.5 ? GREEN : a.p >= 0.2 ? 'var(--color-warn)' : RED; m.append(i);
      p.append(s, m);
      tb.append(tr);
    });
  }

  // ---------- peta ----------
  let map, layer;
  function peta() {
    const box = $('#dil-peta'); if (!box || !window.L || !box.clientWidth) return;
    if (!map) {
      map = L.map(box, { preferCanvas: true, scrollWheelZoom: false, attributionControl: true });
      const esri = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/';
      L.tileLayer(esri + 'World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', { maxZoom: 16, attribution: 'Peta &copy; Esri, HERE, Garmin, &copy; OpenStreetMap' }).addTo(map);
      L.tileLayer(esri + 'World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', { maxZoom: 16, pane: 'shadowPane' }).addTo(map);
    }
    if (layer) layer.remove();
    layer = L.layerGroup().addTo(map);
    const o = {};
    S.ring.peta.forEach((r) => {
      if (!jenisOk(r)) return;
      const k = r.lat + ',' + r.lon;
      const a = o[k] = o[k] || { lat: r.lat, lon: r.lon, b: 0, g: 0, n: 0 };
      a.b += r.belum; a.g += r.terganti; a.n += r.jumlah;
    });
    const cells = Object.values(o).filter((c) => (S.status === 'belum' ? c.b : S.status === 'terganti' ? c.g : c.n) > 0);
    const val = (c) => (S.status === 'belum' ? c.b : S.status === 'terganti' ? c.g : c.n);
    const mx = d3.max(cells, val) || 1;
    const color = d3.interpolateRgb('#f87171', '#34d399');
    cells.forEach((c) => {
      const v = val(c);
      const p = c.n ? c.g / c.n : 0;
      L.circleMarker([c.lat, c.lon], { radius: 3 + 15 * Math.sqrt(v / mx), color: color(p), weight: 1, fillColor: color(p), fillOpacity: 0.55 })
        .bindTooltip(`<b>${nf.format(c.n)}</b> meter target<br>Terganti ${nf.format(c.g)} (${pf.format(p)})<br>Belum ${nf.format(c.b)}`, { sticky: true })
        .addTo(layer);
    });
    if (cells.length && !map._fitted) { map.fitBounds(cells.map((c) => [c.lat, c.lon]), { padding: [20, 20] }); map._fitted = true; }
    setTimeout(() => map.invalidateSize(), 50);
  }

  // ---------- unduh ----------
  const D = { jenis: 'Semua', kel: 'SEMUA', kat: 'target_belum' };
  const KAT = {
    target_belum: ['Target umur · belum terganti', (r, c) => r[c.TARGET_UMUR] === 'YA' && r[c.STATUS] === 'Belum terganti'],
    target_terganti: ['Target umur · sudah terganti', (r, c) => r[c.TARGET_UMUR] === 'YA' && r[c.STATUS] === 'Terganti'],
    target_semua: ['Semua target umur', (r, c) => r[c.TARGET_UMUR] === 'YA'],
    terganti_semua: ['Semua meter terganti (semua umur)', (r, c) => r[c.STATUS] === 'Terganti'],
    tahun_kosong: ['Tahun lama kosong · meter baru ≥ 2025', (r, c) => String(r[c.VALIDASI]).startsWith('Terganti · tahun lama kosong')],
  };
  async function buka(sandi) {
    const buf = new Uint8Array(await fetch('data/dil/detail.enc' + V).then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); }));
    if (String.fromCharCode(...buf.slice(0, 4)) !== 'DIL1') throw new Error('Format file tidak dikenal');
    const salt = buf.slice(4, 20), iv = buf.slice(20, 32), data = buf.slice(32);
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(sandi), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 310000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    let plain;
    try { plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data); } catch (e) { throw new Error('Kata sandi salah'); }
    const txt = await new Response(new Blob([plain]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
    return JSON.parse(txt);
  }
  async function muatDetail() {
    if (S.detail) return S.detail;
    const inp = $('#dil-dl-sandi');
    const sandi = inp ? inp.value : '';
    if (!sandi) { $('#dil-dl-info').textContent = 'Masukkan kata sandi untuk membuka data detail.'; inp?.focus(); throw new Error('Kata sandi kosong'); }
    $('#dil-dl-info').textContent = 'Membuka data detail…';
    const j = await buka(sandi);
    const c = {}; j.kolom.forEach((k, i) => { c[k] = i; });
    S.detail = { kolom: j.kolom, baris: j.baris, c };
    if (inp) { inp.value = ''; inp.disabled = true; inp.placeholder = 'Terbuka'; }
    const kels = Array.from(new Set(j.baris.map((r) => r[c.KELURAHAN]))).sort();
    const sel = $('#dil-dl-kel');
    sel.replaceChildren(new Option('Semua kelurahan', 'SEMUA'), ...kels.map((k) => new Option(k, k)));
    return S.detail;
  }
  function pilihDetail() {
    const { baris, c } = S.detail;
    const f = KAT[D.kat][1];
    return baris.filter((r) => f(r, c) && (D.jenis === 'Semua' || r[c.JENIS] === D.jenis) && (D.kel === 'SEMUA' || r[c.KELURAHAN] === D.kel));
  }
  async function hitungDl() {
    await muatDetail();
    const n = pilihDetail().length;
    $('#dil-dl-info').textContent = nf.format(n) + ' baris siap diunduh';
    document.querySelectorAll('#dil-unduh button[data-fmt]').forEach((b) => { b.disabled = !n; });
  }
  const namaFile = (ext) => ['DIL', S.ring.periode_awal + '-' + S.ring.periode_akhir, D.kat, D.jenis, D.kel === 'SEMUA' ? '' : D.kel].filter(Boolean).join('_').replace(/[^A-Za-z0-9_-]+/g, '-') + '.' + ext;
  const simpan = (blob, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); };
  async function unduh(fmt) {
    await muatDetail();
    const rows = pilihDetail();
    const head = S.detail.kolom;
    if (fmt === 'csv') {
      const q = (v) => { const s = String(v ?? ''); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
      const txt = '﻿' + [head, ...rows].map((r) => r.map(q).join(';')).join('\r\n');
      simpan(new Blob([txt], { type: 'text/csv;charset=utf-8' }), namaFile('csv'));
      return;
    }
    if (!window.XLSX) {
      $('#dil-dl-info').textContent = 'Menyiapkan Excel…';
      await new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload = ok; s.onerror = no; document.head.append(s); });
    }
    const num = new Set(['DAYA', 'UMUR', 'TAHUN_METER_LAMA']);
    const aoa = [head, ...rows.map((r) => r.map((v, i) => (num.has(head[i]) && v !== '' ? Number(v) : v)))];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = head.map((h) => ({ wch: Math.max(10, h.length + 2) }));
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: aoa.length - 1, c: head.length - 1 } }) };
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Detail');
    simpan(new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), namaFile('xlsx'));
    $('#dil-dl-info').textContent = nf.format(rows.length) + ' baris diunduh';
  }

  // ---------- klasifikasi (pie) ----------
  const VCOL = { 'Terganti · tervalidasi': 'var(--color-ok)', 'Terganti · perlu cek tahun meter baru': 'var(--color-warn)', 'Belum terganti': 'var(--color-bad)', 'Tidak ada / nomor kosong di DIL akhir': 'var(--cds-chart-muted)' };
  const KOSONG = (v) => String(v).startsWith('Terganti · tahun lama kosong');
  const VORD = Object.keys(VCOL);
  function klasifikasi() {
    const k = S.ring.klasifikasi || [];
    const pie = (id, rows, label) => {
      const box = $(id); if (!box) return;
      const items = VORD.map((v) => ({ label: v, value: sum(pick(rows, (r) => r.validasi === v), 'jumlah'), color: VCOL[v] }));
      const tot = d3.sum(items, (x) => x.value), ok = items[0].value + items[1].value;
      R.donut(box, items, tot ? pf.format(ok / tot) : '—', label);
    };
    pie('#dil-pie-paska', pick(k, (r) => r.target && r.jenis === 'Paskabayar'), 'terganti');
    pie('#dil-pie-pra', pick(k, (r) => r.target && r.jenis === 'Prabayar'), 'terganti');
    const sembunyi = (id, h) => { const b = $(id); if (b && b.parentElement) b.parentElement.hidden = h; };
    sembunyi('#dil-pie-paska', S.jenis === 'Prabayar'); sembunyi('#dil-pie-pra', S.jenis === 'Paskabayar');
    const box = $('#dil-pie-semua');
    if (box) {
      const g = pick(k, (r) => r.validasi.startsWith('Terganti') && jenisOk(r));
      const items = [
        { label: 'Meter tua · Paskabayar ≥ 15 th', value: sum(pick(g, (r) => r.target && r.jenis === 'Paskabayar'), 'jumlah'), color: 'var(--c1)' },
        { label: 'Meter tua · Prabayar ≥ 10 th', value: sum(pick(g, (r) => r.target && r.jenis === 'Prabayar'), 'jumlah'), color: 'var(--c2)' },
        { label: 'Bukan meter tua · Paskabayar', value: sum(pick(g, (r) => !r.target && !KOSONG(r.validasi) && r.jenis === 'Paskabayar'), 'jumlah'), color: 'var(--c3)' },
        { label: 'Bukan meter tua · Prabayar', value: sum(pick(g, (r) => !r.target && !KOSONG(r.validasi) && r.jenis === 'Prabayar'), 'jumlah'), color: 'var(--c4)' },
        { label: 'Tahun lama kosong · meter baru ≥ 2025', value: sum(pick(g, (r) => KOSONG(r.validasi)), 'jumlah'), color: 'var(--c6)' },
      ];
      const tot = d3.sum(items, (x) => x.value), tua = items[0].value + items[1].value;
      R.donut(box, items, tot ? pf.format(tua / tot) : '—', 'meter tua');
    }
    const bk = $('#dil-pie-kosong');
    if (bk) {
      const pop = sum(pick(S.ring.per_jenis_umur, (r) => r.cluster === 'Tahun tidak tercatat' && jenisOk(r)), 'jumlah');
      const kj = pick(k, (r) => jenisOk(r));
      const isi = sum(pick(kj, (r) => KOSONG(r.validasi)), 'jumlah');
      const lain = sum(pick(S.ring.per_jenis_umur, (r) => r.cluster === 'Tahun tidak tercatat' && jenisOk(r)), 'terganti') - isi;
      const items = [
        { label: 'Terganti · tahun buat baru ≥ 2025', value: isi, color: 'var(--color-ok)' },
        { label: 'Nomor meter berubah, tahun buat baru < 2025 / kosong', value: Math.max(0, lain), color: 'var(--color-warn)' },
        { label: 'Belum terganti / tetap kosong', value: Math.max(0, pop - isi - Math.max(0, lain)), color: 'var(--color-bad)' },
      ];
      R.donut(bk, items, pop ? pf.format(isi / pop) : '—', 'terganti');
    }
  }

  // ---------- breakdown meter belum diganti per kelas umur ----------
  const KELAS = [['0 – 5 tahun', '#34d399'], ['> 5 – 10 tahun', '#a3e635'], ['> 10 – 14 tahun', '#facc15'], ['> 14 – 20 tahun', '#fb923c'], ['> 20 tahun', '#f87171'], ['Tahun tidak tercatat', 'var(--cds-chart-muted)']];
  const BU = { pilih: 'Semua|Semua', status: 'belum' };
  const STATUS_BU = { belum: ['belum', 'belum diganti'], terganti: ['terganti', 'sudah diganti'], semua: ['jumlah', 'semua meter'] };
  function belumUmur() {
    const box = $('#dil-bu-chart'), tb = $('#dil-bu-tbl'); if (!box || !tb) return;
    if (!S.ring.umur_kelas) { R.failed(box); return; }
    const [j, f] = BU.pilih.split('|');
    const [kol, nama] = STATUS_BU[BU.status];
    const ok = (r) => (j === 'Semua' || r.jenis === j) && (f === 'Semua' || r.fasa === f);
    const rows = S.ring.umur_kelas.filter(ok);
    const tot = sum(rows, kol);
    const cats = KELAS.map(([k, col]) => {
      const r = rows.filter((x) => x.kelas_umur === k);
      const n = sum(r, kol);
      return { label: k, total: n, col, tgt: sum(r.filter((x) => x.target), kol), end: nf.format(n) + ' · ' + pf.format(tot ? n / tot : 0) };
    }).filter((c) => c.total > 0 || !c.label.startsWith('Tahun'));
    R.hstack(box, cats, (c) => [{ v: c.total, color: c.col, op: 1 }], { tip: (c) => [[c.col, 1, c.label, nf.format(c.total)], [null, 1, 'Porsi', pf.format(tot ? c.total / tot : 0)], [null, 1, 'Termasuk target umur', nf.format(c.tgt)]] });
    const merkRows = (S.ring.umur_kelas_merk || []).filter(ok);
    const body = tb.tBodies[0]; body.replaceChildren();
    cats.forEach((c) => {
      const m = {}; merkRows.filter((r) => r.kelas_umur === c.label).forEach((r) => { m[r.merk] = (m[r.merk] || 0) + Number(r[kol] || 0); });
      const top = Object.entries(m).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => k + ' (' + nf.format(v) + ')').join(', ');
      const tr = el('tr');
      const td0 = el('td', 'l'); const sw = el('i'); sw.style.cssText = 'display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:8px;background:' + c.col; td0.append(sw, c.label);
      tr.append(td0, el('td', '', nf.format(c.total)), el('td', '', pf.format(tot ? c.total / tot : 0)), el('td', '', c.tgt ? nf.format(c.tgt) : '–'), el('td', 'l wrap', top || '—'));
      body.append(tr);
    });
    const ft = tb.tFoot; ft.replaceChildren();
    const tTgt = sum(rows.filter((x) => x.target), kol);
    const tr = el('tr', 'total'); tr.append(el('td', 'l', 'Total ' + nama), el('td', '', nf.format(tot)), el('td', '', '100%'), el('td', '', nf.format(tTgt)), el('td', 'l', ''));
    ft.append(tr);
    const bu = S.ring.batas_umur;
    const cap = $('#dil-bu-cap');
    if (cap) cap.textContent = 'Status ' + nama + ' berdasarkan perbandingan DIL ' + S.ring.periode_awal + ' → ' + S.ring.periode_akhir + '; umur terhadap tahun ' + S.ring.tahun_acuan_umur +
      '. Kolom "Target umur" = bagian yang termasuk target (paskabayar ≥ ' + bu.Paskabayar + ' th, prabayar ≥ ' + bu.Prabayar + ' th) — totalnya sama dengan kartu target di atas. ' +
      'Fasa dari daya: 1 phasa s.d. 11.000 VA (kecuali 6.600 & 10.600 VA), selebihnya 3 phasa.';
  }

  // ---------- kontrol ----------
  function tekan(sel, attr, cur) { document.querySelectorAll(sel).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset[attr] === cur))); }
  function gambar() {
    if (!S.ring) return;
    tekan('#dil [data-dj]', 'dj', S.jenis);
    tekan('#dil [data-ds]', 'ds', S.status);
    tekan('#dil [data-ks]', 'ks', S.kelSort);
    kpi(); klasifikasi(); peta(); belumUmur(); umur(); bulan(); merk(); kelurahan();
  }
  function pasang() {
    document.querySelectorAll('#dil [data-dj]').forEach((b) => b.addEventListener('click', () => { S.jenis = b.dataset.dj; gambar(); }));
    document.querySelectorAll('#dil [data-ds]').forEach((b) => b.addEventListener('click', () => { S.status = b.dataset.ds; peta(); tekan('#dil [data-ds]', 'ds', S.status); }));
    document.querySelectorAll('#dil [data-ks]').forEach((b) => b.addEventListener('click', () => { S.kelSort = b.dataset.ks; kelurahan(); tekan('#dil [data-ks]', 'ks', S.kelSort); }));
    $('#dil-bu-sel')?.addEventListener('change', (e) => { BU.pilih = e.target.value; belumUmur(); });
    $('#dil-bu-st')?.addEventListener('change', (e) => { BU.status = e.target.value; belumUmur(); });
    $('#dil-kel-cari')?.addEventListener('input', (e) => { S.kelCari = e.target.value.trim().toUpperCase(); kelurahan(); });
    const coba = () => hitungDl().catch((e) => { $('#dil-dl-info').textContent = e.message === 'Kata sandi kosong' ? 'Masukkan kata sandi untuk membuka data detail.' : 'Gagal membuka: ' + e.message; });
    $('#dil-dl-jenis')?.addEventListener('change', (e) => { D.jenis = e.target.value; if (S.detail) coba(); });
    $('#dil-dl-kat')?.addEventListener('change', (e) => { D.kat = e.target.value; if (S.detail) coba(); });
    $('#dil-dl-kel')?.addEventListener('change', (e) => { D.kel = e.target.value; if (S.detail) coba(); });
    $('#dil-dl-siap')?.addEventListener('click', coba);
    $('#dil-dl-sandi')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') coba(); });
    document.querySelectorAll('#dil-unduh button[data-fmt]').forEach((b) => b.addEventListener('click', () => unduh(b.dataset.fmt).catch((e) => { $('#dil-dl-info').textContent = e.message === 'Kata sandi kosong' ? 'Masukkan kata sandi untuk membuka data detail.' : 'Gagal: ' + e.message; })));
    let t; window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(gambar, 200); });
    window.DIL_GAMBAR = () => gambar();
  }

  async function mulai() {
    pasang();
    ['#dil-bu-chart', '#dil-umur', '#dil-bulan', '#dil-merk', '#dil-pie-paska', '#dil-pie-pra', '#dil-pie-semua', '#dil-pie-kosong'].forEach((s) => { const e = $(s); if (e) R.memuat(e); });
    try {
      S.ring = await window.DASH_BUKA('data/dil/ringkasan.enc' + V);
      window.DIL_RING = S.ring; window.dispatchEvent(new Event('dil-siap'));
      gambar();
    } catch (e) {
      ['#dil-umur', '#dil-bulan', '#dil-merk'].forEach((s) => { const x = $(s); if (x) R.failed(x); });
      const cap = $('#dil-periode'); if (cap) cap.textContent = 'Data DIL gagal dimuat: ' + e.message;
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai); else mulai();
})();
