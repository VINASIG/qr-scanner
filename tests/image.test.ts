import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkImage,
  checkDimensions,
  imageURL,
  scaledDimensions,
  MAX_BYTES,
} from '../src/lib/image.ts';
import { ScanError } from '../src/lib/types.ts';
void test('Accepts only public image URL syntax', () => {
  assert.equal(
    imageURL(' https://example.com/qr.png ').href,
    'https://example.com/qr.png',
  );
  for (const value of [
    'example.com',
    'file:///image.png',
    'data:image/png,a',
    'https://u:p@example.com/x',
    'https://example.com/a b',
  ])
    assert.throws(() => imageURL(value), { reason: 'invalidURL' });
});
void test('Bounds dimensions without distorting aspect ratio', () => {
  assert.deepEqual(scaledDimensions(8000, 2000), [4096, 1024]);
  assert.deepEqual(scaledDimensions(400, 600), [400, 600]);
  for (const [width, height] of [
    [0, 1],
    [1.5, 1],
    [12001, 10],
    [6000, 6000],
    [NaN, 5],
  ] as const)
    assert.throws(() => {
      checkDimensions(width, height);
    }, ScanError);
});
void test('Rejects unsupported, empty and oversized files', async () => {
  await assert.rejects(checkImage(new Blob([])), { reason: 'imageUnreadable' });
  await assert.rejects(
    checkImage(new Blob(['<svg></svg>'], { type: 'image/png' })),
    { reason: 'fileType' },
  );
  await assert.rejects(checkImage(new Blob([new Uint8Array(MAX_BYTES + 1)])), {
    reason: 'fileSize',
  });
});
void test('PNG dimensions are checked before browser decoding', async () => {
  const header = new Uint8Array(32);
  header.set([137, 80, 78, 71, 13, 10, 26, 10]);
  const view = new DataView(header.buffer);
  view.setUint32(16, 7000);
  view.setUint32(20, 7000);
  await assert.rejects(checkImage(new Blob([header])), { reason: 'imageSize' });
  view.setUint32(16, 500);
  view.setUint32(20, 500);
  await checkImage(new Blob([header]));
});
