import assert from 'node:assert/strict';
import { webkit } from '@playwright/test';
import type { Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

const browser = await webkit.launch();
try {
  const page = await browser.newPage();
  await page.addInitScript({ content: 'globalThis.__name = (value) => value;' });
  const errors: string[] = [], leanDownloads: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/\.(pack|wasm)(?:\?|$)/.test(request.url())) leanDownloads.push(request.url()); });
  const start = Date.now();
  await page.goto(process.env.LEAN_LAB_URL || 'http://localhost:3000');
  await page.waitForFunction(() => {
    const monaco = (window as typeof window & { leanlabMonaco?: Monaco }).leanlabMonaco;
    return monaco?.editor.getModels().some((model: editor.ITextModel) => model.getLanguageId() === 'lean4');
  }, undefined, { timeout: 15_000 });
  assert.deepEqual(errors, [], 'WebKit editor startup errors');
  assert.deepEqual(leanDownloads, [], 'Opening the editor must not download Lean');
  console.log(`PASS WebKit: editor ready in ${Date.now() - start} ms with no Lean runtime download.`);
} finally { await browser.close(); }
