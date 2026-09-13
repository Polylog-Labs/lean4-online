import assert from 'node:assert/strict';
import { expect, webkit } from '@playwright/test';
import type { Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { encodeSnippet } from '../lib/lean';
import { advancedExamples } from '../lib/advanced-examples';

const url = process.env.LEAN_LAB_URL || 'http://localhost:3000';
const browser = await webkit.launch();
try {
  const page = await browser.newPage();
  await page.addInitScript({ content: `
    globalThis.__name = (value) => value;
    window.leanStartup = [];
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      constructor(url, options) {
        if (String(url) === '/lean-worker.js') {
          window.leanStartup.push(!!window.leanlabMonaco?.editor.getModels().some(model => model.getLanguageId() === 'lean4'));
        }
        super(url, options);
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
  await page.waitForFunction('window.leanStartup.length > 0');
  assert.deepEqual(await page.evaluate('window.leanStartup'), [true], 'Background Lean starts only after the desktop editor is ready');
  assert.deepEqual(errors, [], 'WebKit editor startup errors');
  console.log(`PASS WebKit desktop: editor ready in ${editorMs} ms before background Lean startup.`);
  await expect(page.getByRole('tab', { name: 'λ Welcome.lean' })).toBeVisible();
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
  await mobile.getByRole('button', { name: 'Run program' }).click();
  await expect(mobile.getByRole('tabpanel')).toContainText('Hello from mobile', { timeout: 180_000 });
  await expect(mobile.getByRole('tabpanel')).toContainText('Program evaluated in Lean WebAssembly');
  assert.ok(requests.some(request => request.endsWith('.pack')), 'Run downloads the real Lean runtime');
  assert.ok(!requests.some(request => /\/editor\//.test(request)), 'Running on mobile still does not need Monaco');
  await mobile.getByRole('navigation', { name: 'Workspace panels' }).getByRole('button', { name: 'Code', exact: true }).click();
  await input.fill(advancedExamples[0].code);
  await mobile.getByLabel('Run options', { exact: true }).click();
  await mobile.getByRole('button', { name: 'Check file', exact: true }).click();
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
  await expect(diagnostic).toContainText('missingValue');
  await diagnostic.click();
  await expect(input).toBeFocused();
  assert.ok(await input.evaluate(() => (window.getSelection()?.anchorOffset ?? 0) > 0), 'A diagnostic focuses the reported source position');
  for (const viewport of [{ width: 320, height: 568 }, { width: 844, height: 390 }]) {
    await mobile.setViewportSize(viewport);
    await mobile.getByRole('navigation', { name: 'Workspace panels' }).getByRole('button', { name: /Output/ }).click();
    const outputBounds = await mobile.getByRole('region', { name: 'Lean execution results' }).boundingBox();
    const editorBounds = await mobile.getByRole('region', { name: 'Editor workspace' }).boundingBox();
    assert.ok(outputBounds && editorBounds && outputBounds.y + outputBounds.height <= editorBounds.y + editorBounds.height, `Output remains inside the editor at ${viewport.width} × ${viewport.height}`);
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
  assert.deepEqual(mobileErrors, [], 'WebKit mobile errors');
  console.log('PASS WebKit mobile: highlighting, Unicode, indentation, no editor/runtime download before Run, real Lean output, diagnostic navigation, mobile panels, and the Learn introduction.');
} finally { await browser.close(); }
