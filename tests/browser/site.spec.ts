import path from 'node:path';
import { mkdir, readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';
import { startServer } from '../../scripts/serve.ts';
import { fixtures, imageFile, payloads } from '../helpers/fixtures.ts';
import {
  inspectInterface,
  inspectHeaderBrand,
  inspectControlSurfaces,
  inspectControlIndicators,
} from '../../.vinasig/standards/templates/web/interface.mjs';
import {
  assertNoPageOverflow,
  assertAutomatedAccessibility,
} from '../../.vinasig/standards/templates/web/responsive.mjs';

declare global {
  interface Window {
    cameraFixture: { calls: string[]; stopped: number; blank: boolean };
    rejectScannerClipboard?: () => void;
    releaseScannerCamera?: () => void;
    lateCameraStops?: number;
  }
}
let app: Awaited<ReturnType<typeof startServer>>;
test.beforeAll(async () => {
  app = await startServer(path.resolve('dist'));
  await fixtures();
});
test.afterAll(async () => {
  await app.close();
});
async function open(page: Page, route = ''): Promise<void> {
  await page.goto(new URL(route, app.url).href);
  await expect(page.locator('[data-scanner]')).toHaveAttribute(
    'data-ready',
    'true',
  );
}
async function capture(
  page: Page,
  info: TestInfo,
  name: string,
  animationFrames = true,
): Promise<void> {
  if (animationFrames)
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
  const height = await page.evaluate(
    () => document.documentElement.scrollHeight,
  );
  for (let y = 0; y < height; y += page.viewportSize()?.height ?? 600) {
    await page.evaluate((top) => {
      window.scrollTo(0, top);
    }, y);
    if (animationFrames)
      await page.evaluate(
        () =>
          new Promise<void>((resolve) => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                resolve();
              });
            });
          }),
      );
  }
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
  const directory = path.resolve(
    'output/responsive',
    process.env['CAPTURE_PHASE'] ?? 'after',
    info.project.name,
  );
  await mkdir(directory, { recursive: true });
  const target = path.join(directory, name + '.png');
  await page.screenshot({
    path: target,
    fullPage: true,
    animations: 'disabled',
  });
  await info.attach(name, { path: target, contentType: 'image/png' });
}
async function check(page: Page): Promise<void> {
  await assertNoPageOverflow(page);
  expect(await page.evaluate(inspectInterface)).toEqual([]);
  expect(await page.evaluate(inspectControlSurfaces)).toEqual([]);
  expect(await page.evaluate(inspectControlIndicators)).toEqual([]);
  expect(await page.evaluate(inspectHeaderBrand)).toEqual([]);
}
for (const route of ['', 'en/'])
  for (const theme of ['light', 'dark'] as const)
    test(
      'responsive ' + (route || 'vi') + ' ' + theme,
      async ({ page }, info) => {
        test.setTimeout(180000);
        await page.emulateMedia({
          colorScheme: theme,
          reducedMotion: 'reduce',
        });
        await open(page, route);
        await expect(page.locator('#download-results')).toBeHidden();
        const sizes = [
          [320, 800],
          [360, 800],
          [390, 844],
          [479, 800],
          [480, 800],
          [481, 800],
          [600, 900],
          [768, 1024],
          [799, 1024],
          [800, 1024],
          [801, 1024],
          [900, 900],
          [1024, 768],
          [1280, 900],
          [1440, 900],
        ] as const;
        for (const [width, height] of sizes) {
          await page.setViewportSize({ width, height });
          await check(page);
          const prefix =
            (route ? 'en' : 'vi') +
            '-' +
            String(width) +
            'x' +
            String(height) +
            '-' +
            theme;
          await capture(page, info, prefix + '-initial');
          for (const summary of await page
            .locator('.input-disclosure > summary,.faq-item > summary')
            .all()) {
            if (
              !(await summary.evaluate((value) =>
                value.parentElement?.hasAttribute('open'),
              ))
            )
              await summary.click();
          }
          await page.locator('#image-url').fill('not-a-link');
          await page.locator('#scan-url').click();
          await expect(page.locator('#url-error')).toBeVisible();
          await check(page);
          await capture(page, info, prefix + '-expanded-error');
          await page.locator('#clear').click();
          for (const summary of await page
            .locator('.input-disclosure > summary,.faq-item > summary')
            .all()) {
            if (
              await summary.evaluate((value) =>
                value.parentElement?.hasAttribute('open'),
              )
            )
              await summary.click();
          }
        }
        await assertAutomatedAccessibility(page);
        await page.locator('[data-brand-logo]').focus();
        expect(await page.evaluate(inspectHeaderBrand)).toEqual([]);
        await page.locator('[data-brand-logo]').hover();
        expect(await page.evaluate(inspectHeaderBrand)).toEqual([]);
      },
    );

