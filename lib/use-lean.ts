'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { finishRun, type OutputLine, type RunResult } from './lean';

type State = 'idle' | 'loading' | 'ready' | 'running' | 'error';
export function useLean() {
  const [state, setState] = useState<State>('idle');
  const [progress, setProgress] = useState('Runtime not loaded');
  const [version, setVersion] = useState('Lean 4');
  const worker = useRef<Worker | null>(null);
  const init = useRef<{ promise: Promise<void>; resolve(): void; reject(error: Error): void } | null>(null);
  const pending = useRef<{ id: number; lines: OutputLine[]; resolve(result: RunResult): void; reject(error: Error): void } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextId = useRef(0);
  const clearTimer = useCallback(() => { if (timer.current) clearTimeout(timer.current); timer.current = null; }, []);
  const reset = useCallback((message: string, errorState = false) => {
    clearTimer();
    worker.current?.terminate(); worker.current = null;
    init.current?.reject(new Error(message)); init.current = null;
    pending.current?.reject(new Error(message)); pending.current = null;
    setState(errorState ? 'error' : 'idle'); setProgress(message);
  }, [clearTimer]);

  const start = useCallback(async () => {
    if (init.current) return init.current.promise;
    if (!window.crossOriginIsolated || typeof SharedArrayBuffer === 'undefined') {
      throw new Error('Lean needs cross-origin isolation. Open this app directly in a browser tab with its COOP/COEP hosting headers enabled.');
    }
    if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot load Lean. Please use a current desktop Chrome, Firefox, or Safari.');
    setState('loading'); setProgress('Loading Lean · first use downloads about 101 MB');
    let resolve!: () => void, reject!: (error: Error) => void;
    const promise = new Promise<void>((res, rej) => { resolve = res; reject = rej; });
    init.current = { promise, resolve, reject };
    try {
      const instance = new Worker('/lean-worker.js'); worker.current = instance;
      instance.onerror = () => reset('The Lean worker stopped unexpectedly. Try running again.', true);
      instance.onmessage = (event) => {
        const message = event.data;
        if (message.type === 'progress') setProgress(message.message);
        if (message.type === 'ready') {
          clearTimer(); setState('ready'); setProgress('Lean is ready'); setVersion(`Lean ${message.version}`); init.current?.resolve();
        }
        if (message.type === 'output' && message.id === pending.current?.id) pending.current?.lines.push({ stream: message.stream, text: message.text });
        if (message.type === 'result' && message.id === pending.current?.id) {
          clearTimer();
          const current = pending.current!; pending.current = null;
          setState('ready'); setProgress('Lean is ready');
          current.resolve(finishRun(message.success, message.elapsed, current.lines));
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
    await start();
    setState('running'); setProgress('Running your Lean code');
    return new Promise((resolve, reject) => {
      const id = ++nextId.current;
      pending.current = { id, lines: [], resolve, reject };
      timer.current = setTimeout(() => reset('Execution stopped after 20 seconds. Try a smaller input or simpler proof.', true), 20_000);
      worker.current!.postMessage({ type: 'run', id, code });
    });
  }, [reset, start]);
  useEffect(() => () => {
    clearTimer(); worker.current?.terminate();
    init.current?.reject(new Error('Workspace closed.'));
    pending.current?.reject(new Error('Workspace closed.'));
  }, [clearTimer]);
  return { state, progress, version, run, stop: () => reset('Stopped. Your code is saved.') };
}
