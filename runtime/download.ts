import type { Artifact } from './config';

export async function readDownload(response: Response, artifact: Artifact, onChunk: (bytes: number) => void) {
  if (!response.ok || !response.body) throw new Error(`Could not download ${artifact.file} (${response.status}).`);
  const reader = response.body.getReader();
  const data = new Uint8Array(artifact.compressedBytes);
  let offset = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (offset + value.byteLength > data.byteLength) throw new Error(`Unexpected size for ${artifact.file}.`);
      data.set(value, offset); offset += value.byteLength; onChunk(value.byteLength);
    }
  } catch (error) { await reader.cancel(); throw error; }
  finally { reader.releaseLock(); }
  if (offset !== data.byteLength) throw new Error(`Incomplete download: ${artifact.file}. Please retry.`);
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', data)), byte => byte.toString(16).padStart(2, '0')).join('');
  if (hash !== artifact.sha256) throw new Error(`Download verification failed: ${artifact.file}. Please retry.`);
  return data;
}
