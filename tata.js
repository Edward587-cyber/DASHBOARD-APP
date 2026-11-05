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

  const links = Array.from(document.querySelectorAll('.rp-nav a[data-nav]'));
  const set = (id) => links.forEach((a) => a.classList.toggle('on', a.dataset.nav === id));
  const secs = links.map((a) => document.getElementById(a.dataset.nav)).filter(Boolean);
  const onScroll = () => {
    let cur = secs[0] && secs[0].id;
    secs.forEach((s) => { if (s.getBoundingClientRect().top < 140) cur = s.id; });
    if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4 && secs.length) cur = secs[secs.length - 1].id;
    set(cur);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  links.forEach((a) => a.addEventListener('click', () => set(a.dataset.nav)));
  onScroll();
})();
