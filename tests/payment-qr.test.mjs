import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_PAYMENT_QR_BYTES,
  readPaymentQrBlob,
} from '../lib/event-availability.ts';

function responseStream(chunks, headers = {}) {
  let reads = 0;
  let cancelled = false;
  const body = new ReadableStream(
    {
      pull(controller) {
        if (reads === chunks.length) return controller.close();
        controller.enqueue(chunks[reads++]);
      },
      cancel() {
        cancelled = true;
      },
    },
    { highWaterMark: 0 },
  );
  return {
    response: new Response(body, {
      headers: { 'content-type': 'image/png', ...headers },
    }),
    reads: () => reads,
    cancelled: () => cancelled,
  };
}

test('oversized declared QR bodies are cancelled before any bytes are read', async () => {
  const input = responseStream([new Uint8Array(1)], {
    'content-length': String(MAX_PAYMENT_QR_BYTES + 1),
  });
  await assert.rejects(readPaymentQrBlob(input.response), /exceeds 5 MB/);
  assert.equal(input.reads(), 0);
  assert.equal(input.cancelled(), true);
});

test('chunked and understated QR bodies stop as soon as the streaming limit is exceeded', async () => {
  for (const headers of [{}, { 'content-length': '10' }]) {
    const input = responseStream(
      [
        new Uint8Array(MAX_PAYMENT_QR_BYTES),
        new Uint8Array(1),
        new Uint8Array(100),
      ],
      headers,
    );
    await assert.rejects(readPaymentQrBlob(input.response), /exceeds 5 MB/);
    assert.equal(
      input.reads(),
      2,
      'must not drain the rest of the oversized response',
    );
    assert.equal(input.cancelled(), true);
  }
});

test('a QR exactly at the limit succeeds and preserves its image MIME type', async () => {
  const input = responseStream([
    new Uint8Array(MAX_PAYMENT_QR_BYTES / 2),
    new Uint8Array(MAX_PAYMENT_QR_BYTES / 2),
  ]);
  const blob = await readPaymentQrBlob(input.response);
  assert.equal(blob.size, MAX_PAYMENT_QR_BYTES);
  assert.equal(blob.type, 'image/png');
  assert.equal(input.cancelled(), false);
});

test('empty or missing QR bodies are not offered as downloads', async () => {
  await assert.rejects(readPaymentQrBlob(new Response(null)), /no image body/);
  await assert.rejects(readPaymentQrBlob(responseStream([]).response), /empty/);
});
