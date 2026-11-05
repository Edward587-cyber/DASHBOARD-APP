"""Bandingkan dua DIL SALDO (mis. 202506 dan 202609) dan buat data untuk dashboard.

Pakai:  pip install pandas python-calamine
        pip install cryptography
        DIL_SANDI='kata-sandi' python tools/olah_dil.py DIL_SALDO_MASK_202506_...xlsx DIL_SALDO_MASK_202609_...xlsx

Hasil: data/dil/ringkasan.json (rekap tanpa data pelanggan) dan data/dil/detail.enc (terenkripsi AES-GCM dengan DIL_SANDI)
(baris per pelanggan untuk unduhan: hanya pelanggan target umur atau yang meternya terganti;
tanpa nama, alamat, dan koordinat).
"""
import json, re, sys, os, gzip
import numpy as np
import pandas as pd
from python_calamine import CalamineWorkbook

UMUR_PASKA = 15   # paskabayar dihitung target bila umur >= 15 tahun
UMUR_PRA = 10     # prabayar dihitung target bila umur >= 10 tahun
COLS = ['IDPEL', 'TARIF', 'DAYA', 'JENISLAYANAN', 'NOMOR_METER_KWH', 'TANGGAL_PASANG_RUBAH_APP', 'MERK_METER_KWH',
        'TYPE_METER_KWH', 'TAHUN_TERA_METER_KWH', 'TAHUN_BUAT_METER_KWH', 'NOMOR_GARDU', 'STATUS_DIL',
        'KOORDINAT_X', 'KOORDINAT_Y']
OPT = ['NAMA_KELURAHAN', 'NAMA_KECAMATAN', 'V_BULAN_REKAP']


def teks(v):
    if v is None:
        return ''
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return str(v).strip()


def tanggal(v):
    if isinstance(v, (int, float)) and v > 20000:
        return pd.Timestamp('1899-12-30') + pd.Timedelta(days=float(v))
    try:
        return pd.Timestamp(v)
    except Exception:
        return pd.NaT


def baca(path):
    rows = CalamineWorkbook.from_path(path).get_sheet_by_name(CalamineWorkbook.from_path(path).sheet_names[0]).to_python()
    h = [str(x).strip() for x in rows[0]]
    cols = COLS + [c for c in OPT if c in h]
    idx = [h.index(c) for c in cols]
    df = pd.DataFrame([[r[i] if i < len(r) else None for i in idx] for r in rows[1:]], columns=cols)
    for c in ['IDPEL', 'NOMOR_METER_KWH', 'TARIF', 'JENISLAYANAN', 'MERK_METER_KWH', 'TYPE_METER_KWH', 'NOMOR_GARDU', 'STATUS_DIL'] + [c for c in OPT if c in df]:
        df[c] = df[c].map(teks)
    for c in ['DAYA', 'TAHUN_TERA_METER_KWH', 'TAHUN_BUAT_METER_KWH']:
        df[c] = pd.to_numeric(df[c].replace({'': None, ' ': None}), errors='coerce')
    df['TANGGAL_PASANG_RUBAH_APP'] = df['TANGGAL_PASANG_RUBAH_APP'].map(tanggal)
    for c in ['KOORDINAT_X', 'KOORDINAT_Y']:
        df[c] = pd.to_numeric(df[c], errors='coerce') / 1e10
    return df


def periode(path, df):
    m = re.search(r'(20\d{4})', os.path.basename(path))
    if m:
        return m.group(1)
    return str(int(pd.to_numeric(df.get('V_BULAN_REKAP'), errors='coerce').dropna().iloc[0]))


def merk(m):
    t = re.sub(r'[^A-Z0-9 ]', ' ', str(m or '').upper()).strip()
    t = re.sub(r'\s+', ' ', t)
    if not t or t.replace(' ', '').isdigit():
        return 'TIDAK TERBACA'
    flat = t.replace(' ', '')
    if flat.startswith('SMAR'):
        return 'SMART METER'
    for k in ['ITRON', 'HEXING', 'MELCOINDA', 'METBELOSA', 'WASION', 'OTHO', 'SANXING', 'SANGXING', 'LANDIS', 'GLOMET', 'EDMI', 'SCHLUMBERGER', 'FUJI', 'STAR', 'INHEMETER', 'HOLLEY', 'KAIFA', 'ACTARIS', 'ELSTER', 'ELIPS']:
        if flat.startswith(k):
            return k
    return t.split(' ')[0]


ITERASI = 310000


