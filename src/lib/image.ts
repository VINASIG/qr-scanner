import { hasUnsafeURLCharacter } from './payload.ts';
import { ScanError } from './types.ts';
export const MAX_BYTES = 20 * 1024 * 1024;
export const MAX_PIXELS = 24_000_000;
export const MAX_SIDE = 12_000;
export const DECODE_SIDE = 4096;
export function checkDimensions(width: number, height: number): void {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width < 1 ||
    height < 1
  )
    throw new ScanError('imageUnreadable');
  if (width > MAX_SIDE || height > MAX_SIDE || width * height > MAX_PIXELS)
    throw new ScanError('imageSize');
}
export function scaledDimensions(
  width: number,
  height: number,
): [number, number] {
  checkDimensions(width, height);
  const scale = Math.min(1, DECODE_SIDE / Math.max(width, height));
  return [
    Math.max(1, Math.round(width * scale)),
    Math.max(1, Math.round(height * scale)),
  ];
}
export async function checkImage(blob: Blob): Promise<void> {
  if (blob.size === 0) throw new ScanError('imageUnreadable');
  if (blob.size > MAX_BYTES) throw new ScanError('fileSize');
  const bytes = new Uint8Array(await blob.slice(0, 32).arrayBuffer());
  const ascii = new TextDecoder('ascii').decode(bytes);
  const png =
    bytes[0] === 137 &&
    ascii.slice(1, 4) === 'PNG' &&
    bytes[4] === 13 &&
    bytes[5] === 10;
  const supported =
    png ||
    (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) ||
    /^(GIF87a|GIF89a)/u.test(ascii) ||
    ascii.startsWith('BM') ||
    (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP') ||
    (ascii.slice(4, 8) === 'ftyp' && /avif|avis/u.test(ascii.slice(8)));
  if (!supported) throw new ScanError('fileType');
  if (png && bytes.length >= 24) {
    const view = new DataView(bytes.buffer);
    checkDimensions(view.getUint32(16), view.getUint32(20));
  }
}
export function imageURL(value: string): URL {
  try {
    if (hasUnsafeURLCharacter(value.trim())) throw new Error('Whitespace');
    const url = new URL(value.trim());
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password
    )
      throw new Error('Protocol');
    return url;
  } catch {
    throw new ScanError('invalidURL');
  }
}
export async function fetchImage(
  value: string,
  signal: AbortSignal,
): Promise<Blob> {
  const url = imageURL(value);
  try {
    const response = await fetch(url, {
      signal,
      mode: 'cors',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
    if (!response.ok || !response.body) throw new ScanError('urlBlocked');
    const size = Number(response.headers.get('content-length'));
    if (size > MAX_BYTES) throw new ScanError('fileSize');
    const reader = response.body.getReader();
    const chunks: ArrayBuffer[] = [];
    let total = 0;
    try {
      for (;;) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        total += chunk.byteLength;
        if (total > MAX_BYTES) throw new ScanError('fileSize');
        chunks.push(chunk.slice().buffer);
      }
    } finally {
      await reader.cancel().catch(() => undefined);
    }
    return new Blob(chunks, {
      type: response.headers.get('content-type') ?? '',
    });
  } catch (error) {
    if (error instanceof ScanError) throw error;
    if (signal.aborted) throw new ScanError('timeout');
    throw new ScanError('urlBlocked');
  }
}
