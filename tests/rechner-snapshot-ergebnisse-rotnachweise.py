"""Jede Mutation muss eine konkrete Ergebnisassertion brechen, keine bloße Annahme."""
import os
from pathlib import Path
import subprocess

script = Path(__file__).with_name('rechner-snapshot-ergebnisse.py')
for mutation, expected in [('kopf', 'verschoben'), ('zahl', 'zahltext'),
                           ('auswahl', 'gerätewahl-fremder-lauf'), ('config', 'config/defekter-link')]:
    env = dict(os.environ, P3A_RESULT_MUTATION=mutation, P3A_EXPECT_RED=expected)
    result = subprocess.run(['python3', str(script)], env=env, capture_output=True, text=True)
    print(result.stdout, end='')
    if result.returncode != 0:
        print(result.stderr)
        raise RuntimeError('Kein scharfer Ergebnis-Rotnachweis: ' + mutation)
    print('PASS Ergebnis-Mutation ' + mutation)
