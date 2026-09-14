import assert from 'node:assert/strict';
import test from 'node:test';
import { compareProofs, lengthProof, median, proofSizes } from '../lib/proof-comparison';
import { finishRun } from '../lib/lean';

test('proofs share the same statement at every supported size', () => {
  for (const size of proofSizes) {
    const left = lengthProof(size, 'calculate'), right = lengthProof(size, 'reuse');
    assert.equal(left.split(':= by')[0], right.split(':= by')[0]);
    assert.ok(left.includes(`replicate ${size} 7`));
  }
  assert.equal(median([9, 1, 3, 5, 7]), 5);
  assert.equal(median([1, 9, 3, 5]), 4);
});

test('comparison excludes warm-up and uses successful worker timings in alternating order', async () => {
  const codes: string[] = [];
  const times = [999, 888, 5, 40, 20, 3, 9, 10, 30, 7, 1, 50];
  const result = await compareProofs(async code => {
    codes.push(code);
    return finishRun(true, times[codes.length - 1], []);
  }, 50, new AbortController().signal, () => {});
  assert.equal(codes.length, 12);
  assert.deepEqual(codes.slice(0, 4), [lengthProof(50, 'calculate'), lengthProof(50, 'reuse'), lengthProof(50, 'reuse'), lengthProof(50, 'calculate')]);
  assert.deepEqual(result.calculate.samples, [40, 20, 10, 30, 50]);
  assert.deepEqual(result.reuse.samples, [5, 3, 9, 7, 1]);
  assert.equal(result.calculate.median, 30);
  assert.equal(result.reuse.median, 5);
});

test('failed or unfinished proofs never produce a benchmark result', async () => {
  for (const result of [finishRun(false, 1, []), { ...finishRun(true, 1, []), incomplete: true }]) {
    let count = 0;
    await assert.rejects(compareProofs(async () => { count++; return result; }, 20, new AbortController().signal, () => {}), /did not complete/);
    assert.equal(count, 1);
  }
});

test('cancellation during a check prevents later checks and stale results', async () => {
  const controller = new AbortController(); let count = 0;
  await assert.rejects(compareProofs(async () => {
    count++; controller.abort(); return finishRun(true, 1, []);
  }, 100, controller.signal, () => {}), { name: 'AbortError' });
  assert.equal(count, 1);
});
