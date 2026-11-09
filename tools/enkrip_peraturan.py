"""Mengenkripsi daftar dokumen Peraturan TEL (JSON) menjadi data/peraturan.enc.

Pemakaian:  PERATURAN_SANDI=... python3 tools/enkrip_peraturan.py daftar.json
Format sama dengan detail DIL: 'DIL1' | salt(16) | iv(12) | AES-256-GCM(gzip(json)).
File JSON polos JANGAN di-commit ke repo (repo publik).
"""
import gzip, json, os, sys
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

sandi = os.environ.get('PERATURAN_SANDI')
if not sandi or len(sys.argv) < 2:
    sys.exit('Set PERATURAN_SANDI dan beri path file JSON daftar dokumen.')
data = json.load(open(sys.argv[1], encoding='utf-8'))
raw = gzip.compress(json.dumps(data, ensure_ascii=False, separators=(',', ':')).encode('utf-8'))
salt, iv = os.urandom(16), os.urandom(12)
key = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=310000).derive(sandi.encode('utf-8'))
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'peraturan.enc')
open(out, 'wb').write(b'DIL1' + salt + iv + AESGCM(key).encrypt(iv, raw, None))
print('Tersimpan', os.path.normpath(out), os.path.getsize(out), 'byte')
