// Tab "Peraturan TEL": daftar dokumen dari folder Google Drive "KUMPULAN PERATURAN".
// Daftar (judul + ID file Drive) disimpan terenkripsi di data/peraturan.enc (AES-256-GCM,
// kunci dari kata sandi lewat PBKDF2) dan baru terbaca setelah kata sandi dimasukkan.
// Klik dokumen = dibuka di penampil di dalam dashboard (pratinjau Google Drive).
(() => {
  const SKEY = 'pt-sandi';
  const $ = (s, r = document) => r.querySelector(s);
  const h = (tag, attrs = {}, ...kids) => {
    const e = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => { if (v == null || v === false) return; if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v); });
    kids.flat().forEach((k) => { if (k == null || k === false) return; e.append(k.nodeType ? k : document.createTextNode(String(k))); });
    return e;
  };
  const JENIS = [
    ['pdf', 'PDF', ['pdf']],
    ['ppt', 'Presentasi', ['ppt', 'pptx']],
    ['doc', 'Dokumen Word', ['doc', 'docx']],
    ['xls', 'Excel', ['xls', 'xlsx', 'csv']],
    ['vid', 'Video', ['mp4', 'mov', 'avi', 'mkv']],
    ['img', 'Gambar', ['jpg', 'jpeg', 'png', 'gif', 'webp']],
    ['zip', 'Arsip (zip/rar)', ['zip', 'rar', 'tar', '7z', 'x-compressed', 'x-zip-compressed', 'x-tar']],
  ];
  const jenisOf = (t) => (JENIS.find(([, , ex]) => ex.includes(t)) || ['lain'])[0];
  const LABEL = { pdf: 'PDF', ppt: 'PPT', doc: 'DOC', xls: 'XLS', vid: 'VIDEO', img: 'IMG', zip: 'ZIP', lain: 'FILE' };
  const ukuran = (b) => (!b ? '' : b >= 1048576 ? (b / 1048576).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');
  const tgl = (s) => { if (!s) return ''; const d = new Date(s + 'T00:00:00'); return isNaN(d) ? '' : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); };
  const urutNama = (a, b) => (('c' in a) !== ('c' in b) ? ('c' in a ? -1 : 1) : a.n.localeCompare(b.n, 'id', { numeric: true, sensitivity: 'base' }));
  const rapikan = (ns) => ns.filter((n) => !n.n.startsWith('~$')).map((n) => ('c' in n ? { ...n, c: rapikan(n.c) } : n)).sort(urutNama);
  const hitung = (ns) => ns.reduce((s, n) => s + ('c' in n ? hitung(n.c) : 1), 0);
  const ratakan = (ns, jalur = []) => ns.flatMap((n) => ('c' in n ? ratakan(n.c, [...jalur, n.n]) : [{ ...n, jalur }]));

  const S = { pohon: null, sumber: '', tanggal: '', kat: 'semua', jenis: 'semua', cari: '', memuat: false, galat: '', sinkron: false, waktu: null, ketSinkron: '' };

  // ---------- sumber data (terenkripsi) ----------
  async function buka(sandi) {
    const buf = new Uint8Array(await fetch('data/peraturan.enc?v=' + (window.PERATURAN_VERSI || '1'), { cache: 'no-cache' }).then((r) => { if (!r.ok) throw new Error('File daftar tidak ditemukan'); return r.arrayBuffer(); }));
    if (String.fromCharCode(...buf.slice(0, 4)) !== 'DIL1') throw new Error('Format file tidak dikenal');
    const salt = buf.slice(4, 20), iv = buf.slice(20, 32), data = buf.slice(32);
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(sandi), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 310000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    let plain;
    try { plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data); } catch (e) { throw new Error('Kata sandi salah'); }
    return JSON.parse(await new Response(new Blob([plain]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
  }
  // Isi folder dibaca langsung dari Google Drive (ID folder hanya ada di dalam file terenkripsi),
  // sehingga file baru di Drive otomatis ikut tampil. Bila gagal, dipakai daftar salinan.
  const FOLDER = 'application/vnd.google-apps.folder';
  async function bacaLangsung(root) {
    const key = window.DASH_CONFIG && window.DASH_CONFIG.apiKey;
    if (!key || !root) throw new Error('tanpa API key / folder');
    const isi = async (id) => {
      let out = [], token = '';
      do {
        const u = 'https://www.googleapis.com/drive/v3/files?pageSize=1000&q=' + encodeURIComponent("'" + id + "' in parents and trashed=false") +
          '&fields=' + encodeURIComponent('nextPageToken,files(id,name,mimeType,size,modifiedTime,fileExtension)') + '&key=' + key + (token ? '&pageToken=' + token : '');
        const r = await fetch(u, { cache: 'no-store' });
        if (!r.ok) { let m = 'Drive ' + r.status; try { m = (await r.json()).error.message || m; } catch (e) { /* abaikan */ } throw new Error(m); }
        const j = await r.json(); out = out.concat(j.files || []); token = j.nextPageToken || '';
      } while (token);
      return Promise.all(out.map(async (f) => (f.mimeType === FOLDER ? { id: f.id, n: f.name, c: await isi(f.id) }
        : { id: f.id, n: f.name, t: (f.fileExtension || f.mimeType.split('/').pop()).toLowerCase(), s: Number(f.size || 0), m: (f.modifiedTime || '').slice(0, 10) })));
    };
    const pohon = await isi(root);
    if (!hitung(pohon)) throw new Error('folder kosong atau belum dibagikan');
    return pohon;
  }
  let ROOT = null, SPLN = null;
  // SPLN Online (intranet PLN, http): dibuka di tab baru dengan kata kunci dari dashboard.
  const urlSpln = (q) => SPLN.url + '?' + new URLSearchParams({ text: q || '', bidang: 'All', status: 'All', order: 'terbaru', asc: 'desc', submit: 'Search' });
  const cariSpln = (q) => { if (SPLN) window.open(urlSpln(q), '_blank', 'noopener'); };
  async function sinkron() {
    if (!ROOT || S.sinkron) return;
    S.sinkron = true; gambar();
    try { const p = await bacaLangsung(ROOT); if (S.pohon) { S.pohon = rapikan(p); S.sumber = 'langsung'; S.waktu = new Date(); S.ketSinkron = ''; } }
    catch (e) { S.ketSinkron = e.message; console.warn('Sinkron Drive gagal:', e.message); }
    S.sinkron = false;
    const jen = $('#pt-jenis'); if (jen && S.pohon) { const v = S.jenis; jen.replaceChildren(); S.jenis = v; }
    gambar();
    const jen2 = $('#pt-jenis'); if (jen2) jen2.value = S.jenis;
  }
  async function muat(sandi) {
    if (S.memuat) return;
    S.memuat = true; S.galat = ''; gambar();
    try {
      const j = await buka(sandi);
      ROOT = j.root || null; SPLN = j.spln || null;
      S.pohon = rapikan(j.isi); S.tanggal = j.dibuat; S.sumber = 'salinan';
      try { sessionStorage.setItem(SKEY, sandi); } catch (e) { /* abaikan */ }
    } catch (e) {
      S.galat = e.message;
      try { sessionStorage.removeItem(SKEY); } catch (e2) { /* abaikan */ }
    }
    S.memuat = false; gambar();
    if (S.pohon) sinkron();
  }
  const kunci = () => { ROOT = null; SPLN = null; S.pohon = null; S.galat = ''; S.cari = ''; S.kat = 'semua'; S.jenis = 'semua'; const c = $('#pt-cari'); if (c) c.value = ''; try { sessionStorage.removeItem(SKEY); } catch (e) { /* abaikan */ } const j = $('#pt-jenis'); if (j) j.replaceChildren(); gambar(); };

  // ---------- penampil ----------
  const urlPratinjau = (f) => 'https://drive.google.com/file/d/' + f.id + '/preview';
  const urlBuka = (f) => 'https://drive.google.com/file/d/' + f.id + '/view';
  const urlUnduh = (f) => 'https://drive.google.com/uc?export=download&id=' + f.id;
  function bukaPenampil(f) {
    const dlg = $('#pt-viewer'); if (!dlg) return;
    const j = jenisOf(f.t);
    $('#pt-v-judul', dlg).textContent = f.n;
    $('#pt-v-info', dlg).textContent = [(f.jalur || []).join(' › '), ukuran(f.s), tgl(f.m)].filter(Boolean).join(' · ');
    $('#pt-v-buka', dlg).href = urlBuka(f);
    $('#pt-v-unduh', dlg).href = urlUnduh(f);
    const body = $('#pt-v-isi', dlg);
    body.replaceChildren(j === 'zip'
      ? h('div', { class: 'pt-v-kosong' }, h('b', {}, 'File arsip tidak bisa ditampilkan langsung.'), h('p', {}, 'Gunakan tombol Unduh lalu ekstrak di komputer.'))
      : h('iframe', { src: urlPratinjau(f), title: 'Pratinjau ' + f.n, allow: 'autoplay; fullscreen', loading: 'eager' }));
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    document.body.classList.add('pt-modal');
  }
  function tutupPenampil() {
    const dlg = $('#pt-viewer'); if (!dlg) return;
    $('#pt-v-isi', dlg).replaceChildren();
    if (dlg.open && typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open');
    document.body.classList.remove('pt-modal');
  }

  // ---------- tampilan ----------
  const cocok = (f) => (S.jenis === 'semua' || jenisOf(f.t) === S.jenis) && (!S.cari || (f.n + ' ' + (f.jalur || []).join(' ')).toLowerCase().includes(S.cari));
  const barisFile = (f, jalur) => {
    const j = jenisOf(f.t);
    return h('li', {}, h('button', { type: 'button', class: 'pt-file', title: 'Baca ' + f.n, onclick: () => bukaPenampil({ ...f, jalur }) },
      h('span', { class: 'pt-ic pt-' + j, 'aria-hidden': 'true' }, LABEL[j]),
      h('span', { class: 'pt-nm' }, f.n.replace(/\.[a-z0-9]{2,4}$/i, ''), jalur && S.cari ? h('small', {}, jalur.join(' › ')) : null),
      h('span', { class: 'pt-meta' }, [ukuran(f.s), tgl(f.m)].filter(Boolean).join(' · '))));
  };
  const saring = (ns) => ns.map((n) => ('c' in n ? { ...n, c: saring(n.c) } : n)).filter((n) => ('c' in n ? hitung(n.c) > 0 : cocok(n)));
  const daftar = (ns, jalur, level) => h('ul', { class: 'pt-list' }, ns.map((n) => ('c' in n
    ? h('li', {}, h('details', { class: 'pt-folder', open: level < 1 || !!S.cari || S.jenis !== 'semua' },
      h('summary', {}, h('span', { class: 'pt-fd', 'aria-hidden': 'true' }), h('span', { class: 'pt-nm' }, n.n), h('span', { class: 'pt-n' }, hitung(n.c) + ' file')),
      daftar(n.c, [...jalur, n.n], level + 1)))
    : barisFile(n, jalur))));

  function gambar() {
    const box = $('#pt-isi'); if (!box) return;
    const info = $('#pt-sumber');
    const terkunci = !S.pohon;
    $('#pt-alat')?.toggleAttribute('hidden', terkunci);
    $('#pt-kunci-btn')?.toggleAttribute('hidden', terkunci);
    if (terkunci) {
      const ks = $('#pt-spln'); if (ks) { ks.hidden = true; ks.replaceChildren(); delete ks.dataset.siap; }
      $('#pt-jumlah').textContent = 'Terkunci';
      if (info) info.textContent = S.memuat ? 'Membuka…' : 'Masukkan kata sandi untuk melihat daftar dokumen';
      const inp = h('input', { type: 'password', id: 'pt-sandi', placeholder: 'Kata sandi', autocomplete: 'current-password', 'aria-label': 'Kata sandi Peraturan TEL' });
      const kirim = () => { if (inp.value) muat(inp.value); else inp.focus(); };
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') kirim(); });
      box.replaceChildren(h('div', { class: 'rp-card pt-lock' },
        h('div', { class: 'pt-lock-ic', 'aria-hidden': 'true' }, '🔒'),
        h('h3', {}, 'Dokumen dilindungi kata sandi'),
        h('p', { class: 'rp-cap' }, 'Daftar peraturan & SOP hanya untuk internal. Minta kata sandi kepada SPV Dal APP.'),
        h('div', { class: 'pt-lock-row' }, inp, h('button', { type: 'button', class: 'rp-btn primary', onclick: kirim, disabled: S.memuat }, S.memuat ? 'Membuka…' : 'Buka')),
        S.galat ? h('p', { class: 'pt-err', role: 'alert' }, S.galat) : null));
      if (!S.memuat) setTimeout(() => inp.focus({ preventScroll: true }), 0);
      return;
    }
    const kartuSpln = $('#pt-spln');
    if (kartuSpln) {
      kartuSpln.hidden = !SPLN;
      if (SPLN && !kartuSpln.dataset.siap) {
        kartuSpln.dataset.siap = '1';
        const q = h('input', { type: 'search', id: 'pt-spln-q', placeholder: 'Kata kunci SPLN, mis. kabel, kWh meter, D3.009…', autocomplete: 'off', 'aria-label': 'Kata kunci pencarian SPLN Online' });
        const go = () => cariSpln(q.value.trim());
        q.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
        kartuSpln.replaceChildren(
          h('div', { class: 'rp-ch' }, h('h3', {}, SPLN.nama), h('p', { class: 'rp-cap' }, 'Cari standar di SPLN Online langsung dari dashboard. Hasil terbuka di tab baru — hanya dapat diakses dari jaringan internal PLN.')),
          h('div', { class: 'pt-lock-row' }, q, h('button', { type: 'button', class: 'rp-btn primary', onclick: go }, 'Cari di SPLN Online ↗'), h('a', { class: 'rp-btn', href: urlSpln(''), target: '_blank', rel: 'noopener' }, 'Buka semua')));
      }
    }
    if (info) info.textContent = S.sinkron ? 'Menyinkronkan dengan Google Drive…'
      : S.sumber === 'langsung' ? 'Tersinkron otomatis dengan Google Drive (' + S.waktu.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ')'
      : 'Daftar per ' + tgl(S.tanggal) + (S.ketSinkron ? ' (sinkron otomatis belum aktif)' : '');
    // kategori (folder tingkat pertama)
    const kat = $('#pt-kat');
    if (kat) {
      const semua = hitung(S.pohon);
      kat.replaceChildren(...[['semua', 'Semua', semua], ...S.pohon.filter((n) => 'c' in n).map((n) => [n.id, n.n, hitung(n.c)])].map(([id, nm, c]) =>
        h('button', { type: 'button', 'aria-pressed': String(S.kat === id), onclick: () => { S.kat = id; gambar(); } }, nm, h('span', { class: 'pt-badge' }, c))));
    }
    const jen = $('#pt-jenis');
    if (jen && !jen.options.length) {
      const ada = new Set(ratakan(S.pohon).map((f) => jenisOf(f.t)));
      jen.append(h('option', { value: 'semua' }, 'Semua jenis'), ...JENIS.filter(([k]) => ada.has(k)).map(([k, l]) => h('option', { value: k }, l)));
    }
    const akar = S.kat === 'semua' ? S.pohon : (S.pohon.find((n) => n.id === S.kat) || {}).c || [];
    const tampil = saring(akar);
    const n = hitung(tampil);
    $('#pt-jumlah').textContent = n + ' dokumen';
    if (!n) { box.replaceChildren(h('p', { class: 'pt-empty' }, 'Tidak ada dokumen yang cocok dengan pencarian.')); return; }
    if (S.cari) {
      box.replaceChildren(h('div', { class: 'rp-card' }, h('ul', { class: 'pt-list flat' }, ratakan(tampil).map((f) => barisFile(f, f.jalur)))));
      return;
    }
    // satu kartu per folder tingkat atas yang tampil
    const kartu = S.kat === 'semua'
      ? tampil.map((n2) => ('c' in n2 ? h('div', { class: 'rp-card pt-card' }, h('div', { class: 'rp-ch' }, h('h3', {}, n2.n), h('p', { class: 'rp-cap' }, hitung(n2.c) + ' dokumen')), daftar(n2.c, [n2.n], 0)) : null))
      : [h('div', { class: 'rp-card pt-card' }, daftar(tampil, [(S.pohon.find((x) => x.id === S.kat) || {}).n], 0))];
    const lepas = S.kat === 'semua' ? tampil.filter((x) => !('c' in x)) : [];
    if (lepas.length) kartu.push(h('div', { class: 'rp-card pt-card' }, h('div', { class: 'rp-ch' }, h('h3', {}, 'Lainnya')), h('ul', { class: 'pt-list' }, lepas.map((f) => barisFile(f, [])))));
    box.replaceChildren(...kartu.filter(Boolean));
  }

  document.addEventListener('DOMContentLoaded', () => {
    const cari = $('#pt-cari');
    let t;
    cari?.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { S.cari = cari.value.trim().toLowerCase(); gambar(); }, 150); });
    $('#pt-jenis')?.addEventListener('change', (e) => { S.jenis = e.target.value; gambar(); });
    $('#pt-v-tutup')?.addEventListener('click', tutupPenampil);
    const dlg = $('#pt-viewer');
    dlg?.addEventListener('close', () => { $('#pt-v-isi', dlg).replaceChildren(); document.body.classList.remove('pt-modal'); });
    dlg?.addEventListener('click', (e) => { if (e.target === dlg) tutupPenampil(); });
    $('#pt-kunci-btn')?.addEventListener('click', kunci);
    gambar();
  });
  window.PERATURAN_GAMBAR = () => {
    let sandi = null; try { sandi = sessionStorage.getItem(SKEY); } catch (e) { /* abaikan */ }
    if (!S.pohon && sandi && !S.galat) muat(sandi); else { gambar(); if (S.pohon && (!S.waktu || Date.now() - S.waktu > 300000)) sinkron(); }
  };
})();
