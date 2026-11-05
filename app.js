// Kerangka kecil: menyimpan data, menghitung rekap (rekap.js), menggambar (gambar.js).
(() => {
  const C = window.DASH_CONFIG;
  const LIST = C.kontraktor.map((k) => ({ ...k, tahun: Number(k.tahun), id: k.tahun + '-' + k.key }));
  const TAHUN = Array.from(new Set(LIST.map((k) => k.tahun))).sort((a, b) => b - a);
  const calcs = {};
  const draws = {};
  const onDatas = [];
  const state = { data: {}, status: {}, loaded: {}, params: { tahun: TAHUN[0], k: 'SEMUA', ka: 'PENGGANTIAN KWH' } };
  let ready = false;
  try {
    const p = JSON.parse(localStorage.getItem('rp-params') || '{}');
    Object.assign(state.params, p);
    if (!TAHUN.includes(Number(state.params.tahun))) state.params.tahun = TAHUN[0];
    state.params.tahun = Number(state.params.tahun);
    if (state.params.k !== 'SEMUA' && !LIST.some((k) => k.id === state.params.k)) state.params.k = 'SEMUA';
  } catch (e) { /* abaikan */ }

  const runDraw = (name) => document.querySelectorAll('[data-draw="' + name + '"]').forEach((el) => {
    try { draws[name](el); } catch (e) { console.error('Gagal menggambar', name, e); }
  });
  const renderAll = () => {
    onDatas.forEach((f) => { try { f(); } catch (e) { console.error(e); } });
    Object.keys(draws).forEach(runDraw);
  };

  window.APP = { LIST, TAHUN, kontrakTahun: (th) => LIST.filter((k) => k.tahun === Number(th)).sort((a, b) => (a.lot || 0) - (b.lot || 0)) };

  window.dash = {
    colors: [1, 2, 3, 4, 5, 6, 7, 8].map((i) => 'var(--c' + i + ')'),
    calc: (id, o) => { calcs[id] = o; },
    draw: (name, fn) => { if (fn) draws[name] = fn; if (ready) runDraw(name); },
    data: (id) => ({ status: state.status[id] || 'loading', data: state.data[id] || [] }),
    params: () => state.params,
    setParams: (p) => {
      const tahunBerubah = p.tahun != null && Number(p.tahun) !== state.params.tahun;
      Object.assign(state.params, p);
      state.params.tahun = Number(state.params.tahun);
      try { localStorage.setItem('rp-params', JSON.stringify(state.params)); } catch (e) { /* abaikan */ }
      renderAll();
      if (tahunBerubah && APP.kontrakTahun(state.params.tahun).some((k) => !state.loaded[k.id])) muat();
    },
    onData: (fn) => { onDatas.push(fn); try { fn(); } catch (e) { /* belum siap */ } },
  };

  const setStatus = (t) => { const el = document.getElementById('status-muat'); if (el) el.textContent = t; };
  const setBanner = (lines) => {
    const el = document.getElementById('banner'); if (!el) return;
    el.replaceChildren();
    el.hidden = !lines.length;
    lines.forEach((l) => { const p = document.createElement('p'); p.textContent = l; el.append(p); });
  };

  const hitung = (errors) => {
    const list = LIST.filter((k) => state.loaded[k.id]);
    const src = {}, rab = {};
    list.forEach((k) => { src[k.id] = state.data['m_' + k.id] || []; rab[k.id] = (state.data['rab_' + k.id] || [{}])[0] || {}; });
    const ctx = { list, src, rab, kontrak: state.data.kontrak || [], get: (id) => state.data[id] || [] };
    Object.entries(calcs).forEach(([id, c]) => {
      try { state.data[id] = c.fn(ctx); state.status[id] = 'ok'; } catch (e) { console.error(id, e); state.status[id] = 'error'; errors.push('Perhitungan ' + id + ': ' + e.message); }
    });
  };

  let loading = false;
  async function muat() {
    if (loading) return;
    if (!C.apiKey || /ISI_API_KEY/.test(C.apiKey)) {
      setBanner(['API key belum diisi. Buka config.js dan isi apiKey (lihat README.md langkah 2).']);
      setStatus('Belum terhubung');
      Object.keys(calcs).forEach((id) => { state.status[id] = 'error'; });
      renderAll();
      return;
    }
    loading = true;
    const th = state.params.tahun;
    const target = APP.kontrakTahun(th);
    if (target.some((k) => !state.loaded[k.id])) Object.keys(calcs).forEach((id) => { state.status[id] = 'loading'; });
    renderAll();
    setStatus('Memuat data ' + th + '…');
    document.body.classList.add('is-loading');
    const errors = [];
    const tasks = target.map(async (k) => {
      try {
        const r = await window.SUMBER.bacaPelaksana(C.apiKey, k.spreadsheetId);
        state.data['m_' + k.id] = r.rows;
        state.data['rab_' + k.id] = r.rab;
        state.loaded[k.id] = true;
      } catch (e) {
        errors.push(k.tahun + ' · Lot ' + k.lot + ' · ' + k.nama + ': ' + e.message);
      }
    });
    tasks.push((async () => {
      try { state.data.kontrak = await window.SUMBER.bacaTagihan(C.apiKey, C.tagihanId, C.tagihanRange); } catch (e) { errors.push('LIST TAGIHAN: ' + e.message); state.data.kontrak = state.data.kontrak || []; }
    })());
    await Promise.all(tasks);
    hitung(errors);
    setBanner(errors.length ? ['Sebagian data gagal dimuat:', ...errors, 'Pastikan spreadsheet dibagikan "Siapa saja yang memiliki link" dan API key mengizinkan alamat halaman ini.'] : []);
    setStatus('Terakhir dimuat ' + new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }));
    document.body.classList.remove('is-loading');
    loading = false;
    renderAll();
    if (state.params.tahun !== th) muat();
  }

  document.addEventListener('DOMContentLoaded', () => {
    ready = true;
    renderAll();
    document.getElementById('muat-ulang')?.addEventListener('click', muat);
    muat();
    if (C.refreshMinutes > 0) setInterval(() => { if (!document.hidden) muat(); }, C.refreshMinutes * 60000);
    let t;
    let lastW = window.innerWidth;
    window.addEventListener('resize', () => { if (window.innerWidth === lastW) return; lastW = window.innerWidth; clearTimeout(t); t = setTimeout(renderAll, 150); });
  });
})();
