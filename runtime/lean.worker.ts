/// <reference lib="webworker" />
// The boot sequence follows cauli/lean4-wasm-in-browser (Apache-2.0).
// See third_party/lean-wasm for attribution and the exact pinned artifact.
import release from './release.json';
import { distributionVersion, runtimePath, type Artifact, type DownloadProgress, type RuntimeManifest } from './config';
import { readDownload } from './download';

declare const __LEAN_ASSET_BASE_URL__: string;

declare const self: DedicatedWorkerGlobalScope & { Module: LeanModule; runtimeKeepalivePush(): void };
interface LeanModule {
  FS: { mkdir(path: string): void; writeFile(path: string, data: Uint8Array): void; chdir(path: string): void };
  ENV: Record<string, string>;
  stringToNewUTF8(value: string): number;
  _lean_mk_string(ptr: number): number;
  _free(ptr: number): void;
  _lean_wasm_compile(code: number, file: number): number;
  _lean_initialize_runtime_module(): void;
  _lean_initialize(): void;
  _lean_io_mark_end_initialization(): void;
  _lean_init_task_manager?(): void;
  _lean_enable_initializer_execution?(): void;
  _lean_init_search_path(): number;
  _lean_io_result_show_error(ptr: number): void;
  getValue(ptr: number, type: string): number;
}
const base = runtimePath;
const assetBase = __LEAN_ASSET_BASE_URL__ || base;
const download: DownloadProgress = { received: 0, cached: 0, total: 0 };
let initialized = false;
let runId: number | null = null;
let outputBytes = 0;
let truncated = false;
function progress(message: string) { self.postMessage({ type: 'progress', message }); }
function downloadProgress() { self.postMessage({ type: 'progress', message: 'Downloading Lean', download: { ...download } }); }
function output(stream: 'stdout' | 'stderr', text: string) {
  const moduleProgress = /\[DEBUG:PROGRESS\]\s*(\d+)\/(\d+)/.exec(text);
  if (moduleProgress && runId === null) { progress(`Preparing Lean · ${moduleProgress[1]} / ${moduleProgress[2]} modules`); return; }
  if (/^\s*\[(WASM DEBUG|DEBUG|PROFILE|PWORKER|COMPILE)/.test(text) || /^\s*-\s+\/lib\/lean\//.test(text)) return;
  if (runId === null) return;
  outputBytes += text.length;
  if (outputBytes > 100_000) {
    if (!truncated) self.postMessage({ type: 'output', id: runId, stream: 'stderr', text: 'Output truncated after 100,000 characters.' });
    truncated = true;
    return;
  }
  self.postMessage({ type: 'output', id: runId, stream, text });
}
async function downloadArtifact(artifact: Artifact): Promise<Uint8Array<ArrayBuffer>> {
  const url = `${assetBase}/${artifact.file}`;
  let cache: Cache | undefined;
  try {
    cache = await caches.open(`lean-lab-${distributionVersion}`);
    const hit = await cache.match(artifact.sha256);
    if (hit) {
      try {
        const data = await readDownload(hit, artifact, () => {});
        download.cached += data.byteLength; downloadProgress(); return data;
      } catch { await cache.delete(artifact.sha256); }
    }
  } catch { /* Browser storage can be unavailable; execution still works. */ }
  const response = await fetch(url, { credentials: 'omit' });
  const data = await readDownload(response, artifact, bytes => { download.received += bytes; downloadProgress(); });
  try { await cache?.put(artifact.sha256, new Response(data)); } catch { /* Cache quota is optional. */ }
  return data;
}
function mkdir(path: string) {
  let current = '';
  for (const segment of path.split('/').filter(Boolean)) {
    current += '/' + segment;
    try { self.Module.FS.mkdir(current); } catch { /* Already exists. */ }
  }
}
function leanString(value: string) {
  const ptr = self.Module.stringToNewUTF8(value);
  const result = self.Module._lean_mk_string(ptr);
  self.Module._free(ptr);
  return result;
}
function compile(code: string): boolean {
  const result = self.Module._lean_wasm_compile(leanString(code), leanString('/workspace/Main.lean'));
  if ((self.Module.getValue(result + 7, 'i8') & 255) !== 0) {
    self.Module._lean_io_result_show_error(result);
    return false;
  }
  return true;
}
async function initialize() {
  progress('Reading runtime manifest');
  const response = await fetch(`${base}/manifest.json`);
  if (!response.ok) throw new Error('Could not load the Lean runtime manifest.');
  const manifest = await response.json() as RuntimeManifest;
  download.received = 0; download.cached = 0;
  download.total = manifest.wasm.compressedBytes + manifest.packs.reduce((sum, pack) => sum + pack.compressedBytes, 0);
  downloadProgress();
  const packedWasm = await downloadArtifact(manifest.wasm);
  const wasmBinary = await new Response(new Blob([packedWasm]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  const unpackedHash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', wasmBinary)), byte => byte.toString(16).padStart(2, '0')).join('');
  if (unpackedHash !== release.objects['slim/lean.wasm'].sha256) throw new Error('Lean compiler checksum mismatch.');
  // This upstream glue does not read Module.wasmBinary. Its normal fetch must
  // point at the verified in-memory bytes, or it downloads lean.wasm again.
  const wasmURL = URL.createObjectURL(new Blob([wasmBinary], { type: 'application/wasm' }));
  progress('Starting the WebAssembly compiler');
  try { await new Promise<void>((resolve, reject) => {
    const config = {
      noInitialRun: true,
      INITIAL_MEMORY: 1024 * 1024 * 1024,
      wasmMemory: new WebAssembly.Memory({ initial: 16384, maximum: 65536, shared: true }),
      locateFile: (file: string) => file === 'lean.wasm' ? wasmURL : `${base}/${file}`,
      mainScriptUrlOrBlob: `${base}/lean.js`,
      print: (text: string) => output('stdout', text),
      printErr: (text: string) => output('stderr', text),
      preRun: [() => {
        mkdir('/lib/lean'); mkdir('/workspace'); mkdir('/bin');
        self.Module.ENV.LEAN_PATH = '/lib/lean';
        self.Module.FS.chdir('/workspace');
      }],
      onRuntimeInitialized: () => {
        // This pinned Emscripten build exits when its async work drains unless
        // a keepalive is held. Exit closes stdin/stdout/stderr, breaking later
        // compile calls. Hold it for the lifetime of our persistent worker.
        self.runtimeKeepalivePush();
        resolve();
      },
      onAbort: (reason: string) => reject(new Error(`Lean could not start: ${reason}`)),
    };
    self.Module = config as unknown as LeanModule;
    try { importScripts(`${base}/lean.js`); } catch (error) { reject(error); }
  }); } finally { URL.revokeObjectURL(wasmURL); }
  for (const pack of manifest.packs) {
    const compressed = await downloadArtifact(pack);
    const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'));
    const data = new Uint8Array(await new Response(stream).arrayBuffer());
    for (const entry of pack.entries) {
      const file = `/lib/lean/${entry.name}`;
      mkdir(file.substring(0, file.lastIndexOf('/')));
      self.Module.FS.writeFile(file, data.subarray(entry.offset, entry.offset + entry.bytes));
    }
  }
  const m = self.Module;
  m._lean_initialize_runtime_module(); m._lean_initialize(); m._lean_io_mark_end_initialization();
  m._lean_init_task_manager?.(); m._lean_enable_initializer_execution?.();
  const result = m._lean_init_search_path();
  if ((m.getValue(result + 7, 'i8') & 255) !== 0) throw new Error('Lean could not initialize its library.');
  progress('Preparing Lean · the first import takes a moment');
  if (!compile('#check Nat')) throw new Error('Lean could not load its core library.');
  initialized = true;
  self.postMessage({ type: 'ready', version: manifest.version });
}
self.onmessage = async (event: MessageEvent<{ type: string; id: number; code: string }>) => {
  const message = event.data;
  try {
    if (message.type === 'init') { await initialize(); return; }
    if (message.type === 'run') {
      if (!initialized) throw new Error('Lean is still loading.');
      runId = message.id; outputBytes = 0; truncated = false;
      const start = performance.now();
      const success = compile(message.code);
      self.postMessage({ type: 'result', id: runId, success, elapsed: performance.now() - start });
      runId = null;
    }
  } catch (error) {
    self.postMessage({ type: 'error', id: runId, message: error instanceof Error ? error.message : String(error) });
    runId = null;
  }
};
