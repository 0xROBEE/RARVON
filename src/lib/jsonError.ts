import { tr } from './i18n';

/**
 * Where JSON stops being valid, as a character index: a small strict scanner,
 * because browsers don't always say where (Chrome's messages often don't).
 */
export function jsonErrorIndex(s: string): number {
  let i = 0;
  const ws = () => { while (i < s.length && ' \t\n\r'.includes(s[i])) i++; };
  const fail = (): never => { throw i; };
  const literal = (word: string) => { if (s.startsWith(word, i)) i += word.length; else fail(); };
  function string() {
    i++; // opening quote
    while (i < s.length && s[i] !== '"') {
      if (s.charCodeAt(i) < 0x20) fail();
      if (s[i] === '\\') {
        i++;
        if (s[i] === 'u') {
          if (!/^[0-9a-fA-F]{4}$/.test(s.slice(i + 1, i + 5))) fail();
          i += 4;
        } else if (!'"\\/bfnrt'.includes(s[i] ?? 'x')) fail();
      }
      i++;
    }
    if (s[i] !== '"') fail();
    i++;
  }
  function number() {
    const m = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/.exec(s.slice(i));
    if (!m) fail();
    i += m![0].length;
  }
  function value() {
    ws();
    const c = s[i];
    if (c === '{') {
      i++; ws();
      if (s[i] === '}') { i++; return; }
      for (;;) {
        ws();
        if (s[i] !== '"') fail();
        string(); ws();
        if (s[i] !== ':') fail();
        i++;
        value(); ws();
        if (s[i] === ',') { i++; continue; }
        if (s[i] === '}') { i++; return; }
        fail();
      }
    }
    if (c === '[') {
      i++; ws();
      if (s[i] === ']') { i++; return; }
      for (;;) {
        value(); ws();
        if (s[i] === ',') { i++; continue; }
        if (s[i] === ']') { i++; return; }
        fail();
      }
    }
    if (c === '"') return string();
    if (c === 't') return literal('true');
    if (c === 'f') return literal('false');
    if (c === 'n') return literal('null');
    if (c === '-' || (c >= '0' && c <= '9')) return number();
    fail();
  }
  try {
    value();
    ws();
    return i < s.length ? i : -1;
  } catch (at) {
    return typeof at === 'number' ? Math.min(at, s.length) : -1;
  }
}

/** A JSON parse error as "Invalid JSON: line 2, column 7". */
export function jsonError(_e: unknown, input: string): string {
  const at = jsonErrorIndex(input);
  if (at < 0) return tr('Invalid JSON');
  const before = input.slice(0, at);
  const line = before.split('\n').length;
  const col = before.length - before.lastIndexOf('\n');
  return tr('Invalid JSON: line {l}, column {c}', { l: line, c: col });
}
