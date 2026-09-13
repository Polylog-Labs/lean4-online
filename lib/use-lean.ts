'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { finishRun, type OutputLine, type RunResult } from './lean';
import type { DownloadProgress } from '../runtime/config';
import { usesWebKit } from './browser-compatibility';

type State = 'idle' | 'loading' | 'ready' | 'running' | 'error';
export function useLean(editorReady = false) {
  const [state, setState] = useState<State>('idle');
  const [progress, setProgress] = useState('Runtime not loaded');
  const [download, setDownload] = useState<DownloadProgress | null>(null);
  const [version, setVersion] = useState('Lean 4');
  const worker = useRef<Worker | null>(null);
  const runtimeCache = useRef<Cache | null>(null);
  const workerReady = useRef(false);
  const initializationDownload = useRef<DownloadProgress | undefined>(undefined);
  const init = useRef<{ promise: Promise<void>; resolve(): void; reject(error: Error): void } | null>(null);
  const pending = useRef<{ id: number; lines: OutputLine[]; compilerDownload?: DownloadProgress | null; resolve(result: RunResult): void; reject(error: Error): void } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextId = useRef(0);
  const backgroundStarted = useRef(false);
  const generation = useRef(0);
  const clearTimer = useCallback(() => { if (timer.current) clearTimeout(timer.current); timer.current = null; }, []);
  const reset = useCallback((message: string, errorState = false) => {
    generation.current++;
    clearTimer();
    worker.current?.terminate(); worker.current = null;
    workerReady.current = false;
    init.current?.reject(new Error(message)); init.current = null;
    pending.current?.reject(new Error(message)); pending.current = null;
    setState(errorState ? 'error' : 'idle'); setProgress(message);
    setDownload(null);
  }, [clearTimer]);

  const start = useCallback(async () => {
    if (init.current) return init.current.promise;
    if (!window.crossOriginIsolated || typeof SharedArrayBuffer === 'undefined') {
      throw new Error('Lean needs cross-origin isolation. Open this app directly in a browser tab with its COOP/COEP hosting headers enabled.');
    }
    if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot load Lean. Please use a current desktop Chrome, Firefox, or Safari.');
    setState('loading'); setProgress('Checking for a cached Lean compiler'); setDownload(null);
    workerReady.current = false; initializationDownload.current = undefined;
    let resolve!: () => void, reject!: (error: Error) => void;
    const promise = new Promise<void>((res, rej) => { resolve = res; reject = rej; });
    init.current = { promise, resolve, reject };
    try {
      const instance = new Worker('/lean-worker.js'); worker.current = instance;
      instance.onerror = () => { if (worker.current === instance) reset('The Lean worker stopped unexpectedly. Try running again.', true); };
      let recycleWorker = false;
      instance.onmessage = async (event) => {
        if (worker.current !== instance) return;
        const message = event.data;
        if (message.type === 'progress') {
          setProgress(message.message);
          if (message.download) { initializationDownload.current = message.download; setDownload(message.download); }
        }
        if (message.type === 'ready') {
          if (usesWebKit(navigator.userAgent) && message.cacheName) {
            try {
              // WebKit can discard worker-owned Cache Storage when its last
              // worker closes. Keep a page-owned handle across compiler runs.
              runtimeCache.current = await caches.open(message.cacheName);
              recycleWorker = true;
            } catch { /* Retain the compiler when cached downloads are unavailable. */ }
            if (worker.current !== instance) return;
          }
          workerReady.current = true;
          clearTimer(); setState('ready'); setProgress('Lean is ready'); setDownload(null); setVersion(`Lean ${message.version}`); init.current?.resolve();
        }
        if (message.type === 'output' && message.id === pending.current?.id) pending.current?.lines.push({ stream: message.stream, text: message.text });
        if (message.type === 'result' && message.id === pending.current?.id) {
          clearTimer();
          const current = pending.current!; pending.current = null;
          if (recycleWorker) {
            // WebKit can overflow on a later compilation even when that file
            // passes in a fresh worker. Reuse downloaded bytes, not this heap.
            instance.terminate(); worker.current = null; init.current = null;
            workerReady.current = false;
            setState('idle'); setProgress('Ready for next run');
          } else { setState('ready'); setProgress('Lean is ready'); }
          current.resolve({ ...finishRun(message.success, message.elapsed, current.lines), compilerDownload: current.compilerDownload });
        }
        if (message.type === 'error') reset(message.message, true);
      };
      timer.current = setTimeout(() => reset('Lean took too long to load. Check your connection and try again.', true), 240_000);
      instance.postMessage({ type: 'init' });
    } catch (error) { reset(error instanceof Error ? error.message : String(error), true); }
    return promise;
  }, [clearTimer, reset]);

  const run = useCallback(async (code: string): Promise<RunResult> => {
    if (pending.current) throw new Error('Another program is already running.');
    const reuseCompiler = workerReady.current;
    await start();
    setState('running'); setProgress('Running your Lean code');
    return new Promise((resolve, reject) => {
      const id = ++nextId.current;
      pending.current = { id, lines: [], compilerDownload: reuseCompiler ? null : initializationDownload.current, resolve, reject };
      timer.current = setTimeout(() => reset('Execution stopped after 20 seconds. Try a smaller input or simpler proof.', true), 20_000);
      worker.current!.postMessage({ type: 'run', id, code });
    });
  }, [reset, start]);
  useEffect(() => {
    if (!editorReady || backgroundStarted.current) return;
    // In WebKit, defer the compiler's download and memory allocation until a
    // deliberate Run/Check. Reading the compatibility notice should be free.
    if (usesWebKit(navigator.userAgent)) return;
    const load = () => {
      backgroundStarted.current = true;
      const startedGeneration = generation.current;
      void start().catch(error => {
        if (generation.current === startedGeneration) reset(error instanceof Error ? error.message : String(error), true);
      });
    };
    // Give the editor its first paint before loading the compiler in a worker.
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(load, { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(load, 800);
    return () => clearTimeout(id);
  }, [editorReady, reset, start]);
  useEffect(() => () => {
    clearTimer(); worker.current?.terminate();
    init.current?.reject(new Error('Workspace closed.'));
    pending.current?.reject(new Error('Workspace closed.'));
  }, [clearTimer]);
  return { state, progress, download, version, run, stop: () => reset('Stopped. Your code is saved.') };
}