for (const route of ['', 'en/'])
  test(
    'all payloads, exact bytes, no remote leakage ' + (route || 'vi'),
    async ({ page }, info) => {
      test.setTimeout(120000);
      await open(page, route);
      const outbound: string[] = [];
      page.on('request', (request) => {
        if (
          !request.url().startsWith(app.url) &&
          !request.url().startsWith('blob:')
        )
          outbound.push(request.url());
      });
      for (const [name, text] of Object.entries(payloads)) {
        await page.locator('#file').setInputFiles(imageFile(name));
        await expect(page.locator('.code-card')).toHaveCount(1);
        await expect(
          page.locator('.code-card .content-text').first(),
        ).toHaveText(text);
        await expect(
          page.locator('.code-card details').first(),
        ).not.toHaveAttribute('open');
        expect(await page.locator('#results img,#results script').count()).toBe(
          0,
        );
        await page.locator('.code-card > details:last-child > summary').click();
        const expectedBytes = [...Buffer.from(text, 'utf8')]
          .map((value) => value.toString(16).padStart(2, '0'))
          .join(' ');
        await expect(
          page
            .locator('.technical-fields > div')
            .filter({
              has: page.locator('dt', {
                hasText: route
                  ? 'Original bytes in hex'
                  : 'Dữ liệu gốc dạng hex',
              }),
            })
            .locator('dd'),
        ).toHaveText(expectedBytes);
        await check(page);
        if (name === 'wifi' || name === 'auth') {
          await expect(
            page.locator('.code-card details').first(),
          ).not.toHaveAttribute('open');
          await expect(
            page.locator('.code-card .result-fields').first(),
          ).not.toContainText('fictional-test-password');
        }
        if (name === 'unsafe' || name === 'injection')
          await expect(page.locator('#results a')).toHaveCount(0);
        await capture(page, info, (route ? 'en' : 'vi') + '-payload-' + name);
        await page.locator('#clear').click();
      }
      expect(outbound).toEqual([]);
      expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
    },
  );

