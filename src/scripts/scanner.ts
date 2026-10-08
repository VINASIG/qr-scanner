import { copy } from '../lib/copy.ts';
import type { CopyKey } from '../lib/copy.ts';
import { checkImage, fetchImage, scaledDimensions } from '../lib/image.ts';
import { extraMetadata, hex, parseContent } from '../lib/payload.ts';
import { ScanError } from '../lib/types.ts';
import type {
  Failure,
  ScanReport,
  WorkerJob,
  WorkerReply,
} from '../lib/types.ts';

function element<T extends HTMLElement>(
  selector: string,
  type: new () => T,
): T {
  const found = document.querySelector(selector);
  if (!(found instanceof type))
    throw new Error('Missing scanner element ' + selector);
  return found;
}
function clipboardAPI(): Partial<Clipboard> | undefined {
  const value: unknown = Reflect.get(navigator, 'clipboard');
  return value !== null && typeof value === 'object' ? value : undefined;
}
function mediaAPI(): Partial<MediaDevices> | undefined {
  const value: unknown = Reflect.get(navigator, 'mediaDevices');
  return value !== null && typeof value === 'object' ? value : undefined;
}
const cameraActive = (): boolean => stream !== null;
const root = element('[data-scanner]', HTMLElement);
const t = copy(root.dataset['lang'] === 'en' ? 'en' : 'vi');
const file = element('#file', HTMLInputElement);
const dropzone = element('#dropzone', HTMLDivElement);
const pasteField = element('#image-paste', HTMLTextAreaElement);
const cameraSection = element('#camera-section', HTMLDetailsElement);
const preview = element('#preview', HTMLElement);
const previewImage = element('#preview-image', HTMLImageElement);
const urlInput = element('#image-url', HTMLInputElement);
const video = element('#video', HTMLVideoElement);
const cameraPreview = element('#camera-preview', HTMLDivElement);
const startCamera = element('#start-camera', HTMLButtonElement);
const stopCamera = element('#stop-camera', HTMLButtonElement);
const empty = element('#empty', HTMLDivElement);
const results = element('#results', HTMLDivElement);
const status = element('#status', HTMLParagraphElement);
const resultPane = element('.result-pane', HTMLDivElement);
const downloadResults = element('#download-results', HTMLButtonElement);
let generation = 0;
let requestId = 0;
let worker: Worker | null = null;
let pendingCancel: (() => void) | null = null;
let request: AbortController | null = null;
let stream: MediaStream | null = null;
let cameraTimer: number | undefined;
let previewURL: string | null = null;
let report: ScanReport | null = null;

