import assert from 'node:assert/strict';
import { expect, type Browser } from '@playwright/test';
import type { editor } from 'monaco-editor';
import type { Monaco } from '@monaco-editor/react';
import { lengthProof, median, proofSizes } from '../lib/proof-comparison';

type ObservedWindow = Window & {
  leanlabMonaco?: Monaco;
  comparisonRuns: { code: string; elapsed?: number; success?: boolean }[];
  comparisonWorkers: number;
  holdComparison: boolean;
};

export async function verifyProofComparison(browser: Browser, origin: string) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  try {
    await page.addInitScript({ content: 'globalThis.__name = v => v;' });
    await page.addInitScript(() => {
      const observed = window as unknown as ObservedWindow;
      observed.comparisonRuns = []; observed.comparisonWorkers = 0; observed.holdComparison = false;
      const NativeWorker = window.Worker;
      window.Worker = class extends NativeWorker {
        private runtime: boolean;
        constructor(url: string | URL, options?: WorkerOptions) {
          super(url, options); this.runtime = String(url) === '/lean-worker.js';
          if (this.runtime) {
            observed.comparisonWorkers++;
            this.addEventListener('message', event => {
              if (event.data.type === 'result') {
                const last = observed.comparisonRuns.at(-1);
                if (last) { last.elapsed = event.data.elapsed; last.success = event.data.success; }
                if (observed.holdComparison) event.stopImmediatePropagation();
              }
            });
          }
        }
        postMessage(message: unknown, options?: Transferable[] | StructuredSerializeOptions) {
          const run = message as { type: string; code: string };
          if (this.runtime && run.type === 'run') observed.comparisonRuns.push({ code: run.code });
          if (Array.isArray(options)) super.postMessage(message, options);
          else super.postMessage(message, options);
        }
      };
    });
    await page.goto(`${origin}/learn/proof-efficiency`);
    await expect(page.locator('.proof-card')).toHaveCount(2);
    await page.getByRole('link', { name: 'Open exercise in editor' }).click();
    const panel = page.getByRole('region', { name: 'Compare proof checking' });
    await expect(panel).toBeVisible();
    await page.waitForFunction(() => (window as unknown as ObservedWindow).leanlabMonaco?.editor.getModels().some((model: editor.ITextModel) => model.getLanguageId() === 'lean4'));
    // Direct lesson entry must stay readable without compiler preloading.
    await page.waitForTimeout(3000);
    assert.equal(await page.evaluate(() => (window as unknown as ObservedWindow).comparisonWorkers), 0);
    const cards = panel.locator('.proof-card');
    const left = (await cards.nth(0).boundingBox())!, right = (await cards.nth(1).boundingBox())!;
    assert.equal(left.y, right.y); assert.ok(left.x + left.width <= right.x, 'Desktop proofs are side by side');
    for (const size of proofSizes) {
      await panel.getByLabel('Comparison list size').selectOption(String(size));
      for (const [index, kind] of (['calculate', 'reuse'] as const).entries()) {
        await expect(cards.nth(index).locator('pre')).toHaveText(lengthProof(size, kind));
      }
    }
    const savedSource = `${lengthProof(100, 'exercise')}\n-- Keep my draft.\n`;
    await page.evaluate(code => {
      const model = (window as unknown as ObservedWindow).leanlabMonaco!.editor.getModels().find((model: editor.ITextModel) => model.getLanguageId() === 'lean4')!;
      model.setValue(code);
    }, savedSource);
    await panel.getByRole('button', { name: 'Compare both proofs', exact: true }).click();
    await expect(panel.getByRole('button', { name: 'Stop comparison', exact: true })).toBeVisible();
    await page.getByLabel('Run options', { exact: true }).click();
    await expect(page.getByRole('button', { name: 'Check file', exact: true })).toBeDisabled();
    await page.getByLabel('Run options', { exact: true }).click();
    await expect(panel.locator('.comparison-results')).toBeVisible({ timeout: 120000 });
    const runs = await page.evaluate(() => (window as unknown as ObservedWindow).comparisonRuns);
    assert.equal(runs.length, 12);
    assert.ok(runs.every(run => run.success && Number.isFinite(run.elapsed)));
    for (const [index, kind] of (['calculate', 'reuse'] as const).entries()) {
      const measured = runs.slice(2).filter(run => run.code === lengthProof(100, kind));
      assert.equal(measured.length, 5);
      await expect(cards.nth(index).locator('.proof-time')).toHaveText(`${median(measured.map(run => run.elapsed!)).toFixed(1)} ms`);
    }
    assert.equal(await page.evaluate(() => (window as unknown as ObservedWindow).leanlabMonaco!.editor.getModels().find((model: editor.ITextModel) => model.getLanguageId() === 'lean4')!.getValue()), savedSource);
    await expect(page.locator('.completion-card')).toHaveCount(0);
    await page.screenshot({ path: '/tmp/leanlab-proof-comparison-desktop.png' });
    // Hold a real worker result so cancellation is deterministic, without
    // fabricating the compiler's measurements or bypassing its actual check.
    await page.evaluate(() => { (window as unknown as ObservedWindow).holdComparison = true; });
    await panel.getByRole('button', { name: 'Compare both proofs', exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as unknown as ObservedWindow).comparisonRuns.length)).toBe(13);
    await panel.getByLabel('Comparison list size').selectOption('20');
    await expect(panel.locator('.proof-time')).toHaveCount(0);
    await expect(panel.getByRole('button', { name: 'Compare both proofs', exact: true })).toBeEnabled();
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => (window as unknown as ObservedWindow).comparisonRuns.length), 13);
    await page.evaluate(() => { (window as unknown as ObservedWindow).holdComparison = false; });
    await panel.getByRole('button', { name: 'Compare both proofs', exact: true }).click();
    await expect(panel.locator('.proof-time')).toHaveCount(2, { timeout: 120000 });
    await panel.getByRole('button', { name: 'Compare both proofs', exact: true }).click();
    await panel.getByRole('button', { name: 'Stop comparison', exact: true }).click();
    await expect(panel).toContainText('Comparison stopped.');
    await page.getByRole('button', { name: 'Check exercise', exact: true }).click();
    await expect(page.locator('.result-status')).toContainText('Incomplete', { timeout: 60000 });
    await expect(page.locator('.completion-card')).toHaveCount(0);
    console.log('PASS proof comparison: real timings, alternating samples, no preload, side-by-side cards, cancellation, run locking, and unchanged exercise.');
  } finally { await page.close(); }

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  try {
    await mobile.goto(`${origin}/learn/proof-efficiency`);
    await mobile.getByRole('link', { name: 'Open exercise in editor' }).click();
    const panel = mobile.getByRole('region', { name: 'Compare proof checking' });
    await expect(panel).toBeVisible();
    const cards = panel.locator('.proof-card');
    const first = (await cards.nth(0).boundingBox())!, second = (await cards.nth(1).boundingBox())!;
    assert.equal(first.x, second.x); assert.ok(first.y + first.height <= second.y);
    assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await panel.getByLabel('Comparison list size').selectOption('50');
    await expect(cards.nth(1).locator('pre')).toHaveText(lengthProof(50, 'reuse'));
    await mobile.screenshot({ path: '/tmp/leanlab-proof-comparison-mobile.png' });
    console.log('PASS mobile proof comparison: stacked code, shared selector, and no horizontal page overflow.');
  } finally { await mobile.close(); }
}