test('technical metadata, exact export and multiple results', async ({
  page,
}, info) => {
  await open(page);
  await page.locator('#file').setInputFiles(imageFile('technical'));
  await expect(page.locator('.code-card')).toHaveCount(1);
  await page.locator('.code-card > details:last-child > summary').click();
  const fields = page.locator('.technical-fields');
  await expect(fields).toContainText('QRCode');
  await expect(fields).toContainText('29 × 29');
  expect(
    await fields
      .locator('div')
      .filter({ has: page.locator('dt', { hasText: 'Phiên bản QR' }) })
      .locator('dd')
      .textContent(),
  ).toBe('3');
  expect(
    await fields
      .locator('div')
      .filter({ has: page.locator('dt', { hasText: 'Mức sửa lỗi' }) })
      .locator('dd')
      .textContent(),
  ).toBe('H');
  expect(
    await fields
      .locator('div')
      .filter({ has: page.locator('dt', { hasText: 'Mẫu mặt nạ' }) })
      .locator('dd')
      .textContent(),
  ).toBe('5');
  const exported = page.waitForEvent('download');
  await page.locator('#download-results').click();
  const downloaded = await exported;
  const filename = await downloaded.path();
  if (!filename) throw new Error('Missing download');
  const json = await readFile(filename, 'utf8');
  const decoded: unknown = JSON.parse(json);
  expect(decoded).toMatchObject({
    codes: [
      {
        text: 'VINASIG technical fixture',
        bytes: [...Buffer.from('VINASIG technical fixture', 'utf8')],
      },
    ],
  });
  expect(json).toContain('VINASIG technical fixture');
  expect(json).toContain('"decoderVersion": "3.1.4"');
  await page.locator('#file').setInputFiles(imageFile('multiple'));
  await expect(page.locator('.code-card')).toHaveCount(2);
  await expect(page.locator('#results')).toContainText(payloads.text);
  await capture(page, info, 'vi-multiple-results');
});
test('JPEG, WebP, rotated, inverted and transparent images preserve contents and metadata', async ({
  page,
}, info) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, 'en/');
  const source = (await readFile(imageFile('technical'))).toString('base64');
  for (const variant of [
    'jpeg',
    'webp',
    'rotated',
    'inverted',
    'transparent',
  ] as const) {
    const mime =
      variant === 'jpeg'
        ? 'image/jpeg'
        : variant === 'webp'
          ? 'image/webp'
          : 'image/png';
    const encoded = await page.evaluate(
      async ({ source, variant, mime }) => {
        const image = new Image();
        image.src = 'data:image/png;base64,' + source;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) throw new Error('Missing fixture canvas');
        if (variant === 'rotated') {
          context.translate(canvas.width / 2, canvas.height / 2);
          context.rotate(Math.PI / 2);
          context.drawImage(image, -canvas.width / 2, -canvas.height / 2);
        } else context.drawImage(image, 0, 0);
        if (variant === 'inverted') {
          const pixels = context.getImageData(
            0,
            0,
            canvas.width,
            canvas.height,
          );
          for (let index = 0; index < pixels.data.length; index += 4) {
            for (let channel = 0; channel < 3; channel++) {
              const value = pixels.data[index + channel];
              if (typeof value === 'number')
                pixels.data[index + channel] = 255 - value;
            }
          }
          context.putImageData(pixels, 0, 0);
        }
        if (variant === 'transparent') {
          const pixels = context.getImageData(
            0,
            0,
            canvas.width,
            canvas.height,
          );
          for (let index = 0; index < pixels.data.length; index += 4) {
            if (
              (pixels.data[index] ?? 0) > 245 &&
              (pixels.data[index + 1] ?? 0) > 245 &&
              (pixels.data[index + 2] ?? 0) > 245
            ) {
              pixels.data[index] = 0;
              pixels.data[index + 1] = 0;
              pixels.data[index + 2] = 0;
              pixels.data[index + 3] = 0;
            }
          }
          context.putImageData(pixels, 0, 0);
        }
        return canvas.toDataURL(mime, 0.85);
      },
      { source, variant, mime },
    );
    expect(encoded.startsWith('data:' + mime + ';base64,')).toBe(true);
    await page.locator('#file').setInputFiles({
      name:
        variant +
        (variant === 'jpeg' ? '.jpg' : variant === 'webp' ? '.webp' : '.png'),
      mimeType: mime,
      buffer: Buffer.from(encoded.slice(encoded.indexOf(',') + 1), 'base64'),
    });
    await expect(page.locator('.code-card')).toHaveCount(1);
    await expect(page.locator('#preview-image')).toHaveCSS(
      'background-color',
      'rgb(255, 255, 255)',
    );
    await expect(page.locator('.code-card .content-text').first()).toHaveText(
      'VINASIG technical fixture',
    );
    await page.locator('.code-card > details:last-child > summary').click();
    await expect(page.locator('.technical-fields')).toContainText('29 × 29');
    const exported = page.waitForEvent('download');
    await page.locator('#download-results').click();
    const downloaded = await exported;
    const target = await downloaded.path();
    if (!target) throw new Error('Missing fixture report');
    const decoded: unknown = JSON.parse(await readFile(target, 'utf8'));
    expect(decoded).toMatchObject({
      codes: [
        {
          text: 'VINASIG technical fixture',
          bytes: [...Buffer.from('VINASIG technical fixture', 'utf8')],
          ...(variant === 'inverted' ? { inverted: true } : {}),
        },
      ],
    });
    if (variant === 'rotated') {
      const rotation = await page
        .locator('.technical-fields > div')
        .filter({ has: page.locator('dt', { hasText: 'Rotation' }) })
        .locator('dd')
        .textContent();
      expect(Math.abs(Number(rotation?.replace('°', '')))).toBe(90);
    }
    await check(page);
    await capture(page, info, 'en-390x844-dark-' + variant + '-result');
    await page.locator('#clear').click();
  }
});

for (const name of ['MicroQRCode', 'RMQRCode'])
  test('reads ' + name, async ({ page }) => {
    await open(page);
    await page.locator('#file').setInputFiles(imageFile(name));
    await expect(page.locator('.code-card')).toHaveCount(1);
    await expect(page.locator('.code-card .content-text').first()).toHaveText(
      'VINASIG',
    );
  });