function showError(
  area: 'image' | 'url' | 'camera',
  reason: Failure | null,
): void {
  const target = element('#' + area + '-error', HTMLParagraphElement);
  target.textContent = reason ? t[reason] : '';
  target.hidden = !reason;
  if (area === 'url') {
    if (reason) urlInput.setAttribute('aria-invalid', 'true');
    else urlInput.removeAttribute('aria-invalid');
  }
}
function busy(value: boolean, message = ''): void {
  resultPane.setAttribute('aria-busy', String(value));
  status.textContent = message;
}
function stopTracks(): void {
  window.clearTimeout(cameraTimer);
  cameraTimer = undefined;
  for (const track of stream?.getTracks() ?? []) track.stop();
  stream = null;
  video.srcObject = null;
  cameraPreview.hidden = true;
  stopCamera.disabled = true;
  startCamera.disabled = false;
}
function cancel(): number {
  generation++;
  request?.abort();
  request = null;
  pendingCancel?.();
  pendingCancel = null;
  stopTracks();
  return generation;
}
function discardResults(): void {
  report = null;
  results.replaceChildren();
  empty.hidden = false;
  downloadResults.hidden = true;
  downloadResults.disabled = true;
}
function discardPreview(): void {
  if (previewURL) URL.revokeObjectURL(previewURL);
  previewURL = null;
  previewImage.removeAttribute('src');
  preview.hidden = true;
  element('#image-name', HTMLElement).textContent = '';
}
function begin(): number {
  pasteField.value = '';
  const id = cancel();
  for (const area of ['image', 'url', 'camera'] as const) showError(area, null);
  discardResults();
  discardPreview();
  busy(false);
  return id;
}
function reason(error: unknown): Failure {
  return error instanceof ScanError ? error.reason : 'imageUnreadable';
}
function runWorker(pixels: ImageData): Promise<ScanReport> {
  const activeWorker = (worker ??= new Worker(
    new URL('./decoder.worker.ts', import.meta.url),
    { type: 'module' },
  ));
  const id = ++requestId;
  const job: WorkerJob = {
    id,
    width: pixels.width,
    height: pixels.height,
    pixels: pixels.data.slice().buffer,
  };
  return new Promise<ScanReport>((resolve, reject) => {
    const finish = (): void => {
      window.clearTimeout(timer);
      pendingCancel = null;
      activeWorker.onmessage = null;
      activeWorker.onerror = null;
    };
    const terminate = (): void => {
      activeWorker.terminate();
      if (worker === activeWorker) worker = null;
    };
    const timer = window.setTimeout(() => {
      finish();
      terminate();
      reject(new ScanError('timeout'));
    }, 15_000);
    pendingCancel = () => {
      finish();
      terminate();
      reject(new DOMException('Cancelled', 'AbortError'));
    };
    activeWorker.onmessage = (event: MessageEvent<WorkerReply>) => {
      if (event.data.id !== id) return;
      finish();
      if (event.data.ok) resolve(event.data.report);
      else {
        terminate();
        reject(new ScanError('decoderFailed'));
      }
    };
    activeWorker.onerror = () => {
      finish();
      terminate();
      reject(new ScanError('decoderFailed'));
    };
    activeWorker.postMessage(job, [job.pixels]);
  });
}
async function imageSource(blob: Blob): Promise<{
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
}> {
  if (typeof createImageBitmap === 'function') {
    try {
      const image = await createImageBitmap(blob);
      return {
        source: image,
        width: image.width,
        height: image.height,
        release: () => {
          image.close();
        },
      };
    } catch {
      /* Some browser image formats only work through the image element. */
    }
  }
  const url = URL.createObjectURL(blob);
  const image = new Image();
  try {
    image.src = url;
    await image.decode();
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => {
        image.removeAttribute('src');
        URL.revokeObjectURL(url);
      },
    };
  } catch {
    URL.revokeObjectURL(url);
    throw new ScanError('imageUnreadable');
  }
}
function canvasPixels(
  source: CanvasImageSource,
  width: number,
  height: number,
): ImageData {
  const [scaledWidth, scaledHeight] = scaledDimensions(width, height);
  const canvas = document.createElement('canvas');
  canvas.width = scaledWidth;
  canvas.height = scaledHeight;
  try {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new ScanError('imageUnreadable');
    // Composite transparency onto paper white before converting to luminance.
    context.fillStyle = '#fff';
    context.fillRect(0, 0, scaledWidth, scaledHeight);
    context.drawImage(source, 0, 0, scaledWidth, scaledHeight);
    return context.getImageData(0, 0, scaledWidth, scaledHeight);
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}
async function readImage(
  blob: Blob,
  name: string,
  id: number,
  area: 'image' | 'url',
): Promise<void> {
  try {
    busy(true, t.scanning);
    await checkImage(blob);
    if (generation !== id) return;
    const image = await imageSource(blob);
    let pixels: ImageData;
    try {
      if (generation !== id) return;
      pixels = canvasPixels(image.source, image.width, image.height);
    } finally {
      image.release();
    }
    if (generation !== id) return;
    previewURL = URL.createObjectURL(blob);
    previewImage.src = previewURL;
    preview.hidden = false;
    element('#image-name', HTMLElement).textContent = name;
    const next = await runWorker(pixels);
    if (generation !== id) return;
    if (!next.codes.length) throw new ScanError('noQR');
    showReport(next);
  } catch (error) {
    if (generation === id) {
      showError(area, reason(error));
      busy(false);
    }
  }
}
function acceptImage(blob: Blob, name: string): void {
  const id = begin();
  void readImage(blob, name, id, 'image');
}
function node<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text = '',
  className = '',
): HTMLElementTagNameMap[K] {
  const value = document.createElement(tag);
  value.textContent = text;
  if (className) value.className = className;
  return value;
}
function scrollableText(text: string, label: string): HTMLPreElement {
  const value = node('pre', text, 'content-text');
  value.tabIndex = 0;
  value.setAttribute('role', 'region');
  value.setAttribute('aria-label', label);
  return value;
}
function disclosure(label: string, content: HTMLElement[]): HTMLDetailsElement {
  const value = node('details');
  value.append(node('summary', label), ...content);
  return value;
}
function table(
  values: [string, string][],
  className: string,
): HTMLDListElement {
  const list = node('dl', '', className);
  for (const [key, value] of values) {
    const row = node('div');
    row.append(node('dt', key), node('dd', value));
    list.append(row);
  }
  return list;
}
function action(label: string, handler: () => void): HTMLButtonElement {
  const button = node('button', label, 'button button-secondary');
  button.type = 'button';
  button.addEventListener('click', handler);
  return button;
}
function download(text: string, name: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = node('a');
  anchor.href = url;
  anchor.download = name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}
