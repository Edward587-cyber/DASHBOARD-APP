"""Alat kunci dashboard (dijalankan di komputer, bukan di browser).

  python3 tools/kunci_dashboard.py baru SANDI                 -> buat kunci data baru + data/kunci.json, cetak kunci pemulihan
  python3 tools/kunci_dashboard.py sandi KUNCI_PEMULIHAN SANDI -> ganti kata sandi (data/kunci.json) memakai kunci pemulihan
  python3 tools/kunci_dashboard.py enkrip KUNCI_PEMULIHAN in.json out.enc -> enkripsi file JSON dengan kunci data

Format file data: 'DK01' | iv(12) | AES-256-GCM(gzip(json)).
data/kunci.json: kunci data (32 byte) dikunci kata sandi, PBKDF2-SHA256 310.000 iterasi.
Cara termudah mengganti sandi tanpa alat ini: buka atur-sandi.html di dashboard.
"""
import base64, gzip, json, os, sys
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

ITER = 310000
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
b64 = lambda b: base64.b64encode(b).decode()

def kunci_dari(teks):
    t = teks.replace(' ', '').replace('-', '+').replace('_', '/')
    k = base64.b64decode(t + '=' * (-len(t) % 4))
    assert len(k) == 32, 'kunci pemulihan tidak valid'
    return k

def pemulihan(k):
    s = base64.urlsafe_b64encode(k).decode().rstrip('=')
    return ' '.join(s[i:i + 4] for i in range(0, len(s), 4))

def tulis_kunci(k, sandi):
    salt, iv = os.urandom(16), os.urandom(12)
    kk = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=ITER).derive(sandi.encode('utf-8'))
    json.dump({'v': 1, 'iter': ITER, 'salt': b64(salt), 'iv': b64(iv), 'ct': b64(AESGCM(kk).encrypt(iv, k, None))},
              open(os.path.join(ROOT, 'data', 'kunci.json'), 'w'))

def enkrip(k, data, out):
    iv = os.urandom(12)
    raw = gzip.compress(json.dumps(data, ensure_ascii=False, separators=(',', ':')).encode('utf-8'))
    open(out, 'wb').write(b'DK01' + iv + AESGCM(k).encrypt(iv, raw, None))

if __name__ == '__main__':
    a = sys.argv[1:]
    if a[:1] == ['baru'] and len(a) == 2:
        k = os.urandom(32); tulis_kunci(k, a[1]); print('KUNCI PEMULIHAN (simpan baik-baik):', pemulihan(k))
    elif a[:1] == ['sandi'] and len(a) == 3:
        tulis_kunci(kunci_dari(a[1]), a[2]); print('data/kunci.json diperbarui')
    elif a[:1] == ['enkrip'] and len(a) == 4:
        enkrip(kunci_dari(a[1]), json.load(open(a[2], encoding='utf-8')), a[3]); print('Tersimpan', a[3])
    else:
        sys.exit(__doc__)
