export type Lang = 'vi' | 'en';
export interface Point {
  x: number;
  y: number;
}
export interface DecodedCode {
  text: string;
  bytes: number[];
  bytesECI: number[];
  format: string;
  symbology: string;
  contentType: string;
  hasECI: boolean;
  rotation: number;
  mirrored: boolean;
  inverted: boolean;
  identifier: string;
  sequenceSize: number;
  sequenceIndex: number;
  sequenceId: string;
  position: {
    topLeft: Point;
    topRight: Point;
    bottomLeft: Point;
    bottomRight: Point;
  };
  extra: string;
  symbolWidth: number;
  symbolHeight: number;
}
export interface ScanReport {
  codes: DecodedCode[];
  width: number;
  height: number;
  duration: number;
  decoderVersion: string;
  decoderCommit: string;
}
export interface WorkerJob {
  id: number;
  width: number;
  height: number;
  pixels: ArrayBuffer;
}
export type WorkerReply =
  { id: number; ok: true; report: ScanReport } | { id: number; ok: false };
export type Failure =
  | 'fileType'
  | 'fileSize'
  | 'imageSize'
  | 'imageUnreadable'
  | 'noQR'
  | 'timeout'
  | 'decoderFailed'
  | 'invalidURL'
  | 'urlBlocked'
  | 'clipboardDenied'
  | 'clipboardEmpty'
  | 'cameraDenied'
  | 'cameraMissing'
  | 'cameraFailed'
  | 'cameraUnavailable';
export class ScanError extends Error {
  readonly reason: Failure;
  constructor(reason: Failure) {
    super(reason);
    this.name = 'ScanError';
    this.reason = reason;
  }
}