function metadataValue(value: unknown): string {
  if (typeof value === 'number' || typeof value === 'string')
    return String(value);
  return t.unknown;
}
function showReport(next: ScanReport): void {
  report = next;
  empty.hidden = true;
  results.replaceChildren();
  busy(
    false,
    t.success +
      '. ' +
      String(next.codes.length) +
      ' ' +
      (next.codes.length === 1 ? t.codeFound : t.codes) +
      '.',
  );
  downloadResults.hidden = false;
  downloadResults.disabled = false;
  for (const [index, code] of next.codes.entries()) {
    const parsed = parseContent(code.text);
    const card = node('article', '', 'code-card');
    card.dataset['result'] = String(index);
    card.append(node('h3', t[parsed.kind], 'kind'));
    const publicFields = parsed.fields.filter((item) => !item.sensitive);
    if (publicFields.length)
      card.append(
        table(
          publicFields.map((item) => [t[item.label], item.value]),
          'result-fields',
        ),
      );
    const original = scrollableText(code.text, t.raw);
    if (parsed.sensitive) {
      const privateFields = parsed.fields.filter((item) => item.sensitive);
      card.append(
        disclosure(t.sensitive, [
          node('p', t.sensitiveHelp, 'small muted'),
          table(
            privateFields.map((item) => [t[item.label], item.value]),
            'result-fields',
          ),
          original,
        ]),
      );
    } else if (parsed.kind === 'plain') card.append(original);
    else card.append(disclosure(t.raw, [original]));
    const row = node('div', '', 'button-row');
    const feedback = node('p', '', 'small muted');
    feedback.setAttribute('role', 'status');
    row.append(
      action(t.copy, () => {
        void (async () => {
          try {
            const clipboard = clipboardAPI();
            if (!clipboard?.writeText) throw new Error('Clipboard unavailable');
            await clipboard.writeText(code.text);
            feedback.textContent = t.copied;
          } catch {
            feedback.textContent = t.copyFallback;
            const existing = card.querySelector('textarea');
            const fallback = existing ?? node('textarea');
            fallback.value = code.text;
            fallback.readOnly = true;
            fallback.setAttribute('aria-label', t.raw);
            fallback.rows = 4;
            if (!existing) card.append(fallback);
            fallback.focus();
            fallback.select();
          }
        })();
      }),
      action(t.download, () => {
        download(
          code.text,
          'qr-' + String(index + 1) + '.txt',
          'text/plain;charset=utf-8',
        );
      }),
    );
    card.append(row, feedback);
    if (parsed.link) {
      const link = node(
        'a',
        t.openLink,
        'button button-secondary result-action',
      );
      link.href = parsed.link;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.referrerPolicy = 'no-referrer';
      card.append(link, node('p', t.linkWarning, 'small muted'));
    }
    if (parsed.unsafe) card.append(node('p', t.unsafeLink, 'small muted'));
    const extra = extraMetadata(code.extra);
    const boolean = (value: boolean): string => (value ? t.yes : t.no);
    const version = metadataValue(extra['Version']);
    const grid =
      code.symbolWidth > 0 && code.symbolHeight > 0
        ? String(code.symbolWidth) + ' × ' + String(code.symbolHeight)
        : (code.format === 'QRCode' || code.format === 'QRCodeModel2') &&
            /^\d+$/u.test(version) &&
            Number(version) >= 1 &&
            Number(version) <= 40
          ? String(17 + 4 * Number(version)) +
            ' × ' +
            String(17 + 4 * Number(version))
          : t.unknown;
    const technical: [CopyKey, string][] = [
      ['variant', code.format],
      ['version', version],
      ['grid', grid],
      ['correction', metadataValue(extra['ECLevel'])],
      ['mask', metadataValue(extra['DataMask'])],
      ['rotation', String(code.rotation) + '°'],
      ['mirror', boolean(code.mirrored)],
      ['inverted', boolean(code.inverted)],
      ['encoding', code.contentType + ' - ECI ' + boolean(code.hasECI)],
      ['identifier', code.identifier],
      [
        'append',
        code.sequenceSize < 0
          ? t.no
          : String(code.sequenceIndex + 1) +
            ' - ' +
            String(code.sequenceSize) +
            ' - ' +
            code.sequenceId,
      ],
      ['position', JSON.stringify(code.position)],
      ['pixels', String(next.width) + ' × ' + String(next.height)],
      ['duration', next.duration.toFixed(1) + ' ms'],
      ['decoder', 'ZXing WebAssembly ' + next.decoderVersion],
      ['bytes', hex(code.bytes)],
      ['bytesECI', hex(code.bytesECI)],
    ];
    const technicalDetail = disclosure(t.technical, [
      node('p', t.technicalHelp, 'small muted'),
      table(
        technical.map(([key, value]) => [t[key], value]),
        'technical-fields',
      ),
      disclosure(t.metadata, [scrollableText(code.extra || '{}', t.metadata)]),
    ]);
    if (parsed.sensitive)
      technicalDetail.append(node('p', t.sensitiveHelp, 'small muted'));
    card.append(technicalDetail);
    results.append(card);
  }
}
file.addEventListener('change', () => {
  const chosen = file.files?.[0];
  if (chosen) acceptImage(chosen, chosen.name);
  file.value = '';
});
element('#choose', HTMLButtonElement).addEventListener('click', () => {
  file.click();
});
dropzone.addEventListener('click', (event) => {
  if (event.target instanceof Element && event.target.closest('button')) return;
  pasteField.focus();
});
element('#paste', HTMLButtonElement).addEventListener('click', () => {
  void (async () => {
    const pasteGeneration = generation;
    try {
      const clipboard = clipboardAPI();
      if (!clipboard?.read) throw new ScanError('clipboardDenied');
      const items = await clipboard.read();
      if (pasteGeneration !== generation) return;
      for (const item of items) {
        const type = item.types.find((value) => value.startsWith('image/'));
        if (type) {
          const blob = await item.getType(type);
          if (pasteGeneration !== generation) return;
          acceptImage(blob, t.paste);
          return;
        }
      }
      throw new ScanError('clipboardEmpty');
    } catch (error) {
      if (pasteGeneration !== generation) return;
      showError(
        'image',
        error instanceof ScanError ? error.reason : 'clipboardDenied',
      );
    }
  })();
});
window.addEventListener('paste', (event) => {
  const items = [...(event.clipboardData?.items ?? [])];
  const image = items
    .find((item) => item.kind === 'file' && item.type.startsWith('image/'))
    ?.getAsFile();
  if (image) {
    event.preventDefault();
    acceptImage(image, t.paste);
    return;
  }
  const target = event.target;
  if (
    target instanceof HTMLInputElement ||
    (target instanceof HTMLTextAreaElement && target !== pasteField) ||
    (target instanceof HTMLElement && target.isContentEditable)
  )
    return;
  const text = event.clipboardData?.getData('text/plain') ?? '';
  if (target === pasteField) {
    event.preventDefault();
    pasteField.value = '';
  }
  if (/^https?:\/\//iu.test(text.trim())) {
    event.preventDefault();
    urlInput.value = text.trim();
    element('#url-section', HTMLDetailsElement).open = true;
    urlInput.focus();
    showError('url', null);
  } else if (target === pasteField && text.trim())
    showError('image', 'clipboardEmpty');
});
pasteField.addEventListener('input', () => {
  const value = pasteField.value.trim();
  pasteField.value = '';
  if (/^https?:\/\//iu.test(value)) {
    urlInput.value = value;
    element('#url-section', HTMLDetailsElement).open = true;
    urlInput.focus();
    showError('url', null);
  } else if (value) showError('image', 'clipboardEmpty');
});
for (const name of ['dragenter', 'dragover'] as const)
  dropzone.addEventListener(name, (event) => {
    event.preventDefault();
    dropzone.dataset['drag'] = 'true';
  });
