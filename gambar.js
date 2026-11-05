(() => {
  const nf = new Intl.NumberFormat('id-ID');
  const pf = new Intl.NumberFormat('id-ID', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const rp = (v) => (v ? 'Rp ' + nf.format(v) : '—');
  const K = () => dash.params().k || 'SEMUA';
  const KA = () => dash.params().ka || 'PENGGANTIAN KWH';
  const ok = (id) => dash.data(id).status === 'ok';
  const rowsOf = (id) => (ok(id) ? dash.data(id).data : []);
  const CL = ['< 10 tahun', '10 – < 15 tahun', '≥ 15 tahun', 'Tahun tidak tercatat'];
  const CLOP = [0.35, 0.65, 1, 1];
  const clColor = (i) => (i === 3 ? 'var(--cds-chart-muted)' : dash.colors[0]);
  const KATS = ['PASKA 1 PHASA', 'PRABAYAR 1 PHASA', 'PRABAYAR 3 PHASA', 'PERIKSA', 'METER BOX'];
  const KLBL = { 'PASKA 1 PHASA': 'Paska 1P', 'PRABAYAR 1 PHASA': 'Prabayar 1P', 'PRABAYAR 3 PHASA': 'Prabayar 3P', PERIKSA: 'Periksa', 'METER BOX': 'Meter box' };
  const NAMA = { ANGGADA: 'Anggada Perkasa Tehnik', JATI: 'Jati Teknik', DHANA: 'Dhana Julaga Ekada', HAFIZ: 'Hafiz Energi Tama', SEMUA: 'Total 4 kontrak' };
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
  const capRow = () => rowsOf('capaian').find((r) => r.kontraktor === K());

  // filter tombol
  document.querySelectorAll('#realisasi-app [data-k]').forEach((b) => b.addEventListener('click', () => dash.setParams({ k: b.dataset.k })));
  document.querySelectorAll('#realisasi-app [data-ka]').forEach((b) => b.addEventListener('click', () => dash.setParams({ ka: b.dataset.ka })));
  dash.onData(() => {
    document.querySelectorAll('#realisasi-app [data-k]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.k === K())));
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
    const order = ['DHANA', 'HAFIZ', 'ANGGADA', 'JATI', 'SEMUA'];
    rows.slice().sort((a, b) => order.indexOf(a.kontraktor) - order.indexOf(b.kontraktor)).forEach((r) => {
      const tr = document.createElement('tr');
      tr.dataset.key = r.kontraktor;
      if (r.kontraktor === 'SEMUA') tr.className = 'total';
      if (K() !== 'SEMUA' && r.kontraktor !== K() && r.kontraktor !== 'SEMUA') tr.style.opacity = '.45';
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
    if (st !== 'ok') { el.replaceChildren(); return; }
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
    if (st !== 'ok') { el.replaceChildren(); return; }
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
    if (st !== 'ok') { el.replaceChildren(); return; }
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
    if (st !== 'ok') { el.replaceChildren(); return; }
    const rows = rowsOf('rekap_merk').filter((r) => r.kontraktor === K()).slice(0, 12);
    if (!rows.length) { el.replaceChildren(); const p = document.createElement('p'); p.className = 'rp-cap'; p.textContent = 'Belum ada data merk.'; el.append(p); return; }
    const cats = rows.map((r) => ({ label: r.merk, total: r.jumlah, rata: r.rata_usia, end: nf.format(r.jumlah) + (r.rata_usia != null ? ' · ' + String(r.rata_usia).replace('.', ',') + ' th' : '') }));
    hstack(el, cats, (c) => [{ v: c.total, color: dash.colors[1], op: 1 }], {
      tip: (c) => [[dash.colors[1], 1, 'Jumlah', nf.format(c.total)], [null, 1, 'Rata-rata umur', c.rata == null ? '—' : String(c.rata).replace('.', ',') + ' tahun']],
    });
  });
})();
