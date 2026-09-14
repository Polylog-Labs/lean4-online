'use client';

import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [status, setStatus] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle');

  useEffect(() => {
    if (status !== 'copied') return;
    const timer = setTimeout(() => setStatus('idle'), 3000);
    return () => clearTimeout(timer);
  }, [status]);

  async function copy() {
    setStatus('copying');
    try {
      await navigator.clipboard.writeText(text);
      setStatus('copied');
    } catch {
      setStatus('error');
    }
  }

  return <>
    <button className="button button-quiet" onClick={copy} disabled={status === 'copying'} aria-live="polite">
      {status === 'copied' ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
      <span>{status === 'copied' ? 'Copied to clipboard' : status === 'copying' ? 'Copying…' : label}</span>
    </button>
    {status === 'error' && <p className="field-error" role="alert">Could not copy. Select the address above and copy it manually.</p>}
  </>;
}
