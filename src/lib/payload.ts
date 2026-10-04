export function hasUnsafeURLCharacter(value: string): boolean {
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code <= 32 || code === 127) return true;
  }
  return false;
}
import type { CopyKey } from './copy.ts';
export interface ContentField {
  label: CopyKey;
  value: string;
  sensitive?: boolean;
}
export interface ParsedContent {
  kind: CopyKey;
  fields: ContentField[];
  sensitive: boolean;
  link: string | null;
  unsafe: boolean;
}
function decode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
export function safeLink(value: string): string | null {
  if (hasUnsafeURLCharacter(value)) return null;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export function escapedFields(value: string): Map<string, string> {
  const parts: string[] = [];
  let part = '';
  let escaped = false;
  for (const char of value) {
    if (escaped) {
      part += char;
      escaped = false;
    } else if (char === '\\') escaped = true;
    else if (char === ';') {
      parts.push(part);
      part = '';
    } else part += char;
  }
  if (escaped) part += '\\';
  if (part) parts.push(part);
  const result = new Map<string, string>();
  for (const item of parts) {
    const colon = item.indexOf(':');
    if (colon > 0)
      result.set(item.slice(0, colon).toUpperCase(), item.slice(colon + 1));
  }
  return result;
}
function field(
  label: CopyKey,
  value: string | null | undefined,
  sensitive = false,
): ContentField[] {
  return value ? [{ label, value, sensitive }] : [];
}
function lines(value: string): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const line of value.replace(/\r?\n[ \t]/gu, '').split(/\r?\n/u)) {
    const separator = line.indexOf(':');
    if (separator < 1) continue;
    const key = (line.slice(0, separator).split(';')[0] ?? '').toUpperCase();
    const values = result.get(key) ?? [];
    values.push(
      line
        .slice(separator + 1)
        .replace(/\\[nN]/gu, '\n')
        .replace(/\\([,;\\])/gu, '$1'),
    );
    result.set(key, values);
  }
  return result;
}
export function parseContent(text: string): ParsedContent {
  const value = text.trim();
  const result: ParsedContent = {
    kind: 'plain',
    fields: [],
    sensitive: false,
    link: null,
    unsafe: false,
  };
  if (/^WIFI:/iu.test(value)) {
    const data = escapedFields(value.slice(5));
    return {
      ...result,
      kind: 'wifi',
      sensitive: true,
      fields: [
        ...field('network', data.get('S')),
        ...field('security', data.get('T')),
        ...field('password', data.get('P'), true),
        ...field('hiddenNetwork', data.get('H')),
      ],
    };
  }
  if (/^otpauth:\/\//iu.test(value)) {
    try {
      const url = new URL(value);
      return {
        ...result,
        kind: 'auth',
        sensitive: true,
        fields: [
          ...field('account', decode(url.pathname.slice(1))),
          ...field('issuer', url.searchParams.get('issuer')),
          ...field('secret', url.searchParams.get('secret'), true),
          ...field('algorithm', url.searchParams.get('algorithm') ?? 'SHA1'),
          ...field('digits', url.searchParams.get('digits') ?? '6'),
          ...field(
            url.hostname === 'hotp' ? 'counter' : 'period',
            url.searchParams.get(
              url.hostname === 'hotp' ? 'counter' : 'period',
            ) ?? (url.hostname === 'hotp' ? '0' : '30'),
          ),
        ],
      };
    } catch {
      return { ...result, kind: 'auth', sensitive: true };
    }
  }
  const link = safeLink(value);
  if (link)
    return { ...result, kind: 'link', link, fields: field('address', value) };
  if (/^mailto:/iu.test(value)) {
    const question = value.indexOf('?');
    const query = new URLSearchParams(
      question < 0 ? '' : value.slice(question + 1),
    );
    return {
      ...result,
      kind: 'email',
      fields: [
        ...field(
          'address',
          decode(value.slice(7, question < 0 ? undefined : question)),
        ),
        ...field('subject', query.get('subject')),
        ...field('message', query.get('body')),
      ],
    };
  }
  if (/^tel:/iu.test(value))
    return {
      ...result,
      kind: 'phone',
      fields: field('phone', decode(value.slice(4))),
    };
  if (/^(sms|smsto):/iu.test(value)) {
    const body = value.slice(value.indexOf(':') + 1);
    const separator = body.search(/[:?]/u);
    const recipient = separator < 0 ? body : body.slice(0, separator);
    const message =
      separator < 0
        ? ''
        : body[separator] === '?'
          ? new URLSearchParams(body.slice(separator + 1)).get('body')
          : body.slice(separator + 1);
    return {
      ...result,
      kind: 'sms',
      fields: [
        ...field('phone', decode(recipient)),
        ...field('message', message),
      ],
    };
  }
  if (/^BEGIN:VCARD/iu.test(value)) {
    const data = lines(value);
    return {
      ...result,
      kind: 'contact',
      fields: [
        ...field(
          'name',
          data.get('FN')?.join('\n') ?? data.get('N')?.join('\n'),
        ),
        ...field('organization', data.get('ORG')?.join('\n')),
        ...field('phone', data.get('TEL')?.join('\n')),
        ...field('email', data.get('EMAIL')?.join('\n')),
        ...field('address', data.get('ADR')?.join('\n')),
      ],
    };
  }
  if (/^MECARD:/iu.test(value)) {
    const data = escapedFields(value.slice(7));
    return {
      ...result,
      kind: 'contact',
      fields: [
        ...field('name', data.get('N')),
        ...field('phone', data.get('TEL')),
        ...field('email', data.get('EMAIL')),
        ...field('address', data.get('ADR')),
      ],
    };
  }
  if (/^geo:/iu.test(value)) {
    const coordinates = value.slice(4).split(/[;?]/u)[0]?.split(',') ?? [];
    return {
      ...result,
      kind: 'location',
      fields: [
        ...field('latitude', coordinates[0]),
        ...field('longitude', coordinates[1]),
      ],
    };
  }
  if (/^BEGIN:(VCALENDAR|VEVENT)/iu.test(value)) {
    const data = lines(value);
    return {
      ...result,
      kind: 'calendar',
      fields: [
        ...field('subject', data.get('SUMMARY')?.join('\n')),
        ...field('starts', data.get('DTSTART')?.join('\n')),
        ...field('ends', data.get('DTEND')?.join('\n')),
        ...field('location', data.get('LOCATION')?.join('\n')),
      ],
    };
  }
  return {
    ...result,
    unsafe: /^(?:javascript|data|file|vbscript|intent|https?):/iu.test(value),
  };
}
export function extraMetadata(extra: string): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(extra);
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}
export const hex = (bytes: number[]): string =>
  bytes.map((byte) => byte.toString(16).padStart(2, '0')).join(' ');
