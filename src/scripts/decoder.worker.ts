import {
  prepareZXingModule,
  readBarcodes,
  ZXING_WASM_VERSION,
  ZXING_CPP_COMMIT,
} from 'zxing-wasm/reader';
import wasmURL from 'zxing-wasm/reader/zxing_reader.wasm?url';
import type { DecodedCode, WorkerJob, WorkerReply } from '../lib/types.ts';
const ready = prepareZXingModule({
  overrides: {
    locateFile: (path: string, prefix: string) =>
      path.endsWith('.wasm') ? wasmURL : prefix + path,
  },
  fireImmediately: true,
});
self.addEventListener('message', (event: MessageEvent<WorkerJob>) => {
  void (async () => {
    const { id, width, height, pixels } = event.data;
    try {
      await ready;
      const start = performance.now();
      const results = await readBarcodes(
        new ImageData(new Uint8ClampedArray(pixels), width, height),
        {
          formats: ['QRCode'],
          tryHarder: true,
          tryRotate: true,
          tryInvert: true,
          maxNumberOfSymbols: 16,
          textMode: 'Plain',
          returnErrors: false,
        },
      );
      const codes: DecodedCode[] = results
        .filter((result) => result.isValid)
        .map((result) => ({
          text: result.text,
          bytes: [...result.bytes],
          bytesECI: [...result.bytesECI],
          format: result.format,
          symbology: result.symbology,
          contentType: result.contentType,
          hasECI: result.hasECI,
          rotation: result.rotation,
          mirrored: result.isMirrored,
          inverted: result.isInverted,
          identifier: result.symbologyIdentifier,
          sequenceSize: result.sequenceSize,
          sequenceIndex: result.sequenceIndex,
          sequenceId: result.sequenceId,
          position: result.position,
          extra: result.extra,
          symbolWidth: result.symbol.width,
          symbolHeight: result.symbol.height,
        }));
      const reply: WorkerReply = {
        id,
        ok: true,
        report: {
          codes,
          width,
          height,
          duration: performance.now() - start,
          decoderVersion: ZXING_WASM_VERSION,
          decoderCommit: ZXING_CPP_COMMIT,
        },
      };
      self.postMessage(reply);
    } catch {
      const reply: WorkerReply = { id, ok: false };
      self.postMessage(reply);
    }
  })();
});
