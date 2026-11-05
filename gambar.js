(() => {
  const nf = new Intl.NumberFormat('id-ID');
  const pf = new Intl.NumberFormat('id-ID', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const rp = (v) => (v ? 'Rp ' + nf.format(v) : '—');
  const TH = () => Number(dash.params().tahun);
  const K = () => { const k = dash.params().k || 'SEMUA'; return k === 'SEMUA' ? 'SEMUA-' + TH() : k; };
  const isAll = (k) => String(k).startsWith('SEMUA');
  const ofYear = (r) => Number(r.tahun) === TH();
  const cfgOf = (id) => window.APP.LIST.find((c) => c.id === id) || {};
  const lotOrder = (a, b) => (isAll(a.kontraktor) ? 99 : Number(a.lot) || 50) - (isAll(b.kontraktor) ? 99 : Number(b.lot) || 50);
  const KA = () => dash.params().ka || 'PENGGANTIAN KWH';
  const ok = (id) => dash.data(id).status === 'ok';
  const rowsOf = (id) => (ok(id) ? dash.data(id).data : []);
  const CL = ['< 10 tahun', '10 – < 15 tahun', '≥ 15 tahun', 'Tahun tidak tercatat'];
  const CLOP = [1, 1, 1, 1];
  const clColor = (i) => 'var(--u' + (i + 1) + ')';
  const KATS = ['PASKA 1 PHASA', 'PRABAYAR 1 PHASA', 'PRABAYAR 3 PHASA', 'PERIKSA', 'METER BOX'];
  const KLBL = { 'PASKA 1 PHASA': 'Paska 1P', 'PRABAYAR 1 PHASA': 'Prabayar 1P', 'PRABAYAR 3 PHASA': 'Prabayar 3P', PERIKSA: 'Periksa', 'METER BOX': 'Meter box' };
  const esc = (s) => encodeURIComponent(String(s));
  const placeholder = (el) => { el.textContent = '—'; };
  const failed = (el) => {
    el.replaceChildren();
    const d = document.createElement('div');
    d.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:6px;min-height:inherit;height:100%;font-size:var(--cds-font-size-caption);color:var(--color-fg-muted)';
    const dot = document.createElement('span');
    dot.style.cssText = 'width:.375rem;height:.375rem;border-radius:50%;background:var(--color-bad)';
    d.append(dot, document.createTextNode('Gagal memuat'));
    el.append(d);
  };
  const memuat = (el) => {
    el.replaceChildren();
    const d = document.createElement('div'); d.className = 'rp-loading';
    const s = document.createElement('span'); s.className = 'spin';
    d.append(s, document.createTextNode('Memuat data dari Google Sheets…'));
    el.append(d);
  };
  const capRow = () => rowsOf('capaian').find((r) => r.kontraktor === K());

  // filter tombol
  document.querySelectorAll('#realisasi-app [data-ka]').forEach((b) => b.addEventListener('click', () => dash.setParams({ ka: b.dataset.ka })));
  dash.onData(() => {
    document.querySelectorAll('#realisasi-app [data-ka]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ka === KA())));
  });
  let cari = '';
  document.querySelectorAll('#cari-alasan').forEach((inp) => inp.addEventListener('input', () => { cari = inp.value.trim().toUpperCase(); dash.draw('tbl-alasan'); }));

  // kalimat ringkasan
  dash.draw('t-real', (el) => { const r = capRow(); el.dataset.where = 'kontraktor=' + esc(K()); el.textContent = r ? nf.format(r.realisasi_kwh) : '—'; });
  dash.draw('t-target', (el) => { const r = capRow(); el.dataset.where = 'kontraktor=' + esc(K()); el.textContent = r ? nf.format(r.target_kwh) : '—'; });
  dash.draw('t-pct', (el) => { const r = capRow(); el.textContent = r && r.persen != null ? pf.format(r.persen) : '—'; });
  dash.draw('t-tua', (el) => {
    const rows = rowsOf('rekap_usia').filter((r) => r.kontraktor === K() && r.kategori === 'PENGGANTIAN KWH');
    const tot = d3.sum(rows, (r) => r.jumlah);
    const tua = d3.sum(rows.filter((r) => r.cluster_usia === '≥ 15 tahun'), (r) => r.jumlah);
    el.textContent = tot ? nf.format(tua) + ' (' + pf.format(tua / tot) + ')' : '—';
  });
  dash.draw('t-alasan', (el) => {
    const top = rowsOf('rekap_alasan').filter((r) => r.kontraktor === K() && r.kategori === 'PENGGANTIAN KWH').sort((a, b) => b.jumlah - a.jumlah)[0];
    if (top) el.dataset.where = 'kontraktor=' + esc(K()) + '&kategori=PENGGANTIAN%20KWH&kelompok_alasan=' + esc(top.kelompok_alasan);
    el.textContent = top ? top.kelompok_alasan.toLowerCase() : '—';
  });

  // KPI
  dash.draw('kpi-total', (el) => { const r = capRow(); el.dataset.where = 'kontraktor=' + esc(K()); el.textContent = r ? nf.format(r.realisasi_kwh) : '—'; });
  dash.draw('kpi-bar', (el) => {
    el.replaceChildren();
    const r = capRow(); if (!r || !r.target_kwh) return;
    const i = document.createElement('i');
    i.style.width = Math.min(100, (r.realisasi_kwh / r.target_kwh) * 100) + '%';
    if (r.persen < 0.9) i.style.background = 'var(--color-warn)';
    el.append(i);
  });
  dash.draw('kpi-total-sub', (el) => {
    const r = capRow(); if (!r) { el.textContent = '—'; return; }
    const s = r.selisih;
    el.textContent = pf.format(r.persen || 0) + ' dari target ' + nf.format(r.target_kwh) + ' · ' + (s >= 0 ? 'lebih ' + nf.format(s) : 'kurang ' + nf.format(-s));
    el.className = 'sub ' + (s >= 0 ? 'ok' : 'warn');
  });
  dash.draw('kpi', (el) => {
    const kat = el.dataset.kat;
    el.dataset.where = 'kontraktor=' + esc(K()) + '&kategori=' + esc(kat);
    const r = rowsOf('rekap_kategori').find((x) => x.kontraktor === K() && x.kategori === kat);
    el.textContent = r ? nf.format(r.realisasi) : '—';
  });
  dash.draw('kpi-3p-sub', (el) => { const r = capRow(); el.textContent = r ? 'target RAB ' + nf.format(r.target_3p) : '—'; });
  dash.draw('kpi-box-sub', (el) => {
    const r = rowsOf('rekap_kategori').find((x) => x.kontraktor === K() && x.kategori === 'BOX COMBO');
    el.textContent = r ? 'box terpasang · ' + nf.format(r.kwh_di_box) + ' kWh di box' : '—';
  });

  // tabel kontrak
  dash.draw('tbl-kontrak', (tb) => {
    tb.replaceChildren();
    const rows = rowsOf('capaian');
    rows.filter(ofYear).sort(lotOrder).forEach((r) => {
      const tr = document.createElement('tr');
      tr.dataset.key = r.kontraktor;
      if (isAll(r.kontraktor)) tr.className = 'total';
      if (!isAll(K()) && r.kontraktor !== K() && !isAll(r.kontraktor)) tr.style.opacity = '.45';
      const td = (txt, cls) => { const c = document.createElement('td'); if (cls) c.className = cls; c.textContent = txt; tr.append(c); return c; };
      td(r.lot || '', 'l');
      td(r.pelaksana || '', 'l');
      td(r.nomor_kontrak ? r.nomor_kontrak.split('/')[0] : '', 'l');
      const ta = td(r.tanggal_akhir || '—');
      if (r.jumlah_amandemen) ta.title = r.jumlah_amandemen + ' amandemen';
      td(nf.format(r.target_kwh));
      td(nf.format(r.realisasi_kwh));
      const p = td('');
      if (r.persen != null) {
        const s = document.createElement('span'); s.className = r.persen >= 1 ? 'ok' : r.persen >= 0.9 ? 'warn' : 'bad'; s.textContent = pf.format(r.persen);
        const m = document.createElement('span'); m.className = 'rp-mini'; const i = document.createElement('i'); i.style.width = Math.min(100, r.persen * 100) + '%'; i.style.background = r.persen >= 1 ? 'var(--color-ok)' : r.persen >= 0.9 ? 'var(--color-warn)' : 'var(--color-bad)'; m.append(i);
        p.append(s, m);
      }
      ['paska_1p', 'prabayar_1p', 'prabayar_3p', 'periksa', 'meter_box', 'box_combo', 'realisasi_rab', 'sebelum_spj'].forEach((f) => td(nf.format(r[f] || 0)));
      td(rp(r.nilai_kontrak));
      td(rp(r.total_tagihan));
      td(r.tagihan_terakhir || '—', 'l');
      tb.append(tr);
    });
  });

  // tooltip
  const tipOf = (box) => {
    let t = box.querySelector(':scope > .rp-tip');
    if (!t) { t = document.createElement('div'); t.className = 'rp-tip'; t.hidden = true; box.append(t); }
    return t;
  };
  const showTip = (box, ev, title, lines) => {
    const t = tipOf(box);
    t.replaceChildren();
    const h = document.createElement('div'); h.className = 't'; h.textContent = title; t.append(h);
    lines.forEach(([c, op, name, val]) => {
      const l = document.createElement('div');
      if (c) { const sw = document.createElement('span'); sw.className = 'sw'; sw.style.background = c; sw.style.opacity = op; l.append(sw); }
      l.append(document.createTextNode(name + ': ' + val)); t.append(l);
    });
    t.hidden = false;
    const b = box.getBoundingClientRect();
    let x = ev.clientX - b.left + 12, y = ev.clientY - b.top + 12;
    const w = t.offsetWidth, hh = t.offsetHeight;
    if (x + w > b.width) x = Math.max(0, ev.clientX - b.left - w - 12);
    if (y + hh > b.height + 40) y = Math.max(0, ev.clientY - b.top - hh - 12);
    t.style.left = x + 'px'; t.style.top = y + 'px';
  };
  const hideTip = (box) => { const t = box.querySelector(':scope > .rp-tip'); if (t) t.hidden = true; };

  // legenda cluster
  const legend = (el, items) => {
    el.replaceChildren();
    items.forEach(([c, op, name]) => { const s = document.createElement('span'); const i = document.createElement('i'); i.style.background = c; i.style.opacity = op; s.append(i, document.createTextNode(name)); el.append(s); });
  };
  const legUsia = (el) => { if (!ok(el.dataset.source)) { el.replaceChildren(); return; } legend(el, CL.map((c, i) => [clColor(i), CLOP[i], c])); };
  dash.draw('leg-usia', legUsia);
  dash.draw('leg-alasan', legUsia);

  // tile cluster
  dash.draw('clu-tiles', (el) => {
    el.replaceChildren();
    const st = dash.data('rekap_usia').status;
    if (st === 'error') { failed(el); return; }
    if (st !== 'ok') { el.textContent = '—'; return; }
    const rows = rowsOf('rekap_usia').filter((r) => r.kontraktor === K() && r.kategori === 'PENGGANTIAN KWH');
    const tot = d3.sum(rows, (r) => r.jumlah);
    CL.forEach((c, i) => {
      const r = rows.find((x) => x.cluster_usia === c) || { jumlah: 0 };
      const d = document.createElement('div');
      const l = document.createElement('span'); l.className = 'rp-cap'; l.textContent = c;
      const n = document.createElement('span'); n.className = 'n'; n.textContent = nf.format(r.jumlah);
      const s = document.createElement('span'); s.className = 'rp-cap'; s.textContent = (tot ? pf.format(r.jumlah / tot) : '—') + (r.rata_usia != null ? ' · rata-rata ' + String(r.rata_usia).replace('.', ',') + ' th' : '');
      const bar = document.createElement('div'); bar.className = 'rp-bar'; const bi = document.createElement('i'); bi.style.width = (tot ? (r.jumlah / tot) * 100 : 0) + '%'; bi.style.background = clColor(i); bi.style.opacity = CLOP[i]; bar.append(bi);
      d.append(l, n, s, bar);
      el.append(d);
    });
  });

  // stacked horizontal bars
  const hstack = (el, cats, getSeg, opts) => {
    el.replaceChildren();
    const W = el.clientWidth || 600;
    const rowH = 30, gap = 10;
    const ctx = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    el.append(ctx);
    const measure = (txt) => { const t = d3.select(ctx).append('text').attr('font-size', 12).text(txt); const w = t.node().getComputedTextLength(); t.remove(); return w; };
    const labW = Math.min(W * 0.42, d3.max(cats, (c) => measure(c.label)) + 10);
    const endW = d3.max(cats, (c) => measure(c.end)) + 10;
    const H = cats.length * (rowH + gap) + 6;
    ctx.setAttribute('width', '100%'); ctx.setAttribute('viewBox', `0 0 ${W} ${H}`); ctx.setAttribute('height', H);
    el.style.minHeight = H + 'px';
    const x = d3.scaleLinear([0, d3.max(cats, (c) => c.total) || 1], [labW, Math.max(labW + 40, W - endW)]);
    const svg = d3.select(ctx);
    cats.forEach((c, ci) => {
      const y = ci * (rowH + gap) + 3;
      svg.append('text').attr('x', labW - 8).attr('y', y + rowH / 2).attr('dy', '0.35em').attr('text-anchor', 'end').attr('class', 'strong').text(c.label);
      let acc = 0;
      getSeg(c).forEach((s) => {
        if (!s.v) return;
        const x0 = x(acc), x1 = x(acc + s.v);
        acc += s.v;
        svg.append('rect').attr('x', x0).attr('y', y).attr('width', Math.max(0.5, x1 - x0 - 1)).attr('height', rowH).attr('rx', 2)
          .attr('fill', s.color).attr('fill-opacity', s.op)
          .on('mousemove', (ev) => showTip(el, ev, c.label, opts.tip(c)))
          .on('mouseleave', () => hideTip(el));
      });
      svg.append('text').attr('x', x(c.total) + 6).attr('y', y + rowH / 2).attr('dy', '0.35em').text(c.end);
    });
  };

  dash.draw('ch-usia', (el) => {
    const st = dash.data('rekap_usia').status;
    if (st === 'error') { failed(el); return; }
    if (st !== 'ok') { memuat(el); return; }
    const rows = rowsOf('rekap_usia').filter((r) => r.kontraktor === K());
    const cats = KATS.map((kat) => {
      const rs = CL.map((c) => (rows.find((r) => r.kategori === kat && r.cluster_usia === c) || { jumlah: 0 }).jumlah);
      const total = d3.sum(rs);
      return { label: KLBL[kat], rs, total, end: nf.format(total) };
    }).filter((c) => c.total > 0);
    if (!cats.length) { el.replaceChildren(); const p = document.createElement('p'); p.className = 'rp-cap'; p.textContent = 'Belum ada data meter untuk pilihan ini.'; el.append(p); return; }
    hstack(el, cats, (c) => c.rs.map((v, i) => ({ v, color: clColor(i), op: CLOP[i] })), {
      tip: (c) => c.rs.map((v, i) => [clColor(i), CLOP[i], CL[i], nf.format(v) + ' (' + pf.format(c.total ? v / c.total : 0) + ')']),
    });
  });

  dash.draw('ch-alasan', (el) => {
    const st = dash.data('rekap_alasan').status;
    if (st === 'error') { failed(el); return; }
    if (st !== 'ok') { memuat(el); return; }
    const rows = rowsOf('rekap_alasan').filter((r) => r.kontraktor === K() && r.kategori === KA()).sort((a, b) => b.jumlah - a.jumlah);
    const tot = d3.sum(rows, (r) => r.jumlah);
    const cats = rows.map((r) => ({ label: r.kelompok_alasan, rs: [r.usia_lt10, r.usia_10_15, r.usia_ge15, r.usia_na], total: r.jumlah, end: nf.format(r.jumlah) + ' · ' + pf.format(tot ? r.jumlah / tot : 0) }));
    if (!cats.length) { el.replaceChildren(); const p = document.createElement('p'); p.className = 'rp-cap'; p.textContent = 'Belum ada penggantian untuk pilihan ini.'; el.append(p); return; }
    hstack(el, cats, (c) => c.rs.map((v, i) => ({ v, color: clColor(i), op: CLOP[i] })), {
      tip: (c) => c.rs.map((v, i) => [clColor(i), CLOP[i], CL[i], nf.format(v)]),
    });
  });

  dash.draw('tbl-alasan', (tb) => {
    tb.replaceChildren();
    rowsOf('rekap_alasan_detail').filter((r) => r.kontraktor === K() && (!cari || r.alasan.includes(cari) || r.kelompok_alasan.toUpperCase().includes(cari))).forEach((r) => {
      const tr = document.createElement('tr');
      tr.dataset.key = esc(r.kontraktor) + ',' + esc(r.alasan);
      const td = (t, cls) => { const c = document.createElement('td'); if (cls) c.className = cls; c.textContent = t; tr.append(c); };
      td(r.alasan, 'l wrap'); td(r.kelompok_alasan, 'l');
      td(nf.format(r.jumlah)); td(nf.format(r.paska_1p)); td(nf.format(r.prabayar_1p)); td(nf.format(r.prabayar_3p));
      td(r.rata_usia == null ? '—' : String(r.rata_usia).replace('.', ','));
      tb.append(tr);
    });
  });

  // tren bulanan
  const BKAT = ['PASKA 1 PHASA', 'PRABAYAR 1 PHASA', 'PRABAYAR 3 PHASA', 'PERIKSA', 'METER BOX'];
  const bulanNow = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
  dash.draw('leg-bulan', (el) => { if (!ok('rekap_bulan')) { el.replaceChildren(); return; } legend(el, BKAT.map((k, i) => [dash.colors[i], 1, KLBL[k]])); });
  dash.draw('ch-bulan', (el) => {
    const st = dash.data('rekap_bulan').status;
    if (st === 'error') { failed(el); return; }
    if (st !== 'ok') { memuat(el); return; }
    el.replaceChildren();
    const now = bulanNow();
    const rows = rowsOf('rekap_bulan').filter((r) => r.kontraktor === K() && r.bulan >= '2025-01' && r.bulan <= now);
    const months = Array.from(new Set(rows.map((r) => r.bulan))).sort();
    if (!months.length) { const p = document.createElement('p'); p.className = 'rp-cap'; p.textContent = 'Belum ada tanggal yang terbaca.'; el.append(p); return; }
    const data = months.map((m) => { const o = { bulan: m }; BKAT.forEach((k) => { o[k] = d3.sum(rows.filter((r) => r.bulan === m && r.kategori === k), (r) => r.jumlah); }); return o; });
    const series = d3.stack().keys(BKAT)(data);
    const W = el.clientWidth || 600, H = 260;
    const svgN = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    el.append(svgN); el.style.minHeight = H + 'px';
    const svg = d3.select(svgN).attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('height', H);
    const ymax = d3.max(data, (d) => d3.sum(BKAT, (k) => d[k])) || 1;
    const y = d3.scaleLinear([0, ymax], [H - 24, 8]).nice();
    const tmp = svg.append('text').attr('font-size', 12).text(nf.format(y.domain()[1]));
    const left = tmp.node().getComputedTextLength() + 10; tmp.remove();
    const x = d3.scaleBand(months, [left, W - 4]).padding(0.2);
    const fmtM = (m) => { const [yy, mm] = m.split('-'); return ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][+mm - 1] + ' ' + yy.slice(2); };
    y.ticks(4).forEach((t) => {
      svg.append('line').attr('x1', left).attr('x2', W - 4).attr('y1', y(t)).attr('y2', y(t)).attr('stroke', 'var(--cds-chart-grid)');
      svg.append('text').attr('x', left - 6).attr('y', y(t)).attr('dy', '0.35em').attr('text-anchor', 'end').text(nf.format(t));
    });
    const lw = d3.max(months, (m) => fmtM(m).length) * 7 + 6;
    const every = Math.max(1, Math.ceil(lw / x.bandwidth() / 1.25));
    months.forEach((m, i) => { if (i % every === 0) svg.append('text').attr('x', x(m) + x.bandwidth() / 2).attr('y', H - 6).attr('text-anchor', 'middle').text(fmtM(m)); });
    const bw = Math.min(32, x.bandwidth());
    series.forEach((s, si) => {
      svg.append('g').selectAll('rect').data(s).join('rect')
        .attr('x', (d) => x(d.data.bulan) + (x.bandwidth() - bw) / 2).attr('width', bw)
        .attr('y', (d) => y(d[1])).attr('height', (d) => Math.max(0, y(d[0]) - y(d[1]) - (d[1] > d[0] ? 1 : 0)))
        .attr('fill', dash.colors[si])
        .on('mousemove', (ev, d) => showTip(el, ev, fmtM(d.data.bulan) + ' · total ' + nf.format(d3.sum(BKAT, (k) => d.data[k])), BKAT.filter((k) => d.data[k]).map((k) => [dash.colors[BKAT.indexOf(k)], 1, KLBL[k], nf.format(d.data[k])])))
        .on('mouseleave', () => hideTip(el));
    });
  });

  dash.draw('ch-merk', (el) => {
    const st = dash.data('rekap_merk').status;
    if (st === 'error') { failed(el); return; }
    if (st !== 'ok') { memuat(el); return; }
    const rows = rowsOf('rekap_merk').filter((r) => r.kontraktor === K()).slice(0, 12);
    if (!rows.length) { el.replaceChildren(); const p = document.createElement('p'); p.className = 'rp-cap'; p.textContent = 'Belum ada data merk.'; el.append(p); return; }
    const cats = rows.map((r) => ({ label: r.merk, total: r.jumlah, rata: r.rata_usia, end: nf.format(r.jumlah) + (r.rata_usia != null ? ' · ' + String(r.rata_usia).replace('.', ',') + ' th' : '') }));
    hstack(el, cats, (c) => [{ v: c.total, color: dash.colors[1], op: 1 }], {
      tip: (c) => [[dash.colors[1], 1, 'Jumlah', nf.format(c.total)], [null, 1, 'Rata-rata umur', c.rata == null ? '—' : String(c.rata).replace('.', ',') + ' tahun']],
    });
  });
  // ---------- donut ----------
  const donut = (el, items, centerN, centerL) => {
    el.replaceChildren();
    items = items.filter((d) => d.value > 0);
    const tot = d3.sum(items, (d) => d.value);
    if (!tot) { const p = document.createElement('p'); p.className = 'rp-cap'; p.textContent = 'Belum ada data untuk pilihan ini.'; el.append(p); return; }
    const S = Math.min(220, Math.max(160, (el.clientWidth || 400) * 0.45));
    const R = S / 2, r0 = R * 0.62;
    const svgN = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    el.append(svgN);
    const svg = d3.select(svgN).attr('width', S).attr('height', S).attr('viewBox', `${-R} ${-R} ${S} ${S}`);
    const arcs = d3.pie().sort(null).value((d) => d.value).padAngle(0.012)(items);
    const arc = d3.arc().innerRadius(r0).outerRadius(R - 2).cornerRadius(3);
    const arcH = d3.arc().innerRadius(r0).outerRadius(R + 2).cornerRadius(3);
    svg.selectAll('path').data(arcs).join('path').attr('d', arc).attr('fill', (d) => d.data.color)
      .on('mousemove', function (ev, d) { d3.select(this).attr('d', arcH); showTip(el, ev, d.data.label, [[d.data.color, 1, 'Jumlah', nf.format(d.data.value)], [null, 1, 'Porsi', pf.format(d.data.value / tot)]]); })
      .on('mouseleave', function () { d3.select(this).attr('d', arc); hideTip(el); });
    svg.append('text').attr('class', 'center-n').attr('text-anchor', 'middle').attr('dy', '0.1em').text(centerN != null ? centerN : nf.format(tot));
    svg.append('text').attr('class', 'center-l').attr('text-anchor', 'middle').attr('dy', '1.7em').text(centerL || 'total');
    const leg = document.createElement('div'); leg.className = 'rp-dleg';
    items.forEach((d) => {
      const row = document.createElement('div');
      const i = document.createElement('i'); i.style.background = d.color;
      const l = document.createElement('span'); l.textContent = d.label;
      const v = document.createElement('span'); v.className = 'v'; v.textContent = nf.format(d.value);
      const p = document.createElement('span'); p.className = 'p'; p.textContent = pf.format(d.value / tot);
      row.append(i, l, v, p); leg.append(row);
    });
    el.append(leg);
  };
  const guard = (el, id) => {
    const st = dash.data(id).status;
    if (st === 'error') { failed(el); return false; }
    if (st !== 'ok') { memuat(el); return false; }
    return true;
  };

  dash.draw('dn-kategori', (el) => {
    if (!guard(el, 'rekap_kategori')) return;
    const KK = ['PASKA 1 PHASA', 'PRABAYAR 1 PHASA', 'PRABAYAR 3 PHASA', 'PERIKSA', 'METER BOX', 'BOX COMBO'];
    const LB = ['Paska 1P', 'Prabayar 1P', 'Prabayar 3P', 'Periksa', 'Meter box', 'Box combo'];
    const rows = rowsOf('rekap_kategori').filter((r) => r.kontraktor === K());
    donut(el, KK.map((k, i) => ({ label: LB[i], value: Number((rows.find((r) => r.kategori === k) || {}).realisasi || 0), color: dash.colors[i] })), null, 'pekerjaan');
  });

  dash.draw('dn-usia', (el) => {
    if (!guard(el, 'rekap_usia')) return;
    const rows = rowsOf('rekap_usia').filter((r) => r.kontraktor === K() && r.kategori === 'PENGGANTIAN KWH');
    const tot = d3.sum(rows, (r) => r.jumlah);
    const tua = d3.sum(rows.filter((r) => r.cluster_usia === '≥ 15 tahun'), (r) => r.jumlah);
    donut(el, CL.map((c, i) => ({ label: c, value: Number((rows.find((r) => r.cluster_usia === c) || {}).jumlah || 0), color: clColor(i) })), tot ? pf.format(tua / tot) : '—', 'berumur ≥ 15 th');
  });

  dash.draw('dn-alasan', (el) => {
    if (!guard(el, 'rekap_alasan')) return;
    const rows = rowsOf('rekap_alasan').filter((r) => r.kontraktor === K() && r.kategori === KA()).sort((a, b) => b.jumlah - a.jumlah);
    const pal = ['--c1', '--c6', '--c3', '--c2', '--c4', '--c7', '--c8', '--c5'];
    donut(el, rows.map((r, i) => ({ label: r.kelompok_alasan, value: r.jumlah, color: 'var(' + pal[i % pal.length] + ')' })), null, 'penggantian');
  });

  // ---------- gauge capaian ----------
  dash.draw('gauges', (el) => {
    if (!guard(el, 'capaian')) return;
    el.replaceChildren();
    rowsOf('capaian').filter(ofYear).sort(lotOrder).forEach((r) => {
      const box = document.createElement('div'); box.className = 'rp-gauge' + (K() === r.kontraktor ? ' on' : ''); box.tabIndex = 0;
      box.setAttribute('role', 'button');
      box.addEventListener('click', () => dash.setParams({ k: isAll(r.kontraktor) ? 'SEMUA' : r.kontraktor }));
      box.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dash.setParams({ k: isAll(r.kontraktor) ? 'SEMUA' : r.kontraktor }); } });
      const W = 150, H = 92, R = 66;
      const svgN = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const svg = d3.select(svgN).attr('width', W).attr('height', H).attr('viewBox', `0 0 ${W} ${H}`);
      const g = svg.append('g').attr('transform', `translate(${W / 2},${R + 8})`);
      const p = r.persen == null ? 0 : r.persen;
      const col = r.persen == null ? 'var(--cds-chart-muted)' : p >= 1 ? 'var(--color-ok)' : p >= 0.9 ? 'var(--color-warn)' : 'var(--color-bad)';
      const a = d3.arc().innerRadius(R - 12).outerRadius(R).cornerRadius(6).startAngle(-Math.PI / 2);
      g.append('path').attr('d', a({ endAngle: Math.PI / 2 })).attr('fill', 'var(--cds-chart-grid)');
      g.append('path').attr('d', a({ endAngle: -Math.PI / 2 + Math.PI * Math.min(1, p) })).attr('fill', col);
      g.append('text').attr('text-anchor', 'middle').attr('dy', '-0.2em').attr('font-size', 22).attr('fill', 'var(--color-fg)').text(r.persen == null ? '—' : pf.format(p));
      g.append('text').attr('text-anchor', 'middle').attr('dy', '1.1em').attr('font-size', 11).attr('fill', 'var(--color-fg-muted)').attr('font-family', 'var(--font-anthropic-sans)').text(nf.format(r.realisasi_kwh) + ' / ' + nf.format(r.target_kwh));
      const nm = document.createElement('div'); nm.className = 'nm';
      nm.textContent = isAll(r.kontraktor) ? 'Semua kontrak ' + r.tahun : 'Lot ' + r.lot + ' · ' + (cfgOf(r.kontraktor).nama || r.pelaksana);
      box.append(svgN, nm); el.append(box);
    });
  });

  // ---------- realisasi vs target per kontrak (batang bertumpuk + garis target) ----------
  const KF = [['paska_1p', 'Paska 1P'], ['prabayar_1p', 'Prabayar 1P'], ['prabayar_3p', 'Prabayar 3P']];
  dash.draw('leg-kontrak', (el) => { if (!ok('capaian')) { el.replaceChildren(); return; } legend(el, [...KF.map(([, l], i) => [dash.colors[i], 1, l]), ['var(--color-fg)', 1, 'Target RAB']]); });
  dash.draw('ch-kontrak', (el) => {
    if (!guard(el, 'capaian')) return;
    el.replaceChildren();
    const rows = rowsOf('capaian').filter((r) => ofYear(r) && !isAll(r.kontraktor)).sort(lotOrder);
    const W = el.clientWidth || 700, H = 260, L = 48, B = 34;
    const svgN = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); el.append(svgN); el.style.minHeight = H + 'px';
    const svg = d3.select(svgN).attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('height', H);
    const ymax = d3.max(rows, (r) => Math.max(r.target_kwh, r.realisasi_kwh)) || 1;
    const y = d3.scaleLinear([0, ymax * 1.08], [H - B, 10]).nice();
    const x = d3.scaleBand(rows.map((r) => r.kontraktor), [L, W - 8]).padding(0.35);
    y.ticks(4).forEach((t) => {
      svg.append('line').attr('x1', L).attr('x2', W - 8).attr('y1', y(t)).attr('y2', y(t)).attr('stroke', 'var(--cds-chart-grid)');
      svg.append('text').attr('x', L - 6).attr('y', y(t)).attr('dy', '0.35em').attr('text-anchor', 'end').text(nf.format(t));
    });
    const bw = Math.min(64, x.bandwidth());
    rows.forEach((r) => {
      const x0 = x(r.kontraktor) + (x.bandwidth() - bw) / 2;
      let acc = 0;
      const dim = !isAll(K()) && K() !== r.kontraktor ? 0.35 : 1;
      KF.forEach(([f, l], i) => {
        const v = Number(r[f] || 0); if (!v) return;
        svg.append('rect').attr('x', x0).attr('width', bw).attr('y', y(acc + v)).attr('height', Math.max(0, y(acc) - y(acc + v) - 1)).attr('rx', 2)
          .attr('fill', dash.colors[i]).attr('opacity', dim).style('cursor', 'pointer')
          .on('click', () => dash.setParams({ k: isAll(r.kontraktor) ? 'SEMUA' : r.kontraktor }))
          .on('mousemove', (ev) => showTip(el, ev, 'Lot ' + r.lot + ' · ' + (cfgOf(r.kontraktor).nama || ''), [...KF.map(([ff, ll], j) => [dash.colors[j], 1, ll, nf.format(r[ff] || 0)]), [null, 1, 'Target RAB', nf.format(r.target_kwh)], [null, 1, 'Capaian', r.persen == null ? '—' : pf.format(r.persen)]]))
          .on('mouseleave', () => hideTip(el));
        acc += v;
      });
      if (r.target_kwh) svg.append('line').attr('x1', x0 - 8).attr('x2', x0 + bw + 8).attr('y1', y(r.target_kwh)).attr('y2', y(r.target_kwh)).attr('stroke', 'var(--color-fg)').attr('stroke-width', 2).attr('stroke-dasharray', '5 3');
      svg.append('text').attr('class', 'strong').attr('x', x0 + bw / 2).attr('y', y(Math.max(acc, r.target_kwh)) - 8).attr('text-anchor', 'middle').text(r.persen == null ? '' : pf.format(r.persen));
      svg.append('text').attr('x', x0 + bw / 2).attr('y', H - 12).attr('text-anchor', 'middle').text('Lot ' + r.lot + ' · ' + (cfgOf(r.kontraktor).key || ''));
    });
  });
})();
