import release from './release.json';

export const distributionVersion = `${release.assetVersion}-slim-gzip1`;
export const runtimePath = `/lean/${distributionVersion}`;
// Match the upstream build's 64 MiB starting heap; grow as programs need it.
export const initialMemoryBytes = 64 * 1024 * 1024;
export interface Artifact { file: string; compressedBytes: number; sha256: string }
export interface RuntimeManifest {
  version: string;
  wasm: Artifact;
  packs: (Artifact & { entries: { name: string; offset: number; bytes: number }[] })[];
}
export interface DownloadProgress { received: number; cached: number; total: number }
