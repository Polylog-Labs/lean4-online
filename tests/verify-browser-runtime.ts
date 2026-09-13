import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
import { examples } from '../lib/content';
import { finishRun, sourceForRun, type OutputLine } from '../lib/lean';
import type { Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ headless: true, ...(existsSync(chrome) ? { executablePath: chrome } : {}) });
try {
  const page = await browser.newPage();
  // tsx preserves function names with this helper in serialized callbacks.
  await page.addInitScript({ content: 'globalThis.__name = (value) => value;' });
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
  const results = await page.evaluate(async codes => {
    if (!crossOriginIsolated) throw new Error('COOP/COEP isolation is missing.');
    return new Promise<{ success: boolean; elapsed: number; lines: OutputLine[] }[]>((resolve, reject) => {
      const worker = new Worker('/lean-worker.js');
      const results: { success: boolean; elapsed: number; lines: OutputLine[] }[] = [];
      let lines: OutputLine[] = [], id = 0;
      const timer = setTimeout(() => { worker.terminate(); reject(new Error('Browser worker timeout.')); }, 180_000);
      function cleanup() { clearTimeout(timer); worker.terminate(); }
      worker.onerror = event => { cleanup(); reject(new Error(event.message)); };
      worker.onmessage = event => {
        const message = event.data;
        if (message.type === 'error') { cleanup(); reject(new Error(message.message)); }
        if (message.type === 'ready') worker.postMessage({ type: 'run', id, code: codes[id] });
        if (message.type === 'output') lines.push({ text: message.text, stream: message.stream });
        if (message.type === 'result') {
          results.push({ success: message.success, elapsed: message.elapsed, lines }); lines = []; id++;
          if (id === codes.length) { cleanup(); resolve(results); }
          // Yield between runs: queued runtime callbacks must not close stdio.
          else setTimeout(() => worker.postMessage({ type: 'run', id, code: codes[id] }), 40);
        }
      };
      worker.postMessage({ type: 'init' });
    });
  }, cases);
  const parsed = results.map(result => finishRun(result.success, result.elapsed, result.lines));
  for (const [index, example] of examples.entries()) {
    const result = parsed[index];
    assert.ok(result.success && !result.incomplete, `${example.id}: ${JSON.stringify(result)}`);
    assert.equal(result.output.map(line => line.text).join('\n').trim() || 'File checked successfully.', example.expected, `${example.id} browser output`);
  }
  assert.equal(parsed.at(-1)!.success, false);
  console.log(`PASS browser WASM: all ${examples.length} examples and expected outputs, rejected invalid proof, and COOP/COEP headers.`);
} finally { await browser.close(); }
