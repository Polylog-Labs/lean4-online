import { cp, mkdir } from 'node:fs/promises';
import { build } from 'esbuild';

await mkdir('public/editor', { recursive: true });
await cp('node_modules/monaco-editor/min/vs', 'public/editor/vs', { recursive: true });
await build({ entryPoints: ['runtime/lean.worker.ts'], outfile: 'public/lean-worker.js', bundle: true, format: 'iife', platform: 'browser', target: 'es2022' });
