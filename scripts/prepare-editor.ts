import { mkdir, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const require = createRequire(import.meta.url);
await mkdir('public/editor', { recursive: true });
// Monaco's prebuilt assets embed an older DOMPurify. Build from ESM and
// resolve its vendored sanitizer to our reviewed, pinned patch release.
await rm('public/editor/vs', { recursive: true, force: true });
await build({
  entryPoints: ['runtime/editor.ts'], outfile: 'public/editor/editor.js',
  bundle: true, format: 'iife', globalName: 'leanlabMonaco', platform: 'browser',
  target: 'es2022', minify: true, loader: { '.ttf': 'file' },
  plugins: [{ name: 'patched-dompurify', setup(builder) {
    builder.onResolve({ filter: /\/dompurify\/dompurify\.js$/ }, () => ({ path: require.resolve('dompurify') }));
  } }],
});
await build({
  entryPoints: ['node_modules/monaco-editor/esm/vs/editor/editor.worker.js'],
  outfile: 'public/editor/editor.worker.js', bundle: true, format: 'iife',
  platform: 'browser', target: 'es2022', minify: true,
});
await build({ entryPoints: ['runtime/lean.worker.ts'], outfile: 'public/lean-worker.js', bundle: true, format: 'iife', platform: 'browser', target: 'es2022' });
