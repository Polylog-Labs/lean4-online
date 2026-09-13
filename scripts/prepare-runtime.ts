import { createHash } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, readFile, writeFile, readdir, copyFile, rename, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { distributionVersion, type RuntimeManifest } from '../runtime/config';

const root = fileURLToPath(new URL('../', import.meta.url));
const release = JSON.parse(await readFile(path.join(root, 'runtime/release.json'), 'utf8'));
const out = path.join(root, '.cache/runtime-assets', distributionVersion);
const publicOut = path.join(root, 'public/lean', distributionVersion);
const cache = path.join(root, '.cache/lean');
export const fixtureRoot = path.join(cache, release.assetVersion);
const hashFile = async (file: string) => {
  const hash = createHash('sha256');
  for await (const part of createReadStream(file)) hash.update(part);
  return hash.digest('hex');
};

export async function prepareRuntime() {
  if (existsSync(path.join(out, 'manifest.json')) && existsSync(path.join(fixtureRoot, 'lib/lean/Init.olean'))) { await publishRuntime(); return; }
  await mkdir(cache, { recursive: true });
  if (!existsSync(path.join(fixtureRoot, 'lib/lean/Init.olean'))) {
  const archive = process.env.LEAN_FIXTURE_ARCHIVE || path.join(cache, 'fixture.tar.gz');
  if (!existsSync(archive)) {
    console.log('Downloading the pinned Lean WebAssembly toolchain (277 MiB, cached after first setup)…');
    const result = spawnSync('curl', ['-fL', '--retry', '3', '--connect-timeout', '30', '--max-time', '1200', release.fixture.url, '-o', archive + '.partial'], { stdio: 'inherit' });
    if (result.status !== 0) throw new Error('Lean runtime download failed. Run npm run setup again.');
    await rename(archive + '.partial', archive);
  }
  if (await hashFile(archive) !== release.fixture.sha256) throw new Error('Lean archive checksum mismatch. Remove the cached archive and retry.');
  await mkdir(fixtureRoot, { recursive: true });
  const extracted = spawnSync('tar', ['-xzf', archive, '-C', fixtureRoot], { stdio: 'inherit' });
  if (extracted.status !== 0) throw new Error('Could not extract the Lean runtime.');
  }
  await writeFile(path.join(fixtureRoot, 'bin/package.json'), '{"type":"commonjs"}\n');
  await writeFile(path.join(fixtureRoot, 'runtime/slim/package.json'), '{"type":"commonjs"}\n');
  await mkdir(out, { recursive: true });
  for (const name of ['lean.js', 'lean.wasm']) {
    const source = path.join(fixtureRoot, 'runtime/slim', name);
    if (await hashFile(source) !== release.objects[`slim/${name}`].sha256) throw new Error(`Invalid runtime artifact: ${name}`);
    if (name === 'lean.js') await copyFile(source, path.join(out, name));
    else await writeFile(path.join(out, 'lean-wasm.pack'), gzipSync(await readFile(source), { level: 9 }));
  }
  const libRoot = path.join(fixtureRoot, 'lib/lean');
  const files: string[] = [];
  async function walk(dir: string) {
    for (const entry of await readdir(path.join(libRoot, dir), { withFileTypes: true })) {
      const name = path.posix.join(dir, entry.name);
      if (entry.isDirectory()) await walk(name);
      else if (/\.(olean|ir|ir\.sig)$/.test(name)) files.push(name);
    }
  }
  await walk('Init');
  for (const name of ['Init.olean', 'Init.ir', 'Init.ir.sig']) if (existsSync(path.join(libRoot, name))) files.push(name);
  type Entry = { name: string; offset: number; bytes: number };
  const packs: { file: string; bytes: number; compressedBytes: number; sha256: string; entries: Entry[] }[] = [];
  let entries: Entry[] = [], parts: Buffer[] = [], bytes = 0;
  async function flush() {
    if (!entries.length) return;
    const data = gzipSync(Buffer.concat(parts), { level: 9 });
    const file = `core-${packs.length}.pack`;
    await writeFile(path.join(out, file), data);
    packs.push({ file, bytes, compressedBytes: data.byteLength, sha256: createHash('sha256').update(data).digest('hex'), entries });
    entries = []; parts = []; bytes = 0;
  }
  for (const name of files.sort()) {
    const data = await readFile(path.join(libRoot, name));
    if (bytes + data.byteLength > 16 * 1024 * 1024) await flush();
    entries.push({ name, offset: bytes, bytes: data.byteLength });
    parts.push(data); bytes += data.byteLength;
  }
  await flush();
  const header = (await readFile(path.join(libRoot, 'Init.olean'))).subarray(0, 160).toString('latin1');
  const version = header.match(/4\.\d+\.\d+[^\0\s]*/)?.[0] || release.leanCommit.slice(0, 7);
  const wasmData = await readFile(path.join(out, 'lean-wasm.pack'));
  const wasm = { file: 'lean-wasm.pack', compressedBytes: wasmData.byteLength, sha256: createHash('sha256').update(wasmData).digest('hex') };
  await writeFile(path.join(out, 'manifest.json'), JSON.stringify({ version, assetVersion: release.assetVersion, leanCommit: release.leanCommit, wasm, packs }));
  await publishRuntime();
  console.log(`Lean ready: ${files.length} core files in ${packs.length} compressed packs, pinned to ${release.leanCommit.slice(0, 7)}.`);
}
async function publishRuntime() {
  await mkdir(publicOut, { recursive: true });
  const manifest: RuntimeManifest = JSON.parse(await readFile(path.join(out, 'manifest.json'), 'utf8'));
  for (const file of ['manifest.json', 'lean.js']) await copyFile(path.join(out, file), path.join(publicOut, file));
  for (const artifact of [manifest.wasm, ...manifest.packs]) {
    if (process.env.LEAN_ASSET_BASE_URL) await rm(path.join(publicOut, artifact.file), { force: true });
    else await copyFile(path.join(out, artifact.file), path.join(publicOut, artifact.file));
  }
  // Retire the earlier uncompressed distribution from new deployments.
  await rm(path.join(root, 'public/lean', `${release.assetVersion}-slim`), { recursive: true, force: true });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await prepareRuntime();
