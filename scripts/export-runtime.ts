import { mkdir, readFile, copyFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { prepareRuntime } from './prepare-runtime';
import { distributionVersion, type RuntimeManifest } from '../runtime/config';

await prepareRuntime();
const source = path.resolve('.cache/runtime-assets', distributionVersion);
const destination = path.resolve('.cache/runtime-public', distributionVersion);
await mkdir(destination, { recursive: true });
const manifest: RuntimeManifest = JSON.parse(await readFile(path.join(source, 'manifest.json'), 'utf8'));
for (const file of ['manifest.json', manifest.wasm.file, ...manifest.packs.map(pack => pack.file)]) {
  await copyFile(path.join(source, file), path.join(destination, file));
}
await copyFile('third_party/lean-wasm/LICENSE', path.join(destination, 'LICENSE'));
await copyFile('third_party/lean-wasm/NOTICE.md', path.join(destination, 'NOTICE.md'));
await writeFile(path.join(destination, 'README.md'), `# Lean browser runtime data\n\nCompressed, prebuilt Lean ${manifest.version} compiler and Init library data.\n\nSource and build provenance: https://github.com/cauli/lean4-wasm-in-browser/tree/main/deploy\n\nRuntime: ${distributionVersion}. Each artifact has a SHA-256 checksum in manifest.json. Files ending in .pack contain gzip-compressed data; serve them without a Content-Encoding header.\n\nThis directory contains runtime data only, with no application source, credentials, or user programs.\n`);
console.log(`Runtime-only public bundle: ${destination}`);
console.log(`${(manifest.wasm.compressedBytes + manifest.packs.reduce((sum, pack) => sum + pack.compressedBytes, 0)).toLocaleString()} compressed bytes. No files were uploaded.`);
