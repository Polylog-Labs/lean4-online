import assert from 'node:assert/strict';
import { expect, webkit } from '@playwright/test';
import type { Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { encodeSnippet } from '../lib/lean';
import { advancedExamples } from '../lib/advanced-examples';
import { examples, lessons } from '../lib/content';
import { sourceForRun } from '../lib/lean';
import type { DownloadProgress } from '../runtime/config';

const url = process.env.LEAN_LAB_URL || 'http://localhost:3000';
const browser = await webkit.launch();
try {
  const page = await browser.newPage();
  await page.addInitScript({ content: `
    globalThis.__name = (value) => value;
    window.leanStartup = []; window.leanDownloads = [];
    window.leanDownloadVisible = false; window.leanCompilingVisible = false;
    new MutationObserver(() => {
      if (document.querySelector('.download-status progress')) window.leanDownloadVisible = true;
      const loading = document.querySelector('.runtime-loading');
      if (loading?.querySelector('strong')?.textContent === 'Compiling' && loading.querySelector('.spin') && !loading.querySelector('progress')) window.leanCompilingVisible = true;
    }).observe(document, { childList: true, subtree: true });
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      constructor(url, options) {
        if (String(url) === '/lean-worker.js') {
          window.leanStartup.push(!!window.leanlabMonaco?.editor.getModels().some(model => model.getLanguageId() === 'lean4'));
        }
        super(url, options);
        if (String(url) === '/lean-worker.js') this.addEventListener('message', event => { if (event.data.download) window.leanDownloads.push(event.data.download); });
      }
    };
  ` });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const start = Date.now();
  await page.goto(url);
  await page.waitForFunction(() => {
    const monaco = (window as typeof window & { leanlabMonaco?: Monaco }).leanlabMonaco;
    return monaco?.editor.getModels().some((model: editor.ITextModel) => model.getLanguageId() === 'lean4');
  }, undefined, { timeout: 15_000 });
  const editorMs = Date.now() - start;
  await page.waitForTimeout(3000);
  assert.deepEqual(await page.evaluate('window.leanStartup'), [], 'Safari defers the compiler until Run or Check');
  assert.deepEqual(errors, [], 'WebKit editor startup errors');
  console.log(`PASS WebKit desktop: editor ready in ${editorMs} ms; no background compiler download.`);
  await expect(page.getByRole('tab', { name: 'λ Welcome.lean' })).toBeVisible();
  await expect(page.getByRole('note', { name: 'Lean compiler download' })).toContainText('First use downloads the Lean compiler (~46 MB)');
  await expect(page.getByRole('note', { name: 'Lean compiler download' })).toContainText('your code is not uploaded');
  await expect(page.getByRole('note', { name: 'Safari compatibility' })).toHaveCount(0);
  // Exercise the actual hook repeatedly: Safari releases each worker and
  // initializes the next one from Cache Storage, avoiding warm-worker failures.
  const io = lessons.find(item => item.id === 'io')!;
  const cases = [
    ...['welcome', 'functions', 'two-plus-two', 'curry-howard'].map(id => {
      const item = examples.find(example => example.id === id)!;
      return { id, code: sourceForRun(item.code, item.mode), expected: item.expected };
    }),
    { id: 'io-lesson', code: sourceForRun(io.solution, 'program', io.validation), expected: 'Hello, Lean!' },
  ];
  const packs: string[] = [];
  page.on('request', request => { if (request.url().endsWith('.pack')) packs.push(request.url()); });
  let firstDownloads = 0;
  for (const [index, item] of [...cases, ...cases].entries()) {
    await page.evaluate('window.leanDownloadVisible = false; window.leanCompilingVisible = false;');
    await page.evaluate(code => {
      const monaco = (window as typeof window & { leanlabMonaco?: Monaco }).leanlabMonaco!;
      monaco.editor.getModels().find((model: editor.ITextModel) => model.getLanguageId() === 'lean4')!.setValue(code);
    }, item.code);
    await page.getByLabel('Run options', { exact: true }).click();
    await page.getByRole('button', { name: 'Check file', exact: true }).click();
    await expect(page.locator('.execution-footer')).toBeVisible({ timeout: 180_000 });
    assert.equal((await page.locator('.actual-output > pre').allTextContents()).join('\n').trim() || 'File checked successfully.', item.expected, item.id);
    assert.equal(await page.evaluate('window.leanStartup.length'), index + 1, 'Every Safari run starts a fresh worker');
    assert.ok(await page.evaluate('window.leanCompilingVisible'), 'Compiling uses a spinner without a progress bar');
    if (index === 0) { firstDownloads = packs.length; assert.ok(firstDownloads > 0); }
    else {
      assert.equal(await page.evaluate('window.leanDownloadVisible'), false, 'Cached Safari runs never display download progress');
      assert.equal(packs.length, firstDownloads, 'Later runs reuse cached packs without network requests');
      const download = await page.evaluate<DownloadProgress>('window.leanDownloads.at(-1)');
      assert.equal(download.received, 0);
      assert.equal(download.cached, download.total);
      await expect(page.getByLabel('Compiler transfer', { exact: true })).toContainText('No compiler data downloaded.');
      await expect(page.getByLabel('Compiler transfer', { exact: true })).toContainText('loaded from device storage');
    }
  }
  // Restore the initial editor state before testing its layout controls.
  await page.evaluate(code => {
    const monaco = (window as typeof window & { leanlabMonaco?: Monaco }).leanlabMonaco!;
    monaco.editor.getModels().find((model: editor.ITextModel) => model.getLanguageId() === 'lean4')!.setValue(code);
  }, examples[0].code);
  await page.getByRole('button', { name: 'Collapse output', exact: true }).click();
  console.log('PASS WebKit: introductions and IO lesson run repeatedly with fresh workers and cached downloads.');
  await expect(page.locator('.guide-panel')).toBeHidden();
  await page.getByRole('button', { name: 'Toggle Guide', exact: true }).click();
  await expect(page.locator('.guide-panel')).toBeVisible();
  await page.getByRole('button', { name: 'Toggle Guide', exact: true }).click();
  await expect(page.locator('.guide-panel')).toBeHidden();
  await page.getByRole('button', { name: 'Toggle Run locally', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Run Lean locally' })).toBeVisible();
  const divider = page.getByRole('separator', { name: 'Resize guide' });
  await divider.focus(); await divider.press('ArrowLeft');
  await expect(divider).toHaveAttribute('aria-valuenow', '310');
  await page.waitForTimeout(300);
  await page.reload();
  await expect(page.getByRole('separator', { name: 'Resize guide' })).toHaveAttribute('aria-valuenow', '310');
  await page.getByRole('button', { name: 'Toggle Output', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Lean execution results' })).toBeVisible();
  await page.getByRole('button', { name: 'Collapse output', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Lean execution results' })).toBeHidden();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const textSize = page.getByRole('slider', { name: 'Editor and guide text size' });
  await textSize.fill('17');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await expect(page.locator('.guide-description')).toHaveCSS('font-size', '17px');
  await expect.poll(() => page.evaluate(() => {
    const monaco = (window as typeof window & { leanlabMonaco?: Monaco }).leanlabMonaco;
    return monaco?.editor.getEditors()[0]?.getOption(monaco.editor.EditorOption.fontSize);
  })).toBe(17);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'light', exact: true }).click();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  console.log('PASS desktop layout: welcome file, collapsible guide/output, keyboard resizing, and saved panel width.');
  const search = page.getByRole('textbox', { name: 'Search examples, lessons, or syntax' });
  await search.fill('SHA-256');
  const sha = page.locator('.explorer').getByRole('button', { name: /SHA-256/ });
  await expect(sha.getByLabel('Known Safari compiler limitation')).toBeVisible();
  await sha.click();
  const notice = page.getByRole('note', { name: 'Safari compatibility' });
  await expect(notice).toContainText('This example may fail in Safari.');
  await expect(page.getByRole('button', { name: 'Run program', exact: true })).toBeEnabled();
  await notice.locator('summary').click();
  await expect(notice).toContainText('WebKit’s stack limit');
  await page.locator('.explorer').getByLabel('Hide Safari limitations').check();
  await expect(sha).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'λ SHA256.lean' })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Learn', exact: true }).click();
  await expect(page.locator('.lesson-card').filter({ hasText: 'Hash a message with SHA-256' })).toHaveCount(0);
  await expect(page.locator('.lesson-card').filter({ hasText: 'Programs and IO' })).toBeVisible();
  await expect(page.locator('.lesson-card').filter({ hasText: 'Accumulators and invariants' })).toBeVisible();
  await page.locator('.learning-page').getByLabel('Hide Safari limitations').uncheck();
  await expect(page.locator('.lesson-card').filter({ hasText: 'Hash a message with SHA-256' })).toContainText('Safari limitation');
  console.log('PASS Safari notices and filtering: limitations remain runnable; active files are preserved; supported exercises remain visible.');
  await page.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mobileErrors: string[] = [], requests: string[] = [];
  mobile.on('pageerror', error => mobileErrors.push(error.message));
  mobile.on('request', request => requests.push(request.url()));
  const source = 'def main : IO Unit := IO.println "Hello from mobile"';
  const shared = new URL(url);
  shared.hash = new URLSearchParams({ code: encodeSnippet(source), mode: 'program' }).toString();
  await mobile.goto(shared.href);
  const input = mobile.getByRole('textbox', { name: 'Lean source code editor' });
  await expect(mobile.locator('.cm-editor')).toBeVisible();
  await expect(input).toHaveText(source);
  await expect(mobile.locator('.lean-keyword').first()).toHaveText('def');
  await expect(input).toBeEditable();
  await input.fill('\\forall');
  await input.press('Enter');
  await expect(input).toHaveText('∀');
  await mobile.getByRole('button', { name: 'Toggle Lean symbols' }).click();
  await mobile.getByRole('button', { name: 'Insert →', exact: true }).click();
  await expect(input).toHaveText('∀→');
  await input.fill('  exact h');
  await input.press('End');
  await input.press('Enter');
  await expect.poll(() => input.evaluate(node => [...node.querySelectorAll('.cm-line')].map(line => line.textContent).join('\n'))).toBe('  exact h\n  ');
  await input.fill(source);
  const originalFile = await mobile.getByLabel('Switch file', { exact: true }).innerText();
  await mobile.getByLabel('Switch file', { exact: true }).click();
  await mobile.locator('.file-picker').getByRole('button', { name: 'New Lean file' }).click();
  await mobile.getByLabel('File name', { exact: true }).fill('MobileTest');
  await mobile.getByRole('button', { name: 'Create file', exact: true }).click();
  await input.fill('def answer := 42');
  await input.press('End');
  await input.press('Enter');
  await input.pressSequentially('-- second file');
  await expect(mobile.locator('.lean-comment')).toHaveText('-- second file');
  await mobile.getByLabel('Switch file', { exact: true }).click();
  await mobile.locator('.file-picker').getByRole('button', { name: originalFile.trim() }).click();
  await expect(input).toHaveText(source);
  await mobile.getByLabel('Switch file', { exact: true }).click();
  await mobile.locator('.file-picker').getByRole('button', { name: 'λ MobileTest.lean' }).click();
  await expect(input).toContainText('-- second file');
  await mobile.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(input).not.toContainText('-- second file');
  await mobile.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(input).toContainText('-- second file');
  await mobile.getByLabel('Switch file', { exact: true }).click();
  await mobile.locator('.file-picker').getByRole('button', { name: originalFile.trim() }).click();
  await expect(input).toHaveText(source);
  // Allow desktop's idle-start deadline to pass. Mobile must remain download-free.
  await mobile.waitForTimeout(3000);
  assert.ok(!requests.some(request => /\/editor\/|\.(pack|wasm)(?:\?|$)|\/lean-worker\.js/.test(request)), 'Mobile editing does not download Monaco or start Lean');
  const layout = await mobile.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  assert.ok(layout.width <= layout.viewport, 'Mobile page must not overflow horizontally');
  // Hold the first real network request so the download state is observable
  // even on fast CI machines. No compiler responses or output are mocked.
  let releaseDownload!: () => void;
  const downloadGate = new Promise<void>(resolve => { releaseDownload = resolve; });
  await mobile.route('**/*.pack', async route => { await downloadGate; await route.continue(); });
  try {
    await mobile.getByRole('button', { name: 'Run program' }).click();
    await expect(mobile.locator('.runtime-loading strong')).toHaveText('Downloading Lean compiler');
    await expect(mobile.locator('.runtime-loading').getByRole('progressbar', { name: 'Lean compiler download' })).toBeVisible();
    await expect(mobile.locator('.status-download')).toBeVisible();
    await expect(input).toBeVisible();
  } finally { releaseDownload(); }
  await expect(mobile.getByRole('tabpanel')).toContainText('Hello from mobile', { timeout: 180_000 });
  await mobile.unroute('**/*.pack');
  await expect(mobile.locator('.status-download')).toHaveCount(0);
  await expect(mobile.getByRole('tabpanel')).toContainText('Program evaluated in Lean WebAssembly');
  await expect(input).toBeVisible();
  const sourceBounds = await mobile.locator('.code-area').boundingBox();
  const initialOutputBounds = await mobile.getByRole('region', { name: 'Lean execution results' }).boundingBox();
  assert.ok(sourceBounds && initialOutputBounds && initialOutputBounds.y >= sourceBounds.y + sourceBounds.height, 'Mobile output is docked below visible code');
  assert.ok(requests.some(request => request.endsWith('.pack')), 'Run downloads the real Lean runtime');
  assert.ok(!requests.some(request => /\/editor\//.test(request)), 'Running on mobile still does not need Monaco');
  await mobile.getByRole('navigation', { name: 'Workspace panels' }).getByRole('button', { name: 'Code', exact: true }).click();
  await input.fill(advancedExamples[0].code);
  await mobile.getByLabel('Run options', { exact: true }).click();
  await mobile.getByRole('button', { name: 'Check file', exact: true }).click();
  await expect(mobile.locator('.runtime-loading strong')).toHaveText('Compiling');
  await expect(mobile.locator('.runtime-loading .spin')).toBeVisible();
  await expect(mobile.getByRole('progressbar', { name: 'Lean compiler download' })).toHaveCount(0);
  await expect(input).toBeVisible();
  await expect(mobile.locator('.runtime-loading')).toBeHidden({ timeout: 30_000 });
  if (await mobile.locator('.runtime-error').count()) {
    // The pinned runtime can exceed WebKit's stack even on small reductions.
    // Check the specific limitation and recovery; other errors must fail.
    await expect(mobile.locator('.runtime-error')).toContainText('Browser stack limit reached');
    await mobile.locator('.runtime-error').getByRole('button', { name: 'Run locally' }).click();
    await expect(mobile.getByRole('heading', { name: 'Run Lean locally' })).toBeVisible();
    console.log('KNOWN LIMITATION: this WebKit build exceeds its stack on the list-reduction example; local-run guidance is available.');
  } else {
    await expect(mobile.getByRole('tabpanel')).toContainText('File checked successfully.');
  }
  await mobile.getByRole('navigation', { name: 'Workspace panels' }).getByRole('button', { name: 'Code', exact: true }).click();
  await input.fill('example : 2 + 2 = 4 := by rfl');
  await mobile.getByLabel('Run options', { exact: true }).click();
  await mobile.getByRole('button', { name: 'Check file', exact: true }).click();
  await expect(mobile.getByRole('tabpanel')).toContainText('File checked successfully.', { timeout: 60_000 });
  await mobile.getByRole('navigation', { name: 'Workspace panels' }).getByRole('button', { name: 'Code', exact: true }).click();
  await input.fill('def main : IO Unit := IO.println missingValue');
  await mobile.getByRole('button', { name: 'Run program' }).click();
  const diagnostic = mobile.locator('.diagnostic').first();
  // Safari reloads cached compiler data before producing diagnostics. The CI
  // runner can need more than the default five seconds for this initialization.
  await expect(diagnostic).toContainText('missingValue', { timeout: 60_000 });
  await diagnostic.click();
  await expect(input).toBeFocused();
  assert.ok(await input.evaluate(() => (window.getSelection()?.anchorOffset ?? 0) > 0), 'A diagnostic focuses the reported source position');
  for (const viewport of [{ width: 320, height: 568 }, { width: 844, height: 390 }]) {
    await mobile.setViewportSize(viewport);
    await mobile.getByRole('navigation', { name: 'Workspace panels' }).getByRole('button', { name: /Output/ }).click();
    const outputBounds = await mobile.getByRole('region', { name: 'Lean execution results' }).boundingBox();
    const editorBounds = await mobile.getByRole('region', { name: 'Editor workspace' }).boundingBox();
    const codeBounds = await mobile.locator('.code-area').boundingBox();
    assert.ok(outputBounds && editorBounds && outputBounds.y + outputBounds.height <= editorBounds.y + editorBounds.height, `Output remains inside the editor at ${viewport.width} × ${viewport.height}`);
    assert.ok(codeBounds && codeBounds.height >= 80 && outputBounds.y >= codeBounds.y + codeBounds.height, `Code stays above output at ${viewport.width} × ${viewport.height}`);
  }
  await mobile.getByRole('navigation', { name: 'Workspace panels' }).getByRole('button', { name: 'Guide', exact: true }).click();
  await expect(mobile.locator('.guide-panel')).toBeVisible();
  await mobile.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await expect(mobile.getByRole('dialog', { name: 'Navigation' })).toBeVisible();
  await mobile.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Learn', exact: true }).click();
  await expect(mobile.getByRole('heading', { name: 'Write Lean. Think in proofs.' })).toBeVisible();
  await expect(mobile.getByRole('dialog', { name: 'Navigation' })).toHaveCount(0);
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.goto(new URL('/learn/curry-howard', url).href);
  await mobile.getByRole('link', { name: 'Open exercise in editor' }).click();
  await expect(mobile.locator('.guide-panel')).toBeVisible();
  await mobile.getByRole('navigation', { name: 'Workspace panels' }).getByRole('button', { name: 'Code', exact: true }).click();
  await expect(mobile.locator('.code-area')).toBeVisible();
  await expect(mobile.locator('.code-area')).toHaveCSS('opacity', '1');
  await expect(mobile.locator('.lean-keyword').first()).toHaveCSS('color', 'rgb(196, 164, 237)');
  await expect(mobile.getByRole('navigation', { name: 'Workspace panels' }).getByRole('button', { name: 'Code', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const mobileNotice = mobile.getByRole('note', { name: 'Safari compatibility' });
  for (const [id, file] of [['sha256', 'SHA256.lean'], ['blake3', 'BLAKE3.lean']]) {
    await mobile.goto(new URL(`/examples/${id}`, url).href);
    await mobile.getByRole('link', { name: `Open ${file} in editor` }).click();
    await expect(mobileNotice).toBeVisible();
  }
  await mobile.setViewportSize({ width: 320, height: 568 });
  await expect(mobile.getByRole('note', { name: 'Lean compiler download' })).toContainText('WebAssembly');
  await mobile.getByRole('button', { name: 'Dismiss compiler information' }).click();
  await mobileNotice.locator('summary').click();
  assert.ok((await mobile.locator('.code-area').boundingBox())!.height > 100, 'Expanded compatibility details leave room for mobile code');
  assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Safari notice fits a narrow phone');
  await mobileNotice.getByRole('button', { name: 'Run locally', exact: true }).click();
  await expect(mobile.getByRole('heading', { name: 'Run Lean locally' })).toBeVisible();
  await mobile.getByRole('navigation', { name: 'Workspace panels' }).getByRole('button', { name: 'Code', exact: true }).click();
  await expect(mobile.getByRole('button', { name: 'Run program', exact: true })).toBeEnabled();
  await mobile.screenshot({ path: '/tmp/leanlab-safari-mobile.png' });
  // A plain mobile visit opens Welcome; saved personal files remain available.
  await mobile.goto(new URL('/examples', url).href);
  await mobile.goto(url);
  await expect(mobile.getByLabel('Switch file', { exact: true })).toContainText('Welcome.lean');
  await expect(mobile.locator('.code-area')).toBeVisible();
  const saved = await mobile.evaluate(() => JSON.parse(localStorage.getItem('lean-lab-workspace-v2')!));
  assert.ok(saved.files.some((file: { title: string }) => file.title === 'MobileTest.lean'), 'Opening Welcome preserves personal files');
  await mobile.getByRole('button', { name: 'Open navigation', exact: true }).click();
  const mobileList = mobile.locator('.explorer-scroll');
  await expect(mobileList).toHaveCSS('touch-action', 'pan-y');
  const scrollSpace = await mobileList.evaluate(node => ({ height: node.clientHeight, content: node.scrollHeight }));
  assert.ok(scrollSpace.height > 50 && scrollSpace.content > scrollSpace.height, 'WebKit constrains the example list so it can scroll');
  await mobile.getByRole('button', { name: 'Close navigation', exact: true }).click();
  assert.deepEqual(mobileErrors, [], 'WebKit mobile errors');
  console.log('PASS WebKit mobile: highlighting, Unicode, indentation, no editor/runtime download before Run, real Lean output, diagnostic navigation, mobile panels, and the Learn introduction.');
} finally { await browser.close(); }
