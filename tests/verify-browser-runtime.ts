import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
import { examples } from '../lib/content';
import { finishRun, sourceForRun, type OutputLine } from '../lib/lean';
import type { Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import type { DownloadProgress } from '../runtime/config';

const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ headless: true, ...(existsSync(chrome) ? { executablePath: chrome } : {}) });
try {
  const page = await browser.newPage();
  const runtimeRequests: string[] = [];
  page.on('request', request => { if (/\.(pack|wasm)(?:\?|$)/.test(request.url())) runtimeRequests.push(request.url()); });
  // tsx preserves function names with this helper in serialized callbacks.
  await page.addInitScript({ content: 'globalThis.__name = (value) => value;' });
  // This suite owns its worker; defer the app's idle background startup.
  await page.addInitScript({ content: 'window.requestIdleCallback = () => 0; window.cancelIdleCallback = () => {};' });
  await page.goto(process.env.LEAN_LAB_URL || 'http://localhost:3000');
  await page.waitForFunction(() => {
    const monaco = (window as typeof window & { leanlabMonaco?: Monaco }).leanlabMonaco;
    return monaco?.editor.getModels().some((model: editor.ITextModel) => model.getLanguageId() === 'lean4');
  });
  const editorAsset = await page.request.get(new URL('/editor/editor.js', page.url()).href);
  const editorCode = await editorAsset.text();
  assert.ok(editorCode.includes('DOMPurify 3.4.15'), 'Served editor must use patched DOMPurify');
  assert.ok(!editorCode.includes('DOMPurify 3.4.8'), 'Do not serve Monaco’s embedded old sanitizer');
  console.log('PASS editor API: Lean model initialized and patched sanitizer served.');
  // Exercise the real browser worker protocol, without driving or inspecting UI.
  const cases = [...examples.map(example => sourceForRun(example.code, example.mode)), 'example : 2 + 2 = 5 := by rfl'];
  async function exercise(cases: string[]) { return page.evaluate(async ({ codes, workerURL }) => {
    if (!crossOriginIsolated) throw new Error('COOP/COEP isolation is missing.');
    return new Promise<{ results: { success: boolean; elapsed: number; lines: OutputLine[] }[]; downloads: DownloadProgress[] }>((resolve, reject) => {
      const worker = new Worker(workerURL);
      const results: { success: boolean; elapsed: number; lines: OutputLine[] }[] = [];
      const downloads: DownloadProgress[] = [];
      let lines: OutputLine[] = [], id = 0;
      const timer = setTimeout(() => { worker.terminate(); reject(new Error('Browser worker timeout.')); }, 180_000);
      function cleanup() { clearTimeout(timer); worker.terminate(); }
      worker.onerror = event => { cleanup(); reject(new Error(event.message)); };
      worker.onmessage = event => {
        const message = event.data;
        if (message.type === 'progress' && message.download) downloads.push(message.download);
        if (message.type === 'error') { cleanup(); reject(new Error(message.message)); }
        if (message.type === 'ready') worker.postMessage({ type: 'run', id, code: codes[id] });
        if (message.type === 'output') lines.push({ text: message.text, stream: message.stream });
        if (message.type === 'result') {
          results.push({ success: message.success, elapsed: message.elapsed, lines }); lines = []; id++;
          if (id === codes.length) { cleanup(); resolve({ results, downloads }); }
          // Yield between runs: queued runtime callbacks must not close stdio.
          else setTimeout(() => worker.postMessage({ type: 'run', id, code: codes[id] }), 40);
        }
      };
      worker.postMessage({ type: 'init' });
    });
  }, { codes: cases, workerURL: process.env.LEAN_LAB_WORKER_URL || '/lean-worker.js' }); }
  const first = await exercise(cases);
  const parsed = first.results.map(result => finishRun(result.success, result.elapsed, result.lines));
  for (const [index, example] of examples.entries()) {
    const result = parsed[index];
    assert.ok(result.success && !result.incomplete, `${example.id}: ${JSON.stringify(result)}`);
    assert.equal(result.output.map(line => line.text).join('\n').trim() || 'File checked successfully.', example.expected, `${example.id} browser output`);
  }
  assert.equal(parsed.at(-1)!.success, false);
  const last = first.downloads.at(-1)!;
  assert.equal(last.received, last.total);
  assert.equal(last.cached, 0);
  assert.ok(last.total < 46_000_000, 'Compressed runtime data must remain below 46 MB');
  assert.ok(first.downloads.some(progress => progress.received > 0 && progress.received < progress.total), 'Progress must update while downloading');
  for (const [index, progress] of first.downloads.entries()) {
    assert.ok(progress.received + progress.cached <= progress.total);
    if (index) assert.ok(progress.received >= first.downloads[index - 1].received);
  }
  assert.ok(runtimeRequests.length > 0 && runtimeRequests.every(url => !url.includes('.wasm')), 'No second uncompressed WASM download');
  if (process.env.LEAN_LAB_EXPECT_ASSET_ORIGIN) {
    assert.ok(runtimeRequests.every(url => new URL(url).origin === process.env.LEAN_LAB_EXPECT_ASSET_ORIGIN), 'Every runtime pack must bypass the app origin');
    console.log('PASS direct cross-origin downloads: all runtime packs bypass the app server.');
  }
  const requestCount = runtimeRequests.length;
  const second = await exercise(['example : 2 + 2 = 4 := by rfl']);
  assert.ok(second.results[0].success);
  assert.equal(second.downloads.at(-1)!.received, 0);
  assert.equal(second.downloads.at(-1)!.cached, last.total);
  assert.equal(runtimeRequests.length, requestCount, 'A fresh worker reuses the downloaded runtime cache');
  console.log(`PASS download: ${(last.total / 1_000_000).toFixed(1)} MB, live byte progress, and cache reuse without network requests.`);
  console.log(`PASS browser WASM: all ${examples.length} examples and expected outputs, rejected invalid proof, and COOP/COEP headers.`);
} finally { await browser.close(); }