dropzone.addEventListener('dragleave', () => {
  dropzone.dataset['drag'] = 'false';
});
dropzone.addEventListener('drop', (event) => {
  event.preventDefault();
  dropzone.dataset['drag'] = 'false';
  const chosen = event.dataTransfer?.files[0];
  if (chosen) acceptImage(chosen, chosen.name);
});
element('#url-form', HTMLFormElement).addEventListener('submit', (event) => {
  event.preventDefault();
  const id = begin();
  const controller = new AbortController();
  request = controller;
  const timer = window.setTimeout(() => {
    controller.abort();
  }, 15_000);
  void (async () => {
    try {
      busy(true, t.scanning);
      const blob = await fetchImage(urlInput.value, controller.signal);
      if (id === generation) await readImage(blob, t.urlTitle, id, 'url');
    } catch (error) {
      if (id === generation) {
        showError('url', reason(error));
        busy(false);
      }
    } finally {
      window.clearTimeout(timer);
      if (request === controller) request = null;
    }
  })();
});
urlInput.addEventListener('input', () => {
  showError('url', null);
  if (request) {
    cancel();
    busy(false);
  }
});

async function cameraFrame(id: number): Promise<void> {
  if (id !== generation || !stream) return;
  try {
    if (video.readyState >= 2 && video.videoWidth > 0) {
      const next = await runWorker(
        canvasPixels(video, video.videoWidth, video.videoHeight),
      );
      if (id !== generation) return;
      if (next.codes.length) {
        stopTracks();
        showReport(next);
        return;
      }
    }
    if (id === generation && cameraActive())
      cameraTimer = window.setTimeout(() => {
        void cameraFrame(id);
      }, 300);
  } catch (error) {
    if (id === generation) {
      stopTracks();
      showError(
        'camera',
        error instanceof ScanError ? error.reason : 'cameraFailed',
      );
      busy(false);
    }
  }
}
async function openCamera(): Promise<void> {
  const id = begin();
  const devices = mediaAPI();
  if (!devices?.getUserMedia) {
    showError('camera', 'cameraUnavailable');
    return;
  }
  startCamera.disabled = true;
  stopCamera.disabled = false;
  try {
    const facing =
      document.querySelector<HTMLInputElement>('input[name="camera"]:checked')
        ?.value ?? 'environment';
    const next = await devices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: facing },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
    if (id !== generation) {
      for (const track of next.getTracks()) track.stop();
      return;
    }
    stream = next;
    video.srcObject = stream;
    cameraPreview.hidden = false;
    const track = stream.getVideoTracks()[0];
    element('#camera-label', HTMLElement).textContent =
      t.cameraActual + ' - ' + (track?.label || t.unknown);
    await video.play();
    if (id !== generation) return;
    busy(true, t.watching);
    await cameraFrame(id);
  } catch (error) {
    if (id !== generation) return;
    stopTracks();
    const name = error instanceof Error ? error.name : '';
    showError(
      'camera',
      name === 'NotAllowedError' || name === 'SecurityError'
        ? 'cameraDenied'
        : name === 'NotFoundError' || name === 'OverconstrainedError'
          ? 'cameraMissing'
          : 'cameraFailed',
    );
    busy(false);
  }
}
startCamera.addEventListener('click', () => {
  cameraSection.open = true;
  startCamera.setAttribute('aria-expanded', 'true');
  void openCamera();
});
stopCamera.addEventListener('click', () => {
  cancel();
  busy(false, t.stopped);
});
for (const choice of document.querySelectorAll<HTMLInputElement>(
  'input[name="camera"]',
))
  choice.addEventListener('change', () => {
    if (stream || startCamera.disabled) void openCamera();
  });
