// Menu samping: pilihan tahun, daftar kontrak per tahun, dan penanda bagian yang sedang dilihat.
(() => {
  const yearsEl = document.getElementById('pilih-tahun');
  const listEl = document.getElementById('pilih-kontrak');
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

  const gambarSamping = () => {
    const p = dash.params();
    const th = Number(p.tahun);
    if (yearsEl) {
      yearsEl.replaceChildren();
      window.APP.TAHUN.forEach((y) => {
        const b = el('button', null, String(y)); b.type = 'button';
        b.setAttribute('aria-pressed', String(y === th));
        b.addEventListener('click', () => { if (y !== th) dash.setParams({ tahun: y, k: 'SEMUA' }); });
        yearsEl.append(b);
      });
    }
    if (listEl) {
      listEl.replaceChildren();
      const kontrak = window.APP.kontrakTahun(th);
      const all = el('button'); all.type = 'button';
      all.append(el('b', null, 'Semua kontrak ' + th), el('small', null, kontrak.length + ' kontrak'));
      all.setAttribute('aria-pressed', String((p.k || 'SEMUA') === 'SEMUA'));
      all.addEventListener('click', () => dash.setParams({ k: 'SEMUA' }));
      listEl.append(all);
      kontrak.forEach((k) => {
        const b = el('button'); b.type = 'button';
        b.append(el('b', null, k.nama), el('small', null, 'Lot ' + k.lot + ' · ' + k.spj + 'Pj'));
        b.setAttribute('aria-pressed', String(p.k === k.id));
        b.addEventListener('click', () => dash.setParams({ k: k.id }));
        listEl.append(b);
      });
    }
    const jt = document.getElementById('judul-tahun'); if (jt) jt.textContent = String(th);
    const st = document.getElementById('side-tahun'); if (st) st.textContent = String(th);
    document.title = 'Realisasi Penggantian APP ' + th + ' · UP3 Ciracas';
  };
  dash.onData(gambarSamping);

  // Tab: setiap menu menampilkan satu bagian saja; posisi tab disimpan di alamat (#nama).
  const links = Array.from(document.querySelectorAll('.rp-nav a[data-nav]'));
  const TABS = links.map((a) => a.dataset.nav);
  const tampil = (id, scroll) => {
    if (!TABS.includes(id)) id = TABS[0];
    links.forEach((a) => { const on = a.dataset.nav === id; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    document.querySelectorAll('#dash-root [data-tab]').forEach((s) => { s.hidden = s.dataset.tab !== id; });
    if (scroll) window.scrollTo({ top: 0 });
    // grafik di tab yang baru tampil digambar ulang setelah punya lebar
    requestAnimationFrame(() => { dash.setParams({}); if (id === 'dil' && window.DIL_GAMBAR) window.DIL_GAMBAR(); });
  };
  links.forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    if (location.hash !== '#' + a.dataset.nav) history.replaceState(null, '', '#' + a.dataset.nav);
    tampil(a.dataset.nav, true);
  }));
  document.querySelector('.rp-brand')?.addEventListener('click', (e) => { e.preventDefault(); history.replaceState(null, '', '#ringkasan'); tampil('ringkasan', true); });
  window.addEventListener('hashchange', () => tampil(location.hash.slice(1), true));
  const awal = location.hash.slice(1);
  tampil(awal === 'atas' ? 'ringkasan' : awal, false);
})();
