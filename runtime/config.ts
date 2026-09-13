import release from './release.json';

export const distributionVersion = `${release.assetVersion}-slim-gzip1`;
export const runtimePath = `/lean/${distributionVersion}`;
export interface Artifact { file: string; compressedBytes: number; sha256: string }
export interface RuntimeManifest {
  version: string;
  wasm: Artifact;
  packs: (Artifact & { entries: { name: string; offset: number; bytes: number }[] })[];
}
export interface DownloadProgress { received: number; cached: number; total: number }