element('#camera-section', HTMLDetailsElement).addEventListener(
  'toggle',
  () => {
    startCamera.setAttribute('aria-expanded', String(cameraSection.open));
    if (
      !element('#camera-section', HTMLDetailsElement).open &&
      (stream || startCamera.disabled)
    ) {
      cancel();
      busy(false, t.stopped);
    }
  },
);
element('#clear', HTMLButtonElement).addEventListener('click', () => {
  begin();
  worker?.terminate();
  worker = null;
  urlInput.value = '';
  file.value = '';
  busy(false, t.cleared);
});
downloadResults.addEventListener('click', () => {
  if (report)
    download(
      JSON.stringify(report, null, 2),
      'qr-results.json',
      'application/json',
    );
});
function leave(): void {
  cancel();
  worker?.terminate();
  worker = null;
  discardPreview();
  discardResults();
  busy(false);
}
window.addEventListener('pagehide', leave);
document.addEventListener('visibilitychange', () => {
  if (document.hidden && (stream || startCamera.disabled)) {
    cancel();
    busy(false, t.stopped);
  }
});
for (const control of root.querySelectorAll<
  | HTMLButtonElement
  | HTMLInputElement
  | HTMLFieldSetElement
  | HTMLTextAreaElement
>('button[disabled], input[disabled], fieldset[disabled], textarea[disabled]'))
  control.disabled = false;
stopCamera.disabled = true;
downloadResults.disabled = true;
root.dataset['ready'] = 'true';
