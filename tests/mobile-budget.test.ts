import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gzipSync } from 'node:zlib';
import { build } from 'esbuild';

test('mobile editor stays below 150 KB compressed without Monaco', async () => {
  const result = await build({ entryPoints: ['components/mobile-editor.tsx'], bundle: true, write: false, minify: true, format: 'esm', target: 'es2022', platform: 'browser', external: ['react', 'react/jsx-runtime'], metafile: true });
  assert.ok(!Object.keys(result.metafile.inputs).some(path => path.includes('monaco-editor')), 'Mobile must not import Monaco');
  const bytes = gzipSync(result.outputFiles[0].contents).byteLength;
  assert.ok(bytes <= 150_000, `Mobile editor is ${bytes} compressed bytes; budget is 150,000 (shared React excluded)`);
});
