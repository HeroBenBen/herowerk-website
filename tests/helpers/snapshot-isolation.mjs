import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

export function snapshotTestEnvironment() {
  return Object.fromEntries(
    Object.entries(process.env).filter(([key]) =>
      /^(PATH|HOME|TMPDIR|TMP|TEMP|SystemRoot|PHP_CLI_SERVER_WORKERS|P3A_RUNTIME_DIR|P3A_TEST_ROOT|P3A_KEEP_ARTIFACTS)$/.test(
        key
      )
    )
  );
}

export async function snapshotTestRoot(prefix) {
  const parent = process.env.P3A_TEST_ROOT || os.tmpdir();
  await fs.mkdir(parent, { recursive: true });
  return fs.mkdtemp(path.join(parent, prefix));
}

export async function snapshotRuntime(root) {
  const runtime = process.env.P3A_RUNTIME_DIR || path.join(root, 'rechner-runtime');
  await fs.mkdir(runtime, { recursive: true });
  return runtime;
}

export async function preserveSnapshotState() {
  if (!process.env.P3A_RUNTIME_DIR) return;
  for (const name of ['werte_snapshot.json', 'werte_snapshot.lock']) {
    const source = path.join(process.env.P3A_RUNTIME_DIR, name);
    try {
      await fs.rename(source, `${source}.${Date.now()}.beleg`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}

export async function copySnapshotModules(sourceRoot, apiDirectory, runtime, upstreamUrl) {
  for (const name of [
    'rechner-values.php',
    'rechner-snapshot-integritaet.php',
    'rechner-snapshot-meldung.php',
  ]) {
    let source = await fs.readFile(path.join(sourceRoot, 'api', name), 'utf8');
    if (name === 'rechner-values.php') {
      if (!/^[a-zA-Z0-9_./-]+$/.test(runtime)) throw new Error('Unerwarteter Prüfpfad');
      source = source.replace(
        'declare(strict_types=1);',
        `declare(strict_types=1);\ndefine('RECHNER_RUNTIME_DIR', '${runtime}');`
      );
    }
    await fs.writeFile(path.join(apiDirectory, name), source);
  }
  await fs.writeFile(
    path.join(runtime, 'rechner-config.json'),
    JSON.stringify({ apps_script_url: upstreamUrl })
  );
}

export async function finishSnapshotRoots(roots) {
  if (process.env.P3A_KEEP_ARTIFACTS === '1') return;
  await Promise.all(roots.map((root) => fs.rm(root, { recursive: true, force: true })));
}
