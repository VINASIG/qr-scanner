import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';
import { PNG } from 'pngjs';
import { prepareZXingModule, writeBarcode } from 'zxing-wasm/writer';
export const fixtureRoot = path.resolve('output/fixtures');
export const payloads = {
  text: 'VINASIG - Xin chào 👋\nFull contents stay on your device.',
  url: 'https://vinasig.io.vn/?test=qr-scanner',
  wifi: 'WIFI:T:WPA;S:VINASIG Guest;P:fictional-test-password;H:false;;',
  email: 'mailto:hello@example.com?subject=Hello&body=A%20test%20message',
  phone: 'tel:+84912345678',
  sms: 'SMSTO:+84912345678:Hello from VINASIG',
  contact:
    'BEGIN:VCARD\nVERSION:3.0\nFN:Test User\nTEL:+84912345678\nEMAIL:test@example.com\nEND:VCARD',
  location: 'geo:10.7769,106.7009',
  calendar:
    'BEGIN:VEVENT\nSUMMARY:Fixture event\nDTSTART:20261005T080000Z\nDTEND:20261005T090000Z\nEND:VEVENT',
  auth: 'otpauth://totp/Fixture:test@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Fixture',
  long:
    'Full text ' +
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.repeat(36) +
    '\nNội dung tiếng Việt được giữ nguyên. 😀',
  unsafe: 'javascript:alert("fixture-only")',
  injection:
    '<img src="https://fixture.invalid/leak" onerror="alert(1)">\n<script>alert(2)</script>',
} as const;
let ready: Promise<void> | null = null;
async function createFixtures(): Promise<void> {
  await mkdir(fixtureRoot, { recursive: true });
  for (const [name, text] of Object.entries(payloads)) {
    await QRCode.toFile(path.join(fixtureRoot, name + '.png'), text, {
      type: 'png',
      width: 480,
      margin: 4,
      errorCorrectionLevel: 'Q',
    });
  }
  await QRCode.toFile(
    path.join(fixtureRoot, 'technical.png'),
    'VINASIG technical fixture',
    {
      type: 'png',
      width: 480,
      margin: 4,
      version: 3,
      maskPattern: 5,
      errorCorrectionLevel: 'H',
    },
  );
  const left = PNG.sync.read(
    await readFile(path.join(fixtureRoot, 'text.png')),
  );
  const right = PNG.sync.read(
    await readFile(path.join(fixtureRoot, 'url.png')),
  );
  const multiple = new PNG({
    width: left.width + right.width + 80,
    height: left.height,
  });
  multiple.data.fill(255);
  PNG.bitblt(left, multiple, 0, 0, left.width, left.height, 0, 0);
  PNG.bitblt(
    right,
    multiple,
    0,
    0,
    right.width,
    right.height,
    left.width + 80,
    0,
  );
  await writeFile(
    path.join(fixtureRoot, 'multiple.png'),
    PNG.sync.write(multiple),
  );
  const blank = new PNG({ width: 480, height: 480 });
  blank.data.fill(255);
  await writeFile(path.join(fixtureRoot, 'blank.png'), PNG.sync.write(blank));
  const large = new PNG({ width: 8192, height: 64 });
  large.data.fill(255);
  PNG.bitblt(left, large, 0, 0, 1, 1, 0, 0);
  await writeFile(path.join(fixtureRoot, 'wide.png'), PNG.sync.write(large));
  const writerWASM = await readFile(
    path.resolve('node_modules/zxing-wasm/dist/writer/zxing_writer.wasm'),
  );
  await prepareZXingModule({
    overrides: { wasmBinary: writerWASM },
    fireImmediately: true,
  });
  for (const format of ['MicroQRCode', 'RMQRCode'] as const) {
    const written = await writeBarcode('VINASIG', {
      format,
      scale: 12,
      addQuietZones: true,
    });
    assert(!written.error && written.image, written.error);
    await writeFile(
      path.join(fixtureRoot, format + '.png'),
      Buffer.from(await written.image.arrayBuffer()),
    );
  }
}
export async function fixtures(): Promise<void> {
  await (ready ??= createFixtures());
}
export const imageFile = (name: string): string =>
  path.join(fixtureRoot, name + '.png');
