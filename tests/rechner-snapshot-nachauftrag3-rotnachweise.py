"""Speicherschranke und Darstellung müssen durch Ergebnisassertionen geschützt sein."""
import os
from pathlib import Path
import subprocess

script = Path(__file__).with_name('rechner-snapshot-nachauftrag3.py')
for mutation, expected in [('speicher', 'speicherbytes'), ('position', 'gekuerzt'),
                           ('kopfzelle', 'technikzelle'), ('praezision', 'praezision'),
                           ('drahtformat', 'objekt-zeile'), ('rueckgabe', 'kaltstart-darstellung/kaltstart')]:
    env = dict(os.environ, P3A_N3_MUTATION=mutation, P3A_EXPECT_RED=expected)
    result = subprocess.run(['python3', str(script)], env=env, capture_output=True, text=True)
    print(result.stdout, end='')
    if result.returncode != 0:
        print(result.stderr)
        raise RuntimeError('Kein scharfer Rotnachweis: ' + mutation)
    print('PASS Speicher-Mutation ' + mutation)
