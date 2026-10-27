// Engine und Startprogramm liegen in Dateien: argv enthält nur zwei kurze Dateipfade.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function runPhpEngine(source, script, options) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hw-php-engine-'));
  try {
    const engine = path.join(dir, 'rechner-engine.php');
    const runner = path.join(dir, 'runner.php');
    fs.writeFileSync(engine, source);
    fs.writeFileSync(runner, '<?php\n' + script);
    return spawnSync('php', [runner, engine], options);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

module.exports = { runPhpEngine };
