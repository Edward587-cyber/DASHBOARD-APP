// Tab "Peraturan TEL": daftar dokumen dari folder Google Drive "KUMPULAN PERATURAN".
// Daftar dibaca langsung dari Drive (bila Drive API aktif untuk API key dan folder dibagikan
// "Siapa saja yang memiliki link"); bila tidak, memakai salinan daftar data/peraturan.json.
// Klik dokumen = dibuka di penampil di dalam dashboard (pratinjau Google Drive).
(() => {
  const ROOT = (window.DASH_CONFIG && window.DASH_CONFIG.peraturanFolder) || '1g8m0IIySPPwREdicYg93ldRARTmIGIsw';
  const FOLDER = 'application/vnd.google-apps.folder';
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

  const S = { pohon: null, sumber: '', tanggal: '', kat: 'semua', jenis: 'semua', cari: '', memuat: false };

  // ---------- sumber data ----------
  async function bacaLangsung() {
    const key = window.DASH_CONFIG && window.DASH_CONFIG.apiKey;
    if (!key) throw new Error('tanpa API key');
    const isi = async (id) => {
      let out = [], token = '';
      do {
        const u = 'https://www.googleapis.com/drive/v3/files?pageSize=1000&q=' + encodeURIComponent("'" + id + "' in parents and trashed=false") +
          '&fields=' + encodeURIComponent('nextPageToken,files(id,name,mimeType,size,modifiedTime,fileExtension)') + '&key=' + key + (token ? '&pageToken=' + token : '');
        const r = await fetch(u); if (!r.ok) throw new Error('Drive ' + r.status);
        const j = await r.json(); out = out.concat(j.files || []); token = j.nextPageToken || '';
      } while (token);
      return Promise.all(out.map(async (f) => (f.mimeType === FOLDER ? { id: f.id, n: f.name, c: await isi(f.id) }
        : { id: f.id, n: f.name, t: (f.fileExtension || f.mimeType.split('/').pop()).toLowerCase(), s: Number(f.size || 0), m: (f.modifiedTime || '').slice(0, 10) })));
    };
    const pohon = await isi(ROOT);
    if (!hitung(pohon)) throw new Error('folder kosong / belum dibagikan');
    return pohon;
  }
  async function muat() {
    if (S.memuat || S.pohon) return;
    S.memuat = true; gambar();
    try { S.pohon = rapikan(await bacaLangsung()); S.sumber = 'langsung'; S.tanggal = new Date().toISOString().slice(0, 10); }
    catch (e) {
      try { const j = await fetch('data/peraturan.json?v=' + (window.PERATURAN_VERSI || '1')).then((r) => r.json()); S.pohon = rapikan(j.isi); S.sumber = 'salinan'; S.tanggal = j.dibuat; }
      catch (e2) { S.pohon = []; S.sumber = 'gagal'; }
    }
    S.memuat = false; gambar();
  }

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
    if (S.memuat || !S.pohon) { box.replaceChildren(h('p', { class: 'rp-cap' }, 'Memuat daftar dokumen…')); return; }
    if (info) info.textContent = S.sumber === 'langsung' ? 'Tersinkron langsung dengan Google Drive' : S.sumber === 'salinan' ? 'Daftar per ' + tgl(S.tanggal) : 'Daftar dokumen gagal dimuat';
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
    if (!n) { box.replaceChildren(h('p', { class: 'pt-empty' }, S.sumber === 'gagal' ? 'Daftar dokumen belum dapat dimuat.' : 'Tidak ada dokumen yang cocok dengan pencarian.')); return; }
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
    if (location.hash === '#peraturan') muat();
  });
  window.PERATURAN_GAMBAR = () => { if (!S.pohon) muat(); else gambar(); };
})();
