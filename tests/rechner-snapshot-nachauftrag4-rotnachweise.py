"""Die kanonische Identitätsdarstellung muss durch Verbraucherantworten gesichert sein."""
import os
from pathlib import Path
import subprocess

script = Path(__file__).with_name('rechner-snapshot-nachauftrag4.py')
r = subprocess.run(['python3', str(script)], env=dict(os.environ, P3A_N4_MUTATION='1', P3A_EXPECT_RED='1'),
                   capture_output=True, text=True)
print(r.stdout, end='')
assert r.returncode == 0, r.stderr
print('PASS Mutation kanonische Identität')
