import type { RunResult } from './lean';

export const proofSizes = [20, 50, 100] as const;
export type ProofSize = typeof proofSizes[number];
export type ProofKind = 'calculate' | 'reuse';
export const proofVariants = [
  { kind: 'calculate', title: 'Calculate the length', exampleId: 'proof-efficiency-slow', file: 'CalculateLength.lean', explanation: 'decide computes the list’s length while reducing a decision procedure.' },
  { kind: 'reuse', title: 'Reuse a theorem', exampleId: 'proof-efficiency-fast', file: 'ReuseLengthTheorem.lean', explanation: 'exact applies List.length_replicate without computing the list.' },
] as const;

export function lengthProof(size: ProofSize, kind: ProofKind | 'exercise') {
  if (!proofSizes.includes(size)) throw new Error('Choose 20, 50, or 100 copies.');
  return `theorem copies_length :\n    (List.replicate ${size} 7).length = ${size} := by\n  ${kind === 'calculate' ? 'decide' : kind === 'reuse' ? 'exact List.length_replicate' : 'sorry'}\n`;
}

export interface ComparisonProgress { completed: number; total: number; phase: 'warmup' | 'measuring' }
export interface ProofMeasurement { samples: number[]; median: number }
export interface ComparisonResult { size: ProofSize; calculate: ProofMeasurement; reuse: ProofMeasurement }
export const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

export async function compareProofs(
  run: (code: string) => Promise<RunResult>, size: ProofSize, signal: AbortSignal,
  onProgress: (progress: ComparisonProgress) => void,
): Promise<ComparisonResult> {
  const samples: Record<ProofKind, number[]> = { calculate: [], reuse: [] };
  let completed = 0;
  // One unmeasured run each, then five measured runs each. Alternating order
  // reduces the advantage of always running second in the same compiler.
  for (let round = 0; round < 6; round++) {
    const order: ProofKind[] = round % 2 ? ['reuse', 'calculate'] : ['calculate', 'reuse'];
    for (const kind of order) {
      signal.throwIfAborted();
      onProgress({ completed, total: 12, phase: round ? 'measuring' : 'warmup' });
      const result = await run(lengthProof(size, kind));
      signal.throwIfAborted();
      if (!result.success || result.incomplete) {
        const detail = result.diagnostics.find(item => item.severity === 'error')?.message;
        throw new Error(`${kind === 'calculate' ? 'The calculation' : 'The theorem application'} did not complete its check.${detail ? ` ${detail}` : ''}`);
      }
      if (!Number.isFinite(result.elapsed) || result.elapsed < 0) throw new Error('Lean did not return a valid checking time.');
      if (round) samples[kind].push(result.elapsed);
      completed++;
      // Let queued Emscripten callbacks finish between compiles. This delay is
      // excluded: elapsed comes from the compiler worker, not this loop.
      await new Promise(resolve => setTimeout(resolve, 40));
    }
  }
  signal.throwIfAborted();
  onProgress({ completed, total: 12, phase: 'measuring' });
  return { size, calculate: { samples: samples.calculate, median: median(samples.calculate) }, reuse: { samples: samples.reuse, median: median(samples.reuse) } };
}
