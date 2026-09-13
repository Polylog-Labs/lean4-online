import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';
import { distributionVersion, type RuntimeManifest } from '../runtime/config';

// Isolate the production preview and asset origin from the development server.
const url = 'http://127.0.0.1:3100';
const artifactRoot = path.resolve('.cache/runtime-assets', distributionVersion);
const manifest: RuntimeManifest = JSON.parse(await readFile(path.join(artifactRoot, 'manifest.json'), 'utf8'));
const artifactNames = new Set([manifest.wasm.file, ...manifest.packs.map(pack => pack.file)]);
const assets = createServer((request, response) => {
  const file = request.url?.slice(1) ?? '';
  if (!artifactNames.has(file)) { response.writeHead(404).end(); return; }
  response.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/octet-stream' });
  createReadStream(path.join(artifactRoot, file)).pipe(response);
});
const workerFile = 'public/lean-worker-cors-test.js';
let server: ReturnType<typeof spawn> | undefined;
let serverExited = false;
try {
  assets.listen(0, '127.0.0.1');
  await once(assets, 'listening');
  const address = assets.address();
  if (!address || typeof address === 'string') throw new Error('Missing asset test address.');
  const assetOrigin = `http://127.0.0.1:${address.port}`;
  await build({ entryPoints: ['runtime/lean.worker.ts'], outfile: workerFile, bundle: true, format: 'iife', platform: 'browser', target: 'es2022', define: { __LEAN_ASSET_BASE_URL__: JSON.stringify(assetOrigin) } });
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--port', '3100'], { stdio: 'inherit' });
  server.on('exit', () => { serverExited = true; });
  const deadline = Date.now() + 30_000;
  while (true) {
    if (serverExited) throw new Error('Production server exited before becoming ready.');
    try { if ((await fetch(url)).ok) break; } catch { /* Starting. */ }
    if (Date.now() > deadline) throw new Error('Production server did not become ready.');
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  const test = spawn(process.execPath, ['--import', 'tsx', 'tests/verify-browser-runtime.ts'], {
    stdio: 'inherit', env: { ...process.env, LEAN_LAB_URL: url, LEAN_LAB_WORKER_URL: '/lean-worker-cors-test.js', LEAN_LAB_EXPECT_ASSET_ORIGIN: assetOrigin },
  });
  const [code] = await once(test, 'exit');
  if (code !== 0) throw new Error(`Browser smoke tests failed (exit ${code}).`);
  const editorTest = spawn(process.execPath, ['--import', 'tsx', 'tests/verify-editor-webkit.ts'], {
    stdio: 'inherit', env: { ...process.env, LEAN_LAB_URL: url },
  });
  const [editorCode] = await once(editorTest, 'exit');
  if (editorCode !== 0) throw new Error(`WebKit editor test failed (exit ${editorCode}).`);
} finally {
  if (server && !serverExited) {
    server.kill('SIGTERM');
    const timeout = setTimeout(() => server?.kill('SIGKILL'), 5000);
    await once(server, 'exit');
    clearTimeout(timeout);
  }
  assets.closeAllConnections();
  await new Promise<void>(resolve => assets.close(() => resolve()));
  await rm(workerFile, { force: true });
}