def enkripsi(data, sandi):
    # Format: 'DIL1' | salt(16) | iv(12) | ciphertext+tag. Kunci = PBKDF2-SHA256(sandi, salt, ITERASI).
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    from cryptography.hazmat.primitives import hashes
    salt, iv = os.urandom(16), os.urandom(12)
    key = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=ITERASI).derive(sandi.encode('utf-8'))
    return b'DIL1' + salt + iv + AESGCM(key).encrypt(iv, data, None)


def cluster(u):
    if pd.isna(u):
        return 'Tahun tidak tercatat'
    return '< 5 tahun' if u < 5 else '5 – < 10 tahun' if u < 10 else '10 – < 15 tahun' if u < 15 else '≥ 15 tahun'


def main(f_awal, f_akhir, out='data/dil'):
    a, b = baca(f_awal), baca(f_akhir)
    p_awal, p_akhir = periode(f_awal, a), periode(f_akhir, b)
    th_ref = int(p_awal[:4])
    a = a[(a.STATUS_DIL == 'AKTIF') & (a.NOMOR_METER_KWH != '')].copy()
    th = a.TAHUN_BUAT_METER_KWH.where(a.TAHUN_BUAT_METER_KWH.between(1950, th_ref))
    th = th.fillna(a.TAHUN_TERA_METER_KWH.where(a.TAHUN_TERA_METER_KWH.between(1950, th_ref)))
    a['TAHUN_METER'] = th
    a['UMUR'] = th_ref - th
    bb = b[['IDPEL', 'NOMOR_METER_KWH', 'JENISLAYANAN', 'MERK_METER_KWH', 'TYPE_METER_KWH', 'TANGGAL_PASANG_RUBAH_APP', 'STATUS_DIL'] + [c for c in ['NAMA_KELURAHAN', 'NAMA_KECAMATAN'] if c in b]]
    m = a.merge(bb, on='IDPEL', how='left', suffixes=('', '_BARU'))
    m['STATUS'] = np.select(
        [m.NOMOR_METER_KWH_BARU.isna(), m.NOMOR_METER_KWH_BARU == '', m.NOMOR_METER_KWH_BARU != m.NOMOR_METER_KWH],
        ['Tidak ada di DIL akhir', 'Nomor meter kosong', 'Terganti'], 'Belum terganti')
    m['JENIS'] = m.JENISLAYANAN.str.title()
    m['TARGET'] = ((m.JENISLAYANAN == 'PASKABAYAR') & (m.UMUR >= UMUR_PASKA)) | ((m.JENISLAYANAN == 'PRABAYAR') & (m.UMUR >= UMUR_PRA))
    m['CLUSTER'] = m.UMUR.map(cluster)
    m['MERK'] = m.MERK_METER_KWH.map(merk)
    m['KELURAHAN'] = m.get('NAMA_KELURAHAN', pd.Series('', index=m.index)).fillna('').replace('', 'TIDAK TERCATAT')
    m['KECAMATAN'] = m.get('NAMA_KECAMATAN', pd.Series('', index=m.index)).fillna('')
    tg = m.TANGGAL_PASANG_RUBAH_APP_BARU
    awal_ts = pd.Timestamp(p_awal[:4] + '-' + p_awal[4:] + '-01')
    m['BULAN_GANTI'] = np.where((m.STATUS == 'Terganti') & (tg >= awal_ts - pd.Timedelta(days=31)), tg.dt.strftime('%Y-%m'), '')
    m['TGL_PASANG_BARU'] = np.where(m.STATUS == 'Terganti', tg.dt.strftime('%Y-%m-%d'), '')

    def grp(keys):
        g = m.groupby(keys + ['STATUS'], dropna=False).size().unstack(fill_value=0)
        for c in ['Terganti', 'Belum terganti', 'Tidak ada di DIL akhir', 'Nomor meter kosong']:
            if c not in g:
                g[c] = 0
        g = g.reset_index()
        g['jumlah'] = g[['Terganti', 'Belum terganti', 'Tidak ada di DIL akhir', 'Nomor meter kosong']].sum(axis=1)
        g = g.rename(columns={'Terganti': 'terganti', 'Belum terganti': 'belum', 'Tidak ada di DIL akhir': 'hilang', 'Nomor meter kosong': 'kosong'})
        g.columns = [str(c).lower() for c in g.columns]
        return json.loads(g.to_json(orient='records'))

    # peta: sel ±0,005 derajat (± 550 m), tanpa titik pelanggan
    ok = m.KOORDINAT_X.between(-6.7, -6.0) & m.KOORDINAT_Y.between(106.5, 107.2) & m.TARGET
    gm = m[ok].assign(lat=(m.KOORDINAT_X[ok] / 0.005).round() * 0.005, lon=(m.KOORDINAT_Y[ok] / 0.005).round() * 0.005)
    peta = gm.groupby(['lat', 'lon', 'JENIS', 'STATUS']).size().unstack(fill_value=0).reset_index()
    for c in ['Terganti', 'Belum terganti']:
        if c not in peta:
            peta[c] = 0
    peta = [{'lat': round(r.lat, 4), 'lon': round(r.lon, 4), 'jenis': r.JENIS, 'belum': int(r['Belum terganti']), 'terganti': int(r['Terganti']),
             'jumlah': int(r[[c for c in peta.columns if c not in ('lat', 'lon', 'JENIS')]].sum())} for _, r in peta.iterrows()]

    ring = {
        'periode_awal': p_awal, 'periode_akhir': p_akhir, 'tahun_acuan_umur': th_ref,
        'batas_umur': {'Paskabayar': UMUR_PASKA, 'Prabayar': UMUR_PRA},
        'dibuat': pd.Timestamp.now(tz='Asia/Jakarta').strftime('%Y-%m-%d %H:%M'),
        'populasi': int(len(m)),
        'per_jenis_umur': grp(['JENIS', 'CLUSTER', 'TARGET']),
        'per_bulan': json.loads(m[m.BULAN_GANTI != ''].groupby(['BULAN_GANTI', 'JENIS', 'TARGET']).size().reset_index(name='jumlah').rename(columns=str.lower).to_json(orient='records')),
        'per_merk': grp(['JENIS', 'MERK', 'TARGET']),
        'per_kelurahan': grp(['JENIS', 'KECAMATAN', 'KELURAHAN', 'TARGET']),
        'peta': peta,
    }
    os.makedirs(out, exist_ok=True)
    with open(os.path.join(out, 'ringkasan.json'), 'w', encoding='utf-8') as f:
        json.dump(ring, f, ensure_ascii=False, separators=(',', ':'))

    d = m[m.TARGET | (m.STATUS == 'Terganti')]
    cols = {'IDPEL': 'IDPEL', 'JENIS': 'JENIS', 'TARIF': 'TARIF', 'DAYA': 'DAYA', 'KECAMATAN': 'KECAMATAN', 'KELURAHAN': 'KELURAHAN', 'NOMOR_GARDU': 'GARDU',
            'MERK_METER_KWH': 'MERK_LAMA', 'TYPE_METER_KWH': 'TYPE_LAMA', 'TAHUN_METER': 'TAHUN_METER_LAMA', 'UMUR': 'UMUR', 'CLUSTER': 'CLUSTER_UMUR',
            'TARGET': 'TARGET_UMUR', 'NOMOR_METER_KWH': 'NO_METER_' + p_awal, 'STATUS': 'STATUS', 'NOMOR_METER_KWH_BARU': 'NO_METER_' + p_akhir,
            'MERK_METER_KWH_BARU': 'MERK_BARU', 'JENISLAYANAN_BARU': 'JENIS_BARU', 'TGL_PASANG_BARU': 'TGL_PASANG_BARU'}
    d = d[list(cols)].rename(columns=cols)
    d['DAYA'] = d.DAYA.fillna(0).astype(int)
    d['TAHUN_METER_LAMA'] = d.TAHUN_METER_LAMA.astype('Int64').astype(str).replace('<NA>', '')
    d['UMUR'] = d.UMUR.astype('Int64').astype(str).replace('<NA>', '')
    d['TARGET_UMUR'] = np.where(d.TARGET_UMUR, 'YA', 'TIDAK')
    d = d.fillna('')
    sandi = os.environ.get('DIL_SANDI')
    if not sandi:
        sys.exit('Isi kata sandi lewat variabel lingkungan DIL_SANDI agar data detail terenkripsi.')
    raw = gzip.compress(json.dumps({'kolom': list(d.columns), 'baris': d.astype(str).values.tolist()}, ensure_ascii=False, separators=(',', ':')).encode('utf-8'))
    with open(os.path.join(out, 'detail.enc'), 'wb') as f:
        f.write(enkripsi(raw, sandi))
    lama = os.path.join(out, 'detail.json')
    if os.path.exists(lama):
        os.remove(lama)
    print('populasi', len(m), '| detail', len(d), '|', m.STATUS.value_counts().to_dict())
    print(pd.crosstab([m.JENIS, m.TARGET], m.STATUS, margins=True))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], *(sys.argv[3:4]))