test('paste and drop events decode images without intercepting text entry', async ({
  page,
}) => {
  await open(page);
  const base64 = (await readFile(imageFile('text'))).toString('base64');
  await page.evaluate((bytes) => {
    const raw = Uint8Array.from(atob(bytes), (char) => char.charCodeAt(0));
    const data = new DataTransfer();
    data.items.add(new File([raw], 'pasted.png', { type: 'image/png' }));
    // Firefox discards files passed through the synthetic ClipboardEvent constructor.
    // Provide the real paste event data shape explicitly. Native Ctrl+V is separate.
    const event = new Event('paste', { cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: data });
    window.dispatchEvent(event);
  }, base64);
  await expect(page.locator('.code-card')).toHaveCount(1);
  await expect(page.locator('#results .content-text').first()).toHaveText(
    payloads.text,
  );
  await page.locator('#clear').click();
  await page.locator('#dropzone').evaluate((target, bytes) => {
    const raw = Uint8Array.from(atob(bytes), (char) => char.charCodeAt(0));
    const data = new DataTransfer();
    data.items.add(new File([raw], 'dropped.png', { type: 'image/png' }));
    const event = new Event('drop', { cancelable: true });
    Object.defineProperty(event, 'dataTransfer', { value: data });
    target.dispatchEvent(event);
  }, base64);
  await expect(page.locator('.code-card')).toHaveCount(1);
  await page.locator('#url-section summary').click();
  const defaultAllowed = await page
    .locator('#image-url')
    .evaluate((target) =>
      target.dispatchEvent(
        new ClipboardEvent('paste', { bubbles: true, cancelable: true }),
      ),
    );
  expect(defaultAllowed).toBe(true);
});

test('clipboard button unavailable gives adjacent recovery help', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        read: () =>
          Promise.reject(new DOMException('Fixture denial', 'NotAllowedError')),
      },
    });
  });
  await open(page);
  await page.locator('#paste').click();
  await expect(page.locator('#image-error')).toBeVisible();
  await expect(page.locator('#image-error')).toContainText('Ctrl + V');
  await expect(page.locator('.code-card')).toHaveCount(0);
});

test('real browser clipboard image and keyboard paste', async ({
  page,
  context,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'Clipboard permissions differ by engine. Paste events are covered on every engine.',
  );
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await open(page);
  const base64 = (await readFile(imageFile('url'))).toString('base64');
  await page.evaluate(async (bytes) => {
    const raw = Uint8Array.from(atob(bytes), (char) => char.charCodeAt(0));
    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': new Blob([raw], { type: 'image/png' }),
      }),
    ]);
  }, base64);
  await page.keyboard.press('Control+V');
  await expect(page.locator('.code-card')).toHaveCount(1);
  await expect(page.locator('.code-card .content-text').first()).toHaveText(
    payloads.url,
  );
  await page.locator('#clear').click();
  await page.locator('#paste').click();
  await expect(page.locator('.code-card')).toHaveCount(1);
});

test('explicit remote fetch, adjacent CORS help and no proxy', async ({
  page,
}) => {
  await open(page);
  await page.locator('#url-section summary').click();
  let count = 0;
  const bytes = await readFile(imageFile('url'));
  await page.route('https://images.fixture.invalid/**', async (route) => {
    count++;
    await route.fulfill({ status: 200, contentType: 'image/png', body: bytes });
  });
  await page
    .locator('#image-url')
    .fill('https://images.fixture.invalid/qr.png');
  expect(count).toBe(0);
  await page.locator('#scan-url').click();
  await expect(page.locator('.code-card')).toHaveCount(1);
  expect(count).toBe(1);
  await page.route('https://blocked.fixture.invalid/**', (route) =>
    route.abort('accessdenied'),
  );
  await page
    .locator('#image-url')
    .fill('https://blocked.fixture.invalid/qr.png');
  await page.locator('#scan-url').click();
  await expect(page.locator('#url-error')).toBeVisible();
  await expect(page.locator('#image-url')).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(page.locator('.code-card')).toHaveCount(0);
});

