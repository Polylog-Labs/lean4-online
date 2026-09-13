import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compilerTransferLabel, compilerTransferSummary } from '../lib/runtime-progress';

test('cache checks and device reads are not labeled as downloads', () => {
  assert.equal(compilerTransferLabel({ received: 0, cached: 0, total: 46_000_000 }), 'Checking device storage');
  assert.equal(compilerTransferLabel({ received: 0, cached: 46_000_000, total: 46_000_000 }), '46.0 MB from device storage');
  assert.equal(compilerTransferSummary({ received: 0, cached: 46_000_000, total: 46_000_000 }), 'Compiler loaded from device storage (46.0 MB). No compiler data downloaded.');
  assert.equal(compilerTransferSummary(null), 'Compiler already in memory. No compiler data downloaded.');
});

test('partial cache hits report both sources and never claim a zero-byte download', () => {
  assert.equal(compilerTransferSummary({ received: 5_000_000, cached: 41_000_000, total: 46_000_000 }), 'Compiler data: 5.0 MB downloaded · 41.0 MB from device storage.');
  assert.equal(compilerTransferSummary({ received: 46_000_000, cached: 0, total: 46_000_000 }), 'Compiler data: 46.0 MB downloaded.');
  assert.ok(!compilerTransferSummary({ received: 1, cached: 45_999_999, total: 46_000_000 }).includes('No compiler data downloaded'));
});
