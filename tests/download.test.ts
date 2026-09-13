import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readDownload } from '../runtime/download';

const data = new Uint8Array([1, 2, 3, 4]);
const artifact = { file: 'test.pack', compressedBytes: data.length, sha256: createHash('sha256').update(data).digest('hex') };
test('download progress counts bytes as chunks arrive and verifies integrity', async () => {
  const chunks: number[] = [];
  const stream = new ReadableStream({ start(controller) { controller.enqueue(data.slice(0, 1)); controller.enqueue(data.slice(1)); controller.close(); } });
  assert.deepEqual(await readDownload(new Response(stream), artifact, bytes => chunks.push(bytes)), data);
  assert.deepEqual(chunks, [1, 3]);
});
test('runtime downloads reject errors, truncation, oversize data, and wrong content', async () => {
  for (const response of [new Response(null, { status: 404 }), new Response(data.slice(0, 2)), new Response(new Uint8Array(5)), new Response(new Uint8Array(4))]) {
    await assert.rejects(readDownload(response, artifact, () => {}));
  }
});
