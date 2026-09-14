import { lengthProof, proofVariants, type ComparisonResult, type ProofKind, type ProofSize } from '../lib/proof-comparison';

function ProofCode({ source }: { source: string }) {
  return <pre className="proof-code"><code>{source.split(/(\b(?:theorem|by|decide|exact|List|\d+)\b)/g).map((part, index) => {
    const style = /^(theorem|by)$/.test(part) ? 'keyword' : /^(decide|exact)$/.test(part) ? 'tactic' : part === 'List' ? 'type' : /^\d+$/.test(part) ? 'number' : '';
    return style ? <span key={index} className={`lean-${style}`}>{part}</span> : part;
  })}</code></pre>;
}

export function ProofCards({ size = 100, result, onOpen }: {
  size?: ProofSize; result?: ComparisonResult | null; onOpen?(kind: ProofKind): void;
}) {
  return <div className="proof-cards">{proofVariants.map(variant => <article className="proof-card" key={variant.kind} aria-label={variant.title}>
    <div className="proof-card-heading"><h3>{variant.title}</h3>{result && <strong className="proof-time" aria-label={`${variant.title} median`}>{result[variant.kind].median.toFixed(1)} ms</strong>}</div>
    <ProofCode source={lengthProof(size, variant.kind)} />
    <p>{variant.explanation}</p>
    {onOpen ? <button className="text-button" onClick={() => onOpen(variant.kind)}>Open in Playground</button> : <a href={`/examples/${variant.exampleId}`}>Open {variant.file}</a>}
  </article>)}</div>;
}