test('file and decode failures, stale fetch cancellation, clear and retry', async ({
  page,
}, info) => {
  await open(page);
  await page.locator('#file').setInputFiles({
    name: 'bad.png',
    mimeType: 'image/png',
    buffer: Buffer.from('<svg></svg>'),
  });
  await expect(page.locator('#image-error')).toBeVisible();
  await page.locator('#file').setInputFiles(imageFile('blank'));
  await expect(page.locator('#image-error')).toContainText('Chưa tìm thấy QR');
  await capture(page, info, 'vi-no-code-error');
  await page.locator('#url-section summary').click();
  await page.route('https://slow.fixture.invalid/**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route
      .fulfill({
        status: 200,
        contentType: 'image/png',
        body: await readFile(imageFile('url')),
      })
      .catch(() => undefined);
  });
  await page.locator('#image-url').fill('https://slow.fixture.invalid/qr.png');
  await page.locator('#scan-url').click();
  await page.locator('#clear').click();
  await expect(page.locator('#image-url')).toHaveValue('');
  await page.waitForTimeout(700);
  await expect(page.locator('.code-card')).toHaveCount(0);
  await expect(page.locator('#preview')).toBeHidden();
  await page.locator('#file').setInputFiles(imageFile('text'));
  await expect(page.locator('.code-card')).toHaveCount(1);
});

test('camera permission failure and no automatic camera request', async ({
  page,
}) => {
  await page.addInitScript(() => {
    let requests = 0;
    Object.defineProperty(window, 'cameraRequestCount', {
      get: () => requests,
    });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: () => {
          requests++;
          return Promise.reject(
            new DOMException('Fixture denial', 'NotAllowedError'),
          );
        },
      },
    });
  });
  await open(page);
  expect(
    await page.evaluate(
      () => Reflect.get(window, 'cameraRequestCount') as unknown,
    ),
  ).toBe(0);
  await expect(page.locator('#camera-section')).toBeHidden();
  expect(
    await page.evaluate(
      () => Reflect.get(window, 'cameraRequestCount') as unknown,
    ),
  ).toBe(0);
  await page.locator('#start-camera').click();
  await expect(page.locator('#camera-error')).toBeVisible();
  expect(
    await page.evaluate(
      () => Reflect.get(window, 'cameraRequestCount') as unknown,
    ),
  ).toBe(1);
  await expect(page.locator('#stop-camera')).toBeDisabled();
});

test('camera fixture, facing switch, stop, result and cleanup', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName === 'webkit',
    'Canvas camera streams are unavailable in the bundled WebKit. Permission and no-hardware states still run.',
  );
  const base64 = (await readFile(imageFile('url'))).toString('base64');
  await page.addInitScript((bytes) => {
    const state = { calls: [] as string[], stopped: 0, blank: true };
    Reflect.set(window, 'cameraFixture', state);
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: async (constraints: MediaStreamConstraints) => {
          const camera =
            typeof constraints.video === 'object'
              ? constraints.video
              : undefined;
          state.calls.push(
            camera &&
              typeof camera.deviceId === 'object' &&
              'exact' in camera.deviceId
              ? String(camera.deviceId.exact)
              : 'environment',
          );
          const canvas = document.createElement('canvas');
          canvas.width = 480;
          canvas.height = 480;
          const context = canvas.getContext('2d');
          if (!context) throw new Error('Fixture canvas unavailable');
          const image = new Image();
          image.src = 'data:image/png;base64,' + bytes;
          await image.decode();
          const timer = window.setInterval(() => {
            context.fillStyle = 'white';
            context.fillRect(0, 0, 480, 480);
            if (!state.blank) context.drawImage(image, 0, 0, 480, 480);
          }, 50);
          const stream = canvas.captureStream(20);
          for (const track of stream.getTracks()) {
            track.getSettings = () => ({
              deviceId: state.calls.at(-1) === 'front' ? 'front' : 'rear',
            });
            const stop = track.stop.bind(track);
            track.stop = () => {
              state.stopped++;
              window.clearInterval(timer);
              stop();
            };
          }
          return stream;
        },
        enumerateDevices: () =>
          Promise.resolve([
            { kind: 'videoinput', deviceId: 'rear' },
            { kind: 'videoinput', deviceId: 'front' },
          ]),
      },
    });
  }, base64);
  await open(page);
  await page.locator('#start-camera').click();
  await expect(page.locator('#camera-preview')).toBeVisible();
  await page.locator('#switch-camera').click();
  await expect
    .poll(() => page.evaluate(() => window.cameraFixture.calls as unknown))
    .toEqual(['environment', 'front']);
  await expect
    .poll(() => page.evaluate(() => window.cameraFixture.stopped as unknown))
    .toBe(1);
  await page.locator('#stop-camera').click();
  await expect(page.locator('#camera-preview')).toBeHidden();
  await expect
    .poll(() => page.evaluate(() => window.cameraFixture.stopped as unknown))
    .toBe(2);
  await page.locator('#start-camera').click();
  await page.evaluate(() => {
    window.cameraFixture.blank = false;
  });
  await expect(page.locator('.code-card')).toHaveCount(1);
  await expect(page.locator('#camera-preview')).toBeHidden();
  await expect
    .poll(() => page.evaluate(() => window.cameraFixture.stopped as unknown))
    .toBe(3);
});

