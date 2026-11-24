import { describe, expect, it } from 'vitest';
import { jsonError, jsonErrorIndex } from '../../src/lib/jsonError';

describe('JSON error location', () => {
  it('accepts everything JSON.parse accepts', () => {
    for (const ok of ['{}', '[]', '0', '-1.5e+3', '"a\\u00e9\\n"', ' {"a": [1, true, false, null, {"b": "c"}]} ', '"ü مرحبا"']) {
      expect(() => JSON.parse(ok)).not.toThrow();
      expect(jsonErrorIndex(ok)).toBe(-1);
    }
  });

  it('points at the first wrong character', () => {
    expect(jsonErrorIndex('{"a": 1,\n "b": }')).toBe(15);
    expect(jsonErrorIndex('[1, 2,]')).toBe(6);
    expect(jsonErrorIndex("{'a': 1}")).toBe(1);
    expect(jsonErrorIndex('{"a": tru}')).toBe(6);
    expect(jsonErrorIndex('{"a": 1} x')).toBe(9);
    expect(jsonErrorIndex('{"a": 01}')).toBe(7);
    expect(jsonErrorIndex('{"a": 1')).toBe(7);
  });

  it('describes it as a line and column', () => {
    expect(jsonError(null, '{"a": 1,\n "b": }')).toBe('Invalid JSON: line 2, column 7');
    expect(jsonError(null, '[1,]')).toBe('Invalid JSON: line 1, column 4');
  });
});
