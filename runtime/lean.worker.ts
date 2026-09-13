/// <reference lib="webworker" />
// The boot sequence follows cauli/lean4-wasm-in-browser (Apache-2.0).
// See third_party/lean-wasm for attribution and the exact pinned artifact.
import release from './release.json';

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
interface Pack { file: string; entries: { name: string; offset: number; bytes: number }[] }
const base = `/lean/${release.assetVersion}-slim`;
let initialized = false;
let runId: number | null = null;
let outputBytes = 0;
let truncated = false;
function progress(message: string) { self.postMessage({ type: 'progress', message }); }
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
async function cachedFetch(url: string): Promise<Response> {
  let cache: Cache | undefined;
  try {
    cache = await caches.open(`lean-lab-${release.assetVersion}`);
    const hit = await cache.match(url);
    if (hit) return hit;
  } catch { /* Browser storage can be unavailable; execution still works. */ }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load Lean (${response.status}). Retry when your connection is available.`);
  try { await cache?.put(url, response.clone()); } catch { /* Cache quota is optional. */ }
  return response;
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
  progress('Loading Lean · downloading the compiler on first use');
  const manifest = await (await cachedFetch(`${base}/manifest.json`)).json() as { version: string; packs: Pack[] };
  const wasmBinary = await (await cachedFetch(`${base}/lean.wasm`)).arrayBuffer();
  progress('Starting the WebAssembly compiler');
  await new Promise<void>((resolve, reject) => {
    const config = {
      wasmBinary,
      noInitialRun: true,
      INITIAL_MEMORY: 1024 * 1024 * 1024,
      wasmMemory: new WebAssembly.Memory({ initial: 16384, maximum: 65536, shared: true }),
      locateFile: (file: string) => `${base}/${file}`,
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
  });
  for (const [index, pack] of manifest.packs.entries()) {
    progress(`Loading core library · ${index + 1} / ${manifest.packs.length}`);
    const response = await cachedFetch(`${base}/${pack.file}`);
    const stream = response.body!.pipeThrough(new DecompressionStream('gzip'));
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
