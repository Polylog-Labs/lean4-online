import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import type { OutputLine } from '../lib/lean';

// Emscripten's exported C API is the boundary to the untyped upstream glue.
interface Module {
  FS: { mkdir(path: string): void; chdir(path: string): void; mount(fs: unknown, options: { root: string }, at: string): void; filesystems: { NODEFS: unknown } };
  ENV: Record<string, string>;
  stringToNewUTF8(value: string): number; _lean_mk_string(ptr: number): number; _free(ptr: number): void;
  _lean_wasm_compile(code: number, file: number): number; _lean_initialize_runtime_module(): void; _lean_initialize(): void;
  _lean_io_mark_end_initialization(): void; _lean_init_task_manager?(): void; _lean_enable_initializer_execution?(): void;
  _lean_init_search_path(): number; _lean_io_result_show_error(ptr: number): void; getValue(ptr: number, type: string): number;
}
export async function bootLean(root: string) {
  const sourceFile = path.join(root, 'runtime/slim/lean.js');
  let lines: OutputLine[] = [];
  const onLine = (stream: 'stdout' | 'stderr', text: string) => {
    if (!/^\s*\[(WASM DEBUG|DEBUG|PROFILE|PWORKER|COMPILE)/.test(text) && !/^\s*-\s+\/.*\.olean/.test(text)) lines.push({ stream, text });
  };
  let resolve!: () => void, reject!: (error: Error) => void;
  const ready = new Promise<void>((res, rej) => { resolve = res; reject = rej; });
  const config = {
    noInitialRun: true, INITIAL_MEMORY: 1024 * 1024 * 1024,
    locateFile: (file: string) => path.join(root, 'runtime/slim', file),
    print: (text: string) => onLine('stdout', text), printErr: (text: string) => onLine('stderr', text),
    preRun: [() => {
      let current = '';
      for (const segment of root.split('/').filter(Boolean)) { current += '/' + segment; try { leanModule.FS.mkdir(current); } catch { /* Exists. */ } }
      leanModule.FS.mount(leanModule.FS.filesystems.NODEFS, { root }, root);
      leanModule.ENV.LEAN_PATH = path.join(root, 'lib/lean');
      leanModule.FS.mkdir('/workspace'); leanModule.FS.chdir('/workspace');
    }],
    onRuntimeInitialized: () => {
      try {
        leanModule._lean_initialize_runtime_module(); leanModule._lean_initialize(); leanModule._lean_io_mark_end_initialization();
        leanModule._lean_init_task_manager?.(); leanModule._lean_enable_initializer_execution?.();
        const result = leanModule._lean_init_search_path();
        if ((leanModule.getValue(result + 7, 'i8') & 255) !== 0) throw new Error('Lean search path initialization failed.');
        resolve();
      } catch (error) { reject(error as Error); }
    },
    onAbort: (reason: string) => reject(new Error(reason)),
  };
  const leanModule = config as unknown as Module;
  vm.compileFunction('var Module = config;\n' + fs.readFileSync(sourceFile, 'utf8'), ['config', 'require', 'module', '__filename', '__dirname'], { filename: sourceFile })(config, createRequire(sourceFile), { exports: {} }, sourceFile, path.dirname(sourceFile));
  await ready;
  const mkString = (text: string) => { const ptr = leanModule.stringToNewUTF8(text); const obj = leanModule._lean_mk_string(ptr); leanModule._free(ptr); return obj; };
  return (code: string) => {
    lines = [];
    const start = performance.now();
    const result = leanModule._lean_wasm_compile(mkString(code), mkString('/workspace/Main.lean'));
    const success = (leanModule.getValue(result + 7, 'i8') & 255) === 0;
    if (!success) leanModule._lean_io_result_show_error(result);
    return { success, lines, elapsed: performance.now() - start };
  };
}
