// Kerangka kecil: menyimpan data, menghitung rekap (rekap.js), menggambar (gambar.js).
(() => {
  const C = window.DASH_CONFIG;
  const calcs = {};
  const draws = {};
  const onDatas = [];
  const state = { data: {}, status: {}, params: { k: 'SEMUA', ka: 'PENGGANTIAN KWH' } };
  let ready = false;
  try { const p = JSON.parse(localStorage.getItem('rp-params') || '{}'); Object.assign(state.params, p); } catch (e) { /* abaikan */ }

  const runDraw = (name) => document.querySelectorAll('[data-draw="' + name + '"]').forEach((el) => {
    try { draws[name](el); } catch (e) { console.error('Gagal menggambar', name, e); }
  });
  const renderAll = () => {
    onDatas.forEach((f) => { try { f(); } catch (e) { console.error(e); } });
    Object.keys(draws).forEach(runDraw);
  };

  window.dash = {
    colors: [1, 2, 3, 4, 5, 6, 7, 8].map((i) => 'var(--c' + i + ')'),
    calc: (id, o) => { calcs[id] = o; },
    draw: (name, fn) => { if (fn) draws[name] = fn; if (ready) runDraw(name); },
    data: (id) => ({ status: state.status[id] || 'loading', data: state.data[id] || [] }),
    params: () => state.params,
    setParams: (p) => {
      Object.assign(state.params, p);
      try { localStorage.setItem('rp-params', JSON.stringify(state.params)); } catch (e) { /* abaikan */ }
      renderAll();
    },
    onData: (fn) => { onDatas.push(fn); try { fn(); } catch (e) { /* belum siap */ } },
  };

  const statusEl = () => document.getElementById('status-muat');
  const bannerEl = () => document.getElementById('banner');
  const setStatus = (t) => { const el = statusEl(); if (el) el.textContent = t; };
  const setBanner = (lines) => {
    const el = bannerEl(); if (!el) return;
    el.replaceChildren();
    el.hidden = !lines.length;
    lines.forEach((l) => { const p = document.createElement('p'); p.textContent = l; el.append(p); });
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
    setStatus('Memuat data dari Google Sheets…');
    document.body.classList.add('is-loading');
    const errors = [];
    const tasks = C.kontraktor.map(async (k) => {
      const key = k.key.toLowerCase();
      try {
        const r = await window.SUMBER.bacaPelaksana(C.apiKey, k.spreadsheetId);
        state.data['m_' + key] = r.rows;
        state.data['rab_' + key] = r.rab;
      } catch (e) {
        errors.push('Lot ' + k.lot + ' · ' + k.nama + ': ' + e.message);
        state.data['m_' + key] = state.data['m_' + key] || [];
        state.data['rab_' + key] = state.data['rab_' + key] || [{}];
      }
    });
    tasks.push((async () => {
      try { state.data.kontrak = await window.SUMBER.bacaTagihan(C.apiKey, C.tagihanId, C.tagihanRange); } catch (e) { errors.push('LIST TAGIHAN: ' + e.message); state.data.kontrak = state.data.kontrak || []; }
    })());
    await Promise.all(tasks);
    Object.entries(calcs).forEach(([id, c]) => {
      try { state.data[id] = c.fn(...c.inputs.map((i) => state.data[i] || [])); state.status[id] = 'ok'; } catch (e) { console.error(id, e); state.status[id] = 'error'; errors.push('Perhitungan ' + id + ': ' + e.message); }
    });
    setBanner(errors.length ? ['Sebagian data gagal dimuat:', ...errors, 'Pastikan spreadsheet dibagikan "Siapa saja yang memiliki link" dan API key mengizinkan alamat halaman ini.'] : []);
    const now = new Date();
    setStatus('Terakhir dimuat ' + now.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }));
    document.body.classList.remove('is-loading');
    loading = false;
    renderAll();
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
