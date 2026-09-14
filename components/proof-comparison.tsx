'use client';
import { LoaderCircle, Play, Square } from 'lucide-react';
import { proofSizes, proofVariants, type ProofKind, type ProofSize } from '../lib/proof-comparison';
import type { useProofComparison } from '../lib/use-proof-comparison';
import type { DownloadProgress } from '../runtime/config';
import { ProofCards } from './proof-cards';
import { RuntimeLoading } from './runtime-loading';

export function ProofComparison({ comparison, safari, busy, download, preparing, onOpen, onRunLocally }: {
  comparison: ReturnType<typeof useProofComparison>; safari: boolean; busy: boolean;
  download: DownloadProgress | null; preparing: boolean;
  onOpen(kind: ProofKind): void; onRunLocally(): void;
}) {
  const { size, changeSize, running, progress, result, message, start, cancel } = comparison;
  const ratio = result && result.reuse.median > 0 ? result.calculate.median / result.reuse.median : null;
  return <section className="proof-comparison" aria-label="Compare proof checking">
    <div className="proof-comparison-heading"><div><h2>Same theorem, two proofs</h2><p>Each card is checked as a separate Lean file.</p></div>
      <label>List size<select aria-label="Comparison list size" value={size} onChange={event => changeSize(Number(event.target.value) as ProofSize)}>{proofSizes.map(size => <option key={size} value={size}>{size} copies</option>)}</select></label>
    </div>
    <ProofCards size={size} result={result} onOpen={onOpen} />
    {safari ? <p className="comparison-notice">The calculation can exceed Safari’s compiler stack limit. Read both proofs here, or <button className="text-button" onClick={onRunLocally}>open the calculation to run locally</button>.</p> : <div className="comparison-actions">
      {running ? <button className="button button-quiet" onClick={cancel}><Square size={13} />Stop comparison</button> : <button className="button button-primary" disabled={busy} onClick={() => void start()}><Play size={13} />Compare both proofs</button>}
      <span role="status">{running ? <><LoaderCircle size={14} className="spin" />{preparing ? 'Preparing compiler' : progress?.phase === 'warmup' ? 'Warming up' : 'Measuring'} · {progress?.completed ?? 0} / 12 checks</> : result ? 'Both proofs checked · median of 5 measured runs each' : 'One warm-up and five measured checks per proof.'}</span>
    </div>}
    {running && preparing && <RuntimeLoading download={download} preparing />}
    {message && <p className="comparison-message" role="status">{message}</p>}
    {result && <div className="comparison-results">
      <p><strong>Lean check time</strong> · {ratio === null ? 'The timings are too small to calculate a ratio.' : `Calculation / theorem application: ${ratio.toFixed(2)}×.`} Measured on this device.</p>
      <details><summary>Individual checking times</summary><div className="comparison-samples">{proofVariants.map(variant => <p key={variant.kind}><strong>{variant.title}</strong><br />{result[variant.kind].samples.map(time => time.toFixed(1)).join(', ')} ms</p>)}</div></details>
    </div>}
    <p className="comparison-footnote">Times include elaboration and kernel checking. Compiler loading is excluded. Results vary by device and browser.</p>
  </section>;
}
