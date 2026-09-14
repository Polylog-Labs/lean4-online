import type { DownloadProgress } from '../runtime/config';

const megabytes = (bytes: number) => `${(bytes / 1_000_000).toFixed(1)} MB`;

export function compilerTransferLabel(transfer: DownloadProgress): string {
  if (transfer.received === 0) {
    return transfer.cached > 0 ? `${megabytes(transfer.cached)} from device storage` : 'Checking device storage';
  }
  return `${megabytes(transfer.received)} downloaded${transfer.cached > 0 ? ` · ${megabytes(transfer.cached)} from device storage` : ''}`;
}

export function compilerDownloadLabel(transfer: DownloadProgress): string {
  return transfer.received + transfer.cached === 0 ? 'Waiting for compiler data' : compilerTransferLabel(transfer);
}

export function compilerTransferSummary(transfer: DownloadProgress | null): string {
  if (transfer === null) return 'Compiler already in memory. No compiler data downloaded.';
  if (transfer.received === 0 && transfer.cached === transfer.total && transfer.total > 0) {
    return `Compiler loaded from device storage (${megabytes(transfer.cached)}). No compiler data downloaded.`;
  }
  return `Compiler data: ${compilerTransferLabel(transfer)}.`;
}