test('theme and language preserve identity without saved payloads', async ({
  page,
}) => {
  await open(page);
  await page.locator('[data-theme-toggle]').click();
  const dark = await page.locator('html').getAttribute('data-theme');
  await expect(page.locator('.theme-switch .sun-icon')).toBeVisible();
  await expect(page.locator('.theme-switch .moon-icon')).toBeHidden();
  await expect(page.locator('.language-switch')).toHaveAttribute(
    'href',
    new URL('en/', app.url).href,
  );
  await page.locator('.language-switch').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('html')).toHaveAttribute('data-theme', dark ?? '');
  await check(page);
  expect(
    await page.evaluate(() =>
      Object.fromEntries(
        Object.keys(localStorage).map((key) => [
          key,
          localStorage.getItem(key),
        ]),
      ),
    ),
  ).toEqual({ 'vinasig-theme': dark, 'vinasig-language': 'en' });
  expect(await page.evaluate(() => sessionStorage.length)).toBe(0);
  await expect(page.locator('[data-brand-logo]')).toHaveAttribute(
    'href',
    'https://vinasig.io.vn/',
  );
});

test('large text, forced colors, reduced motion and accessible result', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  await open(page, 'en/');
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  await page.locator('#file').setInputFiles(imageFile('contact'));
  await expect(page.locator('.code-card')).toHaveCount(1);
  for (const summary of await page.locator('details > summary').all())
    await summary.click();
  await check(page);
  await assertAutomatedAccessibility(page);
  await capture(page, info, 'en-360x800-forced-colors-text200-result');
});
test('JavaScript disabled gives honest disabled controls', async ({
  browser,
}, info) => {
  const context = await browser.newContext({
    locale: 'vi-VN',
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  try {
    const page = await context.newPage();
    await page.goto(app.url);
    await expect(page.locator('#choose')).toBeDisabled();
    await expect(page.locator('noscript')).toBeVisible();
    await capture(page, info, 'vi-390x844-no-script', false);
  } finally {
    await context.close();
  }
});

test('clipboard denial after clear cannot restore an old error', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        read: () =>
          new Promise<ClipboardItem[]>((_resolve, reject) => {
            window.rejectScannerClipboard = () => {
              reject(new DOMException('Fixture denial', 'NotAllowedError'));
            };
          }),
      },
    });
  });
  await open(page);
  await page.locator('#paste').click();
  await expect
    .poll(() => page.evaluate(() => typeof window.rejectScannerClipboard))
    .toBe('function');
  await page.locator('#clear').click();
  await page.evaluate(async () => {
    window.rejectScannerClipboard?.();
    await Promise.resolve();
  });
  await expect(page.locator('#image-error')).toBeHidden();
  await expect(page.locator('.code-card')).toHaveCount(0);
});

test('copy fallback selects full text and text export preserves it', async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: () =>
          Promise.reject(new DOMException('Fixture denial', 'NotAllowedError')),
      },
    });
  });
  await page.setViewportSize({ width: 360, height: 800 });
  await open(page, 'en/');
  await page.locator('#file').setInputFiles(imageFile('long'));
  await expect(page.locator('.code-card')).toHaveCount(1);
  await expect(page.locator('.content-text').first()).toHaveText(payloads.long);
  await page.locator('article > pre').focus();
  await expect(page.locator('article > pre')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect
    .poll(() =>
      page.locator('article > pre').evaluate((element) => element.scrollTop),
    )
    .toBeGreaterThan(0);
  await page
    .getByRole('button', { name: 'Copy contents', exact: true })
    .click();
  await expect(page.locator('#results textarea')).toHaveValue(payloads.long);
  expect(
    await page
      .locator('#results textarea')
      .evaluate(
        (value: HTMLTextAreaElement) =>
          value.selectionEnd - value.selectionStart,
      ),
  ).toBe(payloads.long.length);
  const event = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Download contents', exact: true })
    .click();
  const download = await event;
  const target = await download.path();
  if (!target) throw new Error('Missing text export');
  expect(await readFile(target, 'utf8')).toBe(payloads.long);
  await check(page);
  await assertAutomatedAccessibility(page);
  await capture(page, info, 'en-360x800-long-result-copy-fallback');
});

