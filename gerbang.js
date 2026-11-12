// Gerbang masuk dashboard.
// Semua pengaturan (API key, ID spreadsheet) dan ringkasan DIL disimpan terenkripsi
// dengan "kunci data" acak (AES-256-GCM). Kunci data itu sendiri disimpan di data/kunci.json,
// terkunci dengan kata sandi (PBKDF2-SHA256). Tanpa kata sandi, dashboard tidak bisa membaca apa pun.
// Ganti / reset kata sandi: buka atur-sandi.html (lihat README.md bagian "Kata sandi dashboard").
(() => {
  const SKRIP = [
    'sumber.js?v=20261105-28', 'app.js?v=20261112-1', 'rekap.js?v=20261105-28', 'gambar.js?v=20261105-28',
    'tata.js?v=20261112-1', 'materi.js?v=20261109-2', 'peraturan.js?v=20261112-2', 'dil.js?v=20261112-3',
  ];
  const SIMPAN = 'dash-kunci';
  const te = new TextEncoder();
  const b64 = { ke: (u8) => btoa(String.fromCharCode(...u8)), dari: (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)) };

  async function bukaKunci(sandi) {
    const k = await fetch('data/kunci.json', { cache: 'no-cache' }).then((r) => { if (!r.ok) throw new Error('File kunci tidak ditemukan'); return r.json(); });
    const base = await crypto.subtle.importKey('raw', te.encode(sandi), 'PBKDF2', false, ['deriveKey']);
    const kk = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64.dari(k.salt), iterations: k.iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    try { return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64.dari(k.iv) }, kk, b64.dari(k.ct))); } catch (e) { throw new Error('Kata sandi salah'); }
  }
  let KUNCI = null;
  // Membuka file data terenkripsi (format 'DK01' | iv 12 byte | ciphertext gzip-JSON).
  async function bukaData(url) {
    const buf = new Uint8Array(await fetch(url, { cache: 'no-cache' }).then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); }));
    if (String.fromCharCode(...buf.slice(0, 4)) !== 'DK01') throw new Error('Format file tidak dikenal');
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf.slice(4, 16) }, KUNCI, buf.slice(16));
    return JSON.parse(await new Response(new Blob([plain]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
  }
  window.DASH_BUKA = bukaData;

  const muatSkrip = (src) => new Promise((ok, gagal) => { const s = document.createElement('script'); s.src = src; s.async = false; s.onload = ok; s.onerror = () => gagal(new Error('Gagal memuat ' + src)); document.body.append(s); });

  async function masuk(raw) {
    KUNCI = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
    window.DASH_CONFIG = await bukaData('data/config.enc');
  }
  async function jalankan() {
    document.body.classList.remove('terkunci');
    document.getElementById('gerbang')?.remove();
    for (const s of SKRIP) await muatSkrip(s);
    // skrip dimuat setelah halaman siap: kirim ulang sinyal "halaman siap" untuk skrip yang menunggunya
    document.dispatchEvent(new Event('DOMContentLoaded'));
  }
  const simpanKunci = (raw, ingat) => {
    try { (ingat ? localStorage : sessionStorage).setItem(SIMPAN, b64.ke(raw)); } catch (e) { /* abaikan */ }
  };
  window.DASH_KELUAR = () => {
    try { localStorage.removeItem(SIMPAN); sessionStorage.removeItem(SIMPAN); sessionStorage.removeItem('pt-sandi'); } catch (e) { /* abaikan */ }
    location.reload();
  };

  async function mulai() {
    // sudah pernah masuk di perangkat/tab ini?
    let tersimpan = null;
    try { tersimpan = sessionStorage.getItem(SIMPAN) || localStorage.getItem(SIMPAN); } catch (e) { /* abaikan */ }
    if (tersimpan) {
      try { await masuk(b64.dari(tersimpan)); return jalankan(); } catch (e) { try { localStorage.removeItem(SIMPAN); sessionStorage.removeItem(SIMPAN); } catch (e2) { /* abaikan */ } }
    }
    const g = document.getElementById('gerbang');
    g.hidden = false;
    const form = g.querySelector('form'), inp = g.querySelector('#gb-sandi'), btn = g.querySelector('button[type=submit]'), err = g.querySelector('.gb-err');
    inp.focus();
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!inp.value) { inp.focus(); return; }
      btn.disabled = true; btn.textContent = 'Membuka…'; err.textContent = '';
      try {
        const raw = await bukaKunci(inp.value);
        await masuk(raw);
        simpanKunci(raw, g.querySelector('#gb-ingat').checked);
        jalankan();
      } catch (ex) {
        err.textContent = ex.message === 'Kata sandi salah' ? 'Kata sandi salah. Coba lagi.' : 'Gagal membuka: ' + ex.message;
        btn.disabled = false; btn.textContent = 'Masuk'; inp.select();
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai, { once: true }); else mulai();
})();
