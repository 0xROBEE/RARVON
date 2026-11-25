import { describe, expect, it } from 'vitest';
import { UPDATE_CHECK_EVERY, isNewerVersion, newestRelease, shouldCheckForUpdate } from '../../src/lib/appPrefs';

describe('update check version comparison', () => {
  it('compares versions part by part, not as text', () => {
    expect(isNewerVersion('0.3.0', '0.2.0')).toBe(true);
    expect(isNewerVersion('v0.10.0', '0.9.9')).toBe(true);
    expect(isNewerVersion('1.0.0', '0.99.0')).toBe(true);
    expect(isNewerVersion('0.2.1', '0.2.0')).toBe(true);
  });

  it('never calls the same or an older version newer', () => {
    expect(isNewerVersion('0.2.0', '0.2.0')).toBe(false);
    expect(isNewerVersion('v0.2.0', '0.2.0')).toBe(false);
    expect(isNewerVersion('0.1.9', '0.2.0')).toBe(false);
    expect(isNewerVersion('', '0.2.0')).toBe(false);
  });
});

describe('update check timing and picking the newest release', () => {
  const now = Date.UTC(2026, 10, 25, 23, 18);
  it('checks again after a few hours, not only once a day', () => {
    // The owner's case: an old answer (0.3.0) from 19:55, three hours and more ago.
    expect(shouldCheckForUpdate({ updateCheck: true, lastUpdateCheck: Date.UTC(2026, 10, 25, 19, 55) }, now)).toBe(true);
    expect(shouldCheckForUpdate({ updateCheck: true, lastUpdateCheck: now - UPDATE_CHECK_EVERY + 60_000 }, now)).toBe(false);
    expect(shouldCheckForUpdate({ updateCheck: true }, now)).toBe(true);
    expect(shouldCheckForUpdate({ updateCheck: false }, now)).toBe(false);
  });

  it('picks the highest normal release, whatever order GitHub lists them in', () => {
    const list = [
      { tag_name: 'v1.0.0' },
      { tag_name: 'v0.3.0' },
      { tag_name: 'v2.0.1', html_url: 'https://github.com/0xROBEE/RARVON/releases/tag/v2.0.1' },
      { tag_name: 'v10.0.0', prerelease: true },
      { tag_name: 'v9.0.0', draft: true },
      { tag_name: 'v1.10.0' },
    ];
    expect(newestRelease(list)?.tag_name).toBe('v2.0.1');
    expect(newestRelease([])).toBeUndefined();
  });
});