test('camera unavailable and missing device give adjacent recovery help', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: undefined,
    });
  });
  await open(page);
  await page.locator('#start-camera').click();
  await expect(page.locator('#camera-error')).toBeVisible();
  await expect(page.locator('#stop-camera')).toBeDisabled();
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: () =>
          Promise.reject(new DOMException('Fixture missing', 'NotFoundError')),
      },
    });
  });
  await page.locator('#start-camera').click();
  await expect(page.locator('#camera-error')).toBeVisible();
  await expect(page.locator('#camera-preview')).toBeHidden();
  await expect(page.locator('#start-camera')).toBeEnabled();
});

test('license routes keep links usable in both themes and languages', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  for (const route of ['licenses/', 'en/licenses/']) {
    for (const theme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
      await page.goto(new URL(route, app.url).href);
      await expect(page.locator('.license-page')).toBeVisible();
      for (const [width, height] of [
        [360, 800],
        [390, 844],
        [768, 1024],
        [1024, 768],
        [1440, 900],
      ]) {
        if (width === undefined || height === undefined)
          throw new Error('Missing viewport');
        await page.setViewportSize({ width, height });
        await check(page);
        await assertAutomatedAccessibility(page);
        await capture(
          page,
          info,
          (route.startsWith('en') ? 'en' : 'vi') +
            '-licenses-' +
            String(width) +
            'x' +
            String(height) +
            '-' +
            theme,
        );
      }
    }
  }
});

for (const lang of ['vi', 'en'])
  test(`image URL stays secondary and fetches only on Scan ${lang}`, async ({
    page,
  }, info) => {
    let requests = 0;
    await page.route('https://image.fixture.invalid/qr.png', async (route) => {
      requests++;
      await route.fulfill({
        status: 200,
        contentType: 'image/png',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: await readFile(imageFile('text')),
      });
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page, lang === 'en' ? 'en/' : '');
    const disclosure = page.locator('#url-section');
    await expect(disclosure).not.toHaveAttribute('open');
    await disclosure.locator('summary').click();
    const field = page.getByRole('textbox', {
      name: lang === 'en' ? 'Use an image link' : 'Dùng link ảnh',
    });
    await field.fill('https://image.fixture.invalid/qr.png');
    await page.waitForTimeout(300);
    expect(requests).toBe(0);
    const input = await field.boundingBox();
    const button = await page.locator('#scan-url').boundingBox();
    if (!input || !button) throw new Error('Missing URL row');
    expect(
      Math.abs(input.y + input.height / 2 - button.y - button.height / 2),
    ).toBeLessThan(1);
    await capture(page, info, `${lang}-compact-url-row`);
    await page.locator('#scan-url').click();
    await expect(page.locator('.code-card')).toHaveCount(1);
    expect(requests).toBe(1);
  });

test('camera permission granted after clear releases every returned track', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.lateCameraStops = 0;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: () =>
          new Promise((resolve) => {
            window.releaseScannerCamera = () => {
              resolve({
                getTracks: () => [
                  {
                    stop: () => {
                      window.lateCameraStops =
                        (window.lateCameraStops ?? 0) + 1;
                    },
                  },
                ],
              });
            };
          }),
      },
    });
  });
  await open(page);
  await page.locator('#start-camera').click();
  await expect
    .poll(() => page.evaluate(() => typeof window.releaseScannerCamera))
    .toBe('function');
  await page.locator('#clear').click();
  await page.evaluate(() => {
    window.releaseScannerCamera?.();
  });
  await expect.poll(() => page.evaluate(() => window.lateCameraStops)).toBe(1);
  await expect(page.locator('#camera-preview')).toBeHidden();
  await expect(page.locator('#stop-camera')).toBeDisabled();
  await expect(page.locator('.code-card')).toHaveCount(0);
});
