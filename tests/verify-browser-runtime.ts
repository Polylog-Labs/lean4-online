import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
import { examples } from '../lib/content';
import { finishRun, sourceForRun, type OutputLine } from '../lib/lean';

const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ headless: true, ...(existsSync(chrome) ? { executablePath: chrome } : {}) });
try {
  const page = await browser.newPage();
  // tsx preserves function names with this helper in serialized callbacks.
  await page.addInitScript({ content: 'globalThis.__name = (value) => value;' });
  await page.goto(process.env.LEAN_LAB_URL || 'http://localhost:3000');
  // Exercise the real browser worker protocol, without driving or inspecting UI.
  const cases = [sourceForRun(examples[0].code, 'program'), '#eval 6 * 7', 'example : 2 + 2 = 4 := by rfl', 'example : 2 + 2 = 5 := by rfl'];
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
          else worker.postMessage({ type: 'run', id, code: codes[id] });
        }
      };
      worker.postMessage({ type: 'init' });
    });
  }, cases);
  const parsed = results.map(result => finishRun(result.success, result.elapsed, result.lines));
  assert.equal(parsed[0].success, true, JSON.stringify(parsed[0]));
  assert.equal(parsed[0].output.map(line => line.text).join('\n').trim(), examples[0].expected);
  assert.equal(parsed[1].output.map(line => line.text).join('\n').trim(), '42');
  assert.equal(parsed[2].success, true); assert.equal(parsed[3].success, false);
  console.log('PASS browser WASM: program output, expression evaluation, valid proof, rejected invalid proof, and COOP/COEP headers.');
} finally { await browser.close(); }
