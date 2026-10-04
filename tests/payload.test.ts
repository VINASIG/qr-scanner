import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseContent,
  safeLink,
  escapedFields,
  extraMetadata,
  hex,
} from '../src/lib/payload.ts';
import { payloads } from './helpers/fixtures.ts';
for (const [name, kind] of [
  ['text', 'plain'],
  ['url', 'link'],
  ['wifi', 'wifi'],
  ['email', 'email'],
  ['phone', 'phone'],
  ['sms', 'sms'],
  ['contact', 'contact'],
  ['location', 'location'],
  ['calendar', 'calendar'],
  ['auth', 'auth'],
] as const)
  void test('Recognizes ' + name, () => {
    assert.equal(parseContent(payloads[name]).kind, kind);
  });
void test('Wi-Fi escaping and private values', () => {
  const parsed = parseContent('WIFI:T:WPA;S:One\\;Two;P:a\\:b\\\\c;;');
  assert(parsed.sensitive);
  assert.equal(
    parsed.fields.find((item) => item.label === 'network')?.value,
    'One;Two',
  );
  assert.equal(
    parsed.fields.find((item) => item.label === 'password')?.value,
    'a:b\\c',
  );
  assert(parsed.fields.find((item) => item.label === 'password')?.sensitive);
});
void test('Auth secrets are private and defaults are visible', () => {
  const parsed = parseContent(payloads.auth);
  assert(parsed.sensitive);
  assert(parsed.fields.find((item) => item.label === 'secret')?.sensitive);
  assert.equal(
    parsed.fields.find((item) => item.label === 'period')?.value,
    '30',
  );
});
for (const value of [
  'javascript:alert(1)',
  'data:text/html,<script>1</script>',
  'file:///test',
  'https://u:p@example.com',
  'https://example.com/\nsecret',
  'not-a-link',
])
  void test('Does not offer an unsafe action ' + value.slice(0, 25), () => {
    assert.equal(safeLink(value), null);
  });
void test('Preserves URL query and encoded bytes', () => {
  assert.equal(
    safeLink('https://example.com/?a=%2F&b=1#x'),
    'https://example.com/?a=%2F&b=1#x',
  );
});
void test('Email fields decode without sending', () => {
  const parsed = parseContent(payloads.email);
  assert.equal(
    parsed.fields.find((item) => item.label === 'message')?.value,
    'A test message',
  );
  assert.equal(parsed.link, null);
});
void test('Contact folding, repeated numbers and original parsing', () => {
  const parsed = parseContent(
    'BEGIN:VCARD\r\nFN:Long\r\n Name\r\nTEL;TYPE=HOME:1\r\nTEL;TYPE=WORK:2\r\nEND:VCARD',
  );
  assert.equal(
    parsed.fields.find((item) => item.label === 'name')?.value,
    'LongName',
  );
  assert.equal(
    parsed.fields.find((item) => item.label === 'phone')?.value,
    '1\n2',
  );
});
void test('Malformed metadata has a safe fallback', () => {
  assert.deepEqual(extraMetadata('{broken'), {});
  assert.deepEqual(extraMetadata('[]'), {});
  assert.equal(extraMetadata('{"DataMask":5}')['DataMask'], 5);
  assert.equal(hex([0, 15, 255]), '00 0f ff');
  assert.equal(escapedFields('S:Test;;').get('S'), 'Test');
});
