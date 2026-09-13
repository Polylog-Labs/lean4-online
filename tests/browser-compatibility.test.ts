import assert from 'node:assert/strict';
import { test } from 'node:test';
import { examples, lessons } from '../lib/content';
import { isStackLimitError, safariLimitedExamples, safariLimitedLessons, usesWebKit } from '../lib/browser-compatibility';

test('WebKit notices include Safari and iOS browsers without flagging desktop Chromium', () => {
  for (const agent of [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.6 Safari/605.1.15',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 Version/18.6 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 CriOS/140.0.0.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPad) AppleWebKit/605.1.15 FxiOS/140.0 Mobile/15E148 Safari/605.1.15',
  ]) assert.equal(usesWebKit(agent), true, agent);
  for (const agent of [
    'Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',
    'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/140.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Macintosh) Gecko/20100101 Firefox/140.0',
    '',
  ]) assert.equal(usesWebKit(agent), false, agent);
});

test('compatibility metadata references real content and keeps exercises separate from examples', () => {
  for (const id of safariLimitedExamples) assert.ok(examples.some(item => item.id === id), id);
  for (const id of safariLimitedLessons) assert.ok(lessons.some(item => item.id === id), id);
  assert.ok(safariLimitedExamples.has('tail-recursion'));
  assert.ok(!safariLimitedLessons.has('tail-recursion'), 'The invariant exercise works even though the executable example fails');
  for (const id of ['welcome', 'functions', 'two-plus-two', 'curry-howard']) assert.ok(!safariLimitedExamples.has(id));
});

test('only runtime stack errors receive stack-limit guidance', () => {
  assert.ok(isStackLimitError('Maximum call stack size exceeded.'));
  assert.ok(isStackLimitError('RangeError: stack overflow'));
  assert.ok(!isStackLimitError('Lean compiler checksum mismatch.'));
  assert.ok(!isStackLimitError('Network request failed.'));
});
