import { ArrowRight, CircleAlert } from 'lucide-react';
import { isStackLimitError } from '../lib/browser-compatibility';

export function RuntimeError({ message, onRetry, onRunLocally }: {
  message: string;
  onRetry(): void;
  onRunLocally(): void;
}) {
  const stackLimit = isStackLimitError(message);
  return <div className="runtime-error">
    <CircleAlert size={18} />
    <div>
      <strong>{stackLimit ? 'Browser stack limit reached' : 'Could not finish this run'}</strong>
      <p>{stackLimit
        ? 'Lean exceeded this browser’s call-stack limit. Try a smaller expression, another desktop browser, or run the file locally. Your code is saved.'
        : message}</p>
      {stackLimit
        ? <button className="text-button" onClick={onRunLocally}>Run locally <ArrowRight size={13} /></button>
        : <button className="text-button" onClick={onRetry}>Try again <ArrowRight size={13} /></button>}
    </div>
  </div>;
}
