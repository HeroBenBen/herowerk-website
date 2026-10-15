"""Gezielte Mutationen müssen die neuen Vertrags- und Ergebnisassertionen brechen."""
import os
from pathlib import Path
import subprocess

script = Path(__file__).with_name('rechner-snapshot-nachauftrag2.py')
for mutation, expected in [('leer', 'leer/'), ('zahl', 'zahl/'), ('gross', 'gross/')]:
    env = dict(os.environ, P3A_N2_MUTATION=mutation, P3A_EXPECT_RED=expected)
    result = subprocess.run(['python3', str(script)], env=env, capture_output=True, text=True)
    print(result.stdout, end='')
    if result.returncode:
        print(result.stderr)
        raise RuntimeError('Kein scharfer Rotnachweis: ' + mutation)
    print('PASS Nachauftrag-Mutation ' + mutation)
