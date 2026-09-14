import assert from 'node:assert/strict';
import { chromium, webkit, expect } from '@playwright/test';
import { existsSync } from 'node:fs';
import { examples, lessons } from '../lib/content';
import { finishRun, sourceForRun, type OutputLine } from '../lib/lean';
import type { Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import type { DownloadProgress } from '../runtime/config';
import { hashVectorCode, hashDigests } from './hash-vectors';
import { blake3VectorCode, blake3Digests } from './blake3-vectors';

const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = process.argv.includes('--webkit')
  ? await webkit.launch()
  : await chromium.launch({ headless: true, ...(existsSync(chrome) ? { executablePath: chrome } : {}) });
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
  const cases = [...examples.map(example => sourceForRun(example.code, example.mode)), hashVectorCode, blake3VectorCode, 'example : 2 + 2 = 5 := by rfl'];
  async function exercise(cases: string[]) { return page.evaluate(async ({ codes, workerURL }) => {
    if (!crossOriginIsolated) throw new Error('COOP/COEP isolation is missing.');
    return new Promise<{ results: { success: boolean; elapsed: number; lines: OutputLine[] }[]; downloads: DownloadProgress[]; downloading: boolean[]; memory: number[] }>((resolve, reject) => {
      const worker = new Worker(workerURL);
      const results: { success: boolean; elapsed: number; lines: OutputLine[] }[] = [];
      const downloads: DownloadProgress[] = [];
      const downloading: boolean[] = [];
      const memory: number[] = [];
      let lines: OutputLine[] = [], id = 0;
      const timer = setTimeout(() => { worker.terminate(); reject(new Error('Browser worker timeout.')); }, 180_000);
      function cleanup() { clearTimeout(timer); worker.terminate(); }
      worker.onerror = event => { cleanup(); reject(new Error(event.message)); };
      worker.onmessage = event => {
        const message = event.data;
        if (message.memoryBytes) memory.push(message.memoryBytes);
        if (message.type === 'progress' && message.download) downloads.push(message.download);
        if (message.type === 'progress') downloading.push(message.downloading);
        if (message.type === 'error') { cleanup(); reject(new Error(`Case ${id}: ${message.message}`)); }
        if (message.type === 'ready') worker.postMessage({ type: 'run', id, code: codes[id] });
        if (message.type === 'output') lines.push({ text: message.text, stream: message.stream });
        if (message.type === 'result') {
          results.push({ success: message.success, elapsed: message.elapsed, lines }); lines = []; id++;
          if (id === codes.length) { cleanup(); resolve({ results, downloads, downloading, memory }); }
          // Yield between runs: queued runtime callbacks must not close stdio.
          else setTimeout(() => worker.postMessage({ type: 'run', id, code: codes[id] }), 40);
        }
      };
      worker.postMessage({ type: 'init' });
    });
  }, { codes: cases, workerURL: process.env.LEAN_LAB_WORKER_URL || '/lean-worker.js' }); }
  const first = await exercise(cases);
  const parsed = first.results.map(result => finishRun(result.success, result.elapsed, result.lines));
  const hashes = parsed[examples.length];
  assert.ok(hashes.success && !hashes.incomplete, `Browser SHA-256: ${JSON.stringify(hashes)}`);
  assert.equal(hashes.output.map(line => line.text.trim()).join('\n').trim(), hashDigests.join('\n'), 'Browser SHA-256 reference vectors');
  const blake3 = parsed[examples.length + 1];
  assert.ok(blake3.success && !blake3.incomplete, `Browser BLAKE3: ${JSON.stringify(blake3)}`);
  assert.equal(blake3.output.map(line => line.text.trim()).join('\n').trim(), blake3Digests.join('\n'), 'Browser BLAKE3 reference vectors');
  console.log(`PASS browser hash vectors: ${hashDigests.length} SHA-256 and ${blake3Digests.length} BLAKE3.`);
  for (const [index, example] of examples.entries()) {
    const result = parsed[index];
    assert.ok(result.success, `${example.id}: ${JSON.stringify(result)}`);
    assert.equal(result.incomplete, !!example.incomplete, `${example.id} browser completion status`);
    assert.equal(result.output.map(line => line.text).join('\n').trim() || 'File checked successfully.', example.expected, `${example.id} browser output`);
  }
  assert.equal(parsed.at(-1)!.success, false);
  assert.ok(first.memory.length > examples.length, 'Runtime reports its heap size after initialization and each run');
  assert.ok(Math.max(...first.memory) < 512 * 1024 * 1024, 'The example collection must run with a WASM heap below 512 MiB');
  console.log(`WASM heap: ${(first.memory[0] / 1024 / 1024).toFixed(0)} MiB ready; ${(Math.max(...first.memory) / 1024 / 1024).toFixed(0)} MiB after all examples.`);
  const last = first.downloads.at(-1)!;
  assert.equal(last.received, last.total);
  assert.equal(last.cached, 0);
  assert.ok(last.total < 46_000_000, 'Compressed runtime data must remain below 46 MB');
  assert.ok(first.downloads.some(progress => progress.received > 0 && progress.received < progress.total), 'Progress must update while downloading');
  assert.ok(first.downloading.includes(true), 'A cold start reports actual download activity');
  assert.equal(first.downloading.at(-1), false, 'Downloading ends before the compiler becomes ready');
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
  assert.ok(second.downloading.every(active => active === false), 'Cache reads and compilation never report downloading');
  assert.equal(runtimeRequests.length, requestCount, 'A fresh worker reuses the downloaded runtime cache');
  console.log(`PASS download: ${(last.total / 1_000_000).toFixed(1)} MB, live byte progress, and cache reuse without network requests.`);
  console.log(`PASS browser WASM: all ${examples.length} examples and expected outputs, rejected invalid proof, and COOP/COEP headers.`);
  const origin = new URL(page.url()).origin;
  const reading = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const readingRequests: string[] = [];
  reading.on('request', request => readingRequests.push(request.url()));
  await reading.goto(`${origin}/examples`);
  await expect(reading.locator('article li > a')).toHaveCount(examples.length);
  await reading.goto(`${origin}/learn`);
  await expect(reading.locator('article li > a')).toHaveCount(lessons.length);
  await reading.goto(`${origin}/learn/curry-howard`);
  await expect(reading.locator('article')).toContainText('The Curry–Howard correspondence');
  await reading.getByText('Solution', { exact: true }).click();
  await expect(reading.locator('details').last()).toContainText('fun hp => hp');
  assert.ok(await reading.evaluate(() => document.documentElement.scrollHeight > innerHeight && getComputedStyle(document.body).overflowY !== 'hidden'), 'Reading pages scroll on mobile without JavaScript');
  await reading.goto(`${origin}/examples/sha256`);
  await expect(reading.locator('article')).toContainText('def digest (message : String)');
  await reading.goto(`${origin}/examples/blake3`);
  await expect(reading.locator('article')).toContainText('def digestBytes (input : ByteArray)');
  await expect(reading.locator('article')).toContainText('BLAKE3 specification');
  assert.ok(!readingRequests.some(url => /\/editor\/|\.pack|lean-worker/.test(url)), 'Reading pages do not preload the editor or compiler');
  for (const path of ['/llms.txt', '/agent.txt', '/agents.txt', '/llms-full.txt']) {
    const response = await reading.request.get(`${origin}${path}`);
    assert.ok(response.ok(), path);
    assert.match(response.headers()['content-type'], /text\/plain/);
    const text = await response.text();
    assert.ok(text.includes('Mathlib') && text.includes('not bundled') && text.includes('Curry–Howard'), `${path} explains capabilities and limitations`);
    if (path === '/llms-full.txt') for (const lesson of lessons) assert.ok(text.includes(lesson.paragraphs[0]), `Agent text contains ${lesson.id}`);
  }
  const sitemap = await (await reading.request.get(`${origin}/sitemap.xml`)).text();
  for (const item of examples) assert.ok(sitemap.includes(`/examples/${item.id}`));
  for (const item of lessons) assert.ok(sitemap.includes(`/learn/${item.id}`));
  assert.equal((await reading.request.get(`${origin}/examples/not-an-example`)).status(), 404);
  await reading.close();
  await page.goto(`${origin}/examples/curry-howard`);
  await page.getByRole('link', { name: 'Open CurryHoward.lean in editor' }).click();
  await expect(page.getByRole('tab', { name: 'λ CurryHoward.lean' })).toHaveAttribute('aria-selected', 'true');
  await page.goto(`${origin}/learn/first-proof`);
  await page.getByRole('link', { name: 'Open exercise in editor' }).click();
  await expect(page.locator('.guide-panel h2')).toHaveText('Prove 2 + 2 = 4');
  console.log('PASS public content: no-JavaScript examples/lessons, mobile scrolling, agent text, sitemap, 404s, and links into the editor.');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const settings = page.locator('dialog[open]');
  // Control clipboard results so CI covers both success and denied permission.
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async (text: string) => { document.documentElement.dataset.copiedText = text; },
    } });
  });
  const copyAddress = settings.getByRole('button', { name: 'Copy Zcash address', exact: true });
  await copyAddress.click();
  await expect(settings.getByRole('button', { name: 'Copied to clipboard', exact: true })).toBeVisible();
  assert.equal(await page.locator('html').getAttribute('data-copied-text'), await settings.getByLabel('Zcash (ZEC) donation address').inputValue());
  await expect(copyAddress).toBeEnabled({ timeout: 5000 });
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async () => { throw new DOMException('Permission denied', 'NotAllowedError'); },
    } });
  });
  await copyAddress.click();
  await expect(settings.getByRole('alert')).toContainText('Could not copy.');
  await expect(settings.getByRole('button', { name: 'Copied to clipboard', exact: true })).toHaveCount(0);
  await settings.getByRole('button', { name: 'Close dialog', exact: true }).click();
  console.log('PASS donation copy: in-dialog confirmation, exact address, reset, and clipboard-denied feedback.');
  if (!process.argv.includes('--webkit')) {
    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await mobile.goto(origin);
    await expect(mobile.getByLabel('Switch file', { exact: true })).toContainText('Welcome.lean');
    await expect(mobile.locator('.safari-filter'), 'Chromium does not show Safari-specific notices').toHaveCount(0);
    await mobile.getByRole('button', { name: 'Open navigation', exact: true }).click();
    const list = mobile.locator('.explorer-scroll');
    const dimensions = await list.evaluate(node => ({ client: node.clientHeight, scroll: node.scrollHeight }));
    assert.ok(dimensions.client > 100 && dimensions.scroll > dimensions.client, 'The example list has a bounded scroll area');
    const bounds = (await list.boundingBox())!;
    const cdp = await mobile.context().newCDPSession(mobile);
    const x = bounds.x + bounds.width / 2, y = bounds.y + bounds.height - 20;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let step = 1; step <= 10; step++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - step * Math.min(20, (bounds.height - 40) / 10) }] });
      await mobile.waitForTimeout(20);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(() => list.evaluate(node => node.scrollTop)).toBeGreaterThan(40);
    await expect(mobile.getByRole('dialog', { name: 'Navigation' })).toBeVisible();
    assert.equal(await mobile.locator('.file-picker > summary').textContent(), 'λWelcome.lean', 'A drag does not select an example');
    await mobile.close();
    console.log('PASS mobile touch: a finger drag scrolls the examples without selecting a file.');
  }
} finally { await browser.close(); }
