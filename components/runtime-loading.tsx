import { Download, LoaderCircle } from 'lucide-react';
import type { DownloadProgress } from '../runtime/config';
import { compilerDownloadLabel } from '../lib/runtime-progress';

export function RuntimeLoading({ download, preparing }: { download: DownloadProgress | null; preparing: boolean }) {
  return <div className="runtime-loading" role="status">
    {download ? <Download size={21} aria-hidden="true" /> : <LoaderCircle size={21} className="spin" aria-hidden="true" />}
    <div>
      <strong>{download ? 'Downloading Lean compiler' : 'Compiling'}</strong>
      <p>{download
        ? 'The Lean compiler runs as WebAssembly on your device. Your code is not uploaded.'
        : preparing ? 'Preparing Lean on your device.' : 'Checking and running your code on this device.'}</p>
      {download && <div className="download-status">
        <div><span>{compilerDownloadLabel(download)}</span><span>{Math.round((download.received + download.cached) / download.total * 100)}% of {(download.total / 1_000_000).toFixed(1)} MB</span></div>
        <progress aria-label="Lean compiler download" max={download.total} value={download.received + download.cached} />
      </div>}
    </div>
  </div>;
}
