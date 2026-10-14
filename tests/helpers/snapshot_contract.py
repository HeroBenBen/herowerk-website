"""Unabhängige Sollbytes für Vertragsproben, ohne Aufruf des PHP-Verbrauchers."""
from decimal import Decimal
import hashlib
import json
import unicodedata


def cell(value):
    if value is None or value == '':
        return ''
    if isinstance(value, str):
        return unicodedata.normalize('NFC', value).strip()
    if isinstance(value, bool) or not isinstance(value, (int, float, Decimal)):
        raise ValueError('Keine kanonisierbare Vertragszelle')
    decimal = Decimal(str(value))
    if not decimal.is_finite():
        raise ValueError('Nicht endlich')
    text = format(decimal, 'f')
    return (text.rstrip('0').rstrip('.') if '.' in text else text) if decimal else '0'


def canonical(snapshot, contract):
    document = []
    for sheet in ['Preise_Wolf', 'Preise_Vaillant', 'Geräte_Katalog']:
        names = contract['katalog_identitaetskoepfe'] if sheet == 'Geräte_Katalog' else contract['preis_spalten']
        rows = snapshot['sheets'][sheet]
        header = next(i for i, row in enumerate(rows) if all(name in row for name in names))
        columns = [rows[header].index(name) for name in names]
        values = []
        for row in rows[header + 1:]:
            if not any(v is not None and v != '' for v in row):
                continue
            if sheet == 'Geräte_Katalog' and cell(row[columns[5]]).lower() != 'ja':
                continue
            values.append([cell(row[i] if i < len(row) else None) for i in columns])
        document.append([sheet, values])
    return json.dumps(document, ensure_ascii=False, separators=(',', ':'))


def seal(snapshot, contract):
    raw = canonical(snapshot, contract)
    digest = hashlib.sha256(raw.encode('utf-8')).hexdigest()
    rows = snapshot['sheets']['Referenz_Laeufe']
    rows[1][rows[0].index('inhalt_sha256')] = digest
    return raw, digest
