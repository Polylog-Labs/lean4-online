'use client';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { RunResult } from './lean';
import { compareProofs, type ComparisonProgress, type ComparisonResult, type ProofSize } from './proof-comparison';

export function useProofComparison(run: (code: string) => Promise<RunResult>, stop: () => void, lockRef: RefObject<boolean>, enabled: boolean) {
  const [size, setSize] = useState<ProofSize>(100);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<ComparisonProgress | null>(null);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [message, setMessage] = useState('');
  const session = useRef<AbortController | null>(null);
  const cancel = useCallback(() => {
    if (!session.current) return;
    session.current.abort(); session.current = null;
    stop(); lockRef.current = false;
    setRunning(false); setProgress(null); setMessage('Comparison stopped.');
  }, [lockRef, stop]);
  useEffect(() => () => cancel(), [enabled, cancel]);

  const start = useCallback(async () => {
    if (!enabled || lockRef.current) return;
    lockRef.current = true;
    const controller = new AbortController(); session.current = controller;
    setRunning(true); setResult(null); setMessage('');
    try {
      const result = await compareProofs(run, size, controller.signal, setProgress);
      if (session.current === controller) setResult(result);
    } catch (error) {
      if (session.current === controller) setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      if (session.current === controller) {
        session.current = null; lockRef.current = false;
        setRunning(false); setProgress(null);
      }
    }
  }, [enabled, lockRef, run, size]);

  function changeSize(size: ProofSize) {
    cancel(); setSize(size); setResult(null); setMessage('');
  }
  return { size, changeSize, running, progress, result, message, start, cancel };
}
