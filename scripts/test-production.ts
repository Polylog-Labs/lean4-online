import { spawn } from 'node:child_process';
import { once } from 'node:events';

// Isolate CI's production server from an already-running development preview.
const port = 3100;
const url = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--port', String(port)], { stdio: 'inherit' });
let serverExited = false;
server.on('exit', () => { serverExited = true; });
try {
  const deadline = Date.now() + 30_000;
  while (true) {
    if (serverExited) throw new Error('Production server exited before becoming ready.');
    try { if ((await fetch(url)).ok) break; } catch { /* Starting. */ }
    if (Date.now() > deadline) throw new Error('Production server did not become ready.');
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  const test = spawn(process.execPath, ['--import', 'tsx', 'tests/verify-browser-runtime.ts'], {
    stdio: 'inherit', env: { ...process.env, LEAN_LAB_URL: url },
  });
  const [code] = await once(test, 'exit');
  if (code !== 0) throw new Error(`Browser smoke tests failed (exit ${code}).`);
} finally {
  if (!serverExited) {
    server.kill('SIGTERM');
    const timeout = setTimeout(() => server.kill('SIGKILL'), 5000);
    await once(server, 'exit');
    clearTimeout(timeout);
  }
}
