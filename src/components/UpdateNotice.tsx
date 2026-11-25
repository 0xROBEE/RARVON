import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { isBenchApp } from '../engine/info';
import { UPDATE_CHECK_EVERY, isNewerVersion, loadAppPrefs, newestRelease, shouldCheckForUpdate, updateAppPrefs, useAppPrefs } from '../lib/appPrefs';
import type { Release } from '../lib/appPrefs';
import { tr } from '../lib/i18n';

/** Where Rarvon's releases are published. */
const RELEASES_API = 'https://api.github.com/repos/0xROBEE/RARVON/releases?per_page=20';

/**
 * When it opens and every few hours, the Rarvon app asks GitHub which version is the newest, and
 * shows a small notice when it is newer than this one. The request carries
 * nothing about you or your files (it is the same as opening a web page), it
 * never downloads or installs anything, and it can be turned off on the
 * Privacy page. The website never checks.
 */
export async function checkForUpdate(force = false) {
  const prefs = await loadAppPrefs();
  if (!prefs.updateCheck || (!force && !shouldCheckForUpdate(prefs, Date.now()))) return;
  try {
    const res = await fetch(RELEASES_API, { headers: { Accept: 'application/vnd.github+json' }, credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!res.ok) return;
    const newest = newestRelease((await res.json()) as Release[]);
    updateAppPrefs({ lastUpdateCheck: Date.now(), latestVersion: newest?.tag_name?.replace(/^v/i, ''), latestUrl: newest?.html_url });
  } catch {
    // Offline or blocked: try again next time Rarvon opens.
  }
}

export default function UpdateNotice() {
  const prefs = useAppPrefs();
  const current = window.__BENCH_APP__?.version ?? '';
  useEffect(() => {
    if (!isBenchApp()) return;
    void checkForUpdate();
    const timer = window.setInterval(() => void checkForUpdate(), UPDATE_CHECK_EVERY);
    return () => window.clearInterval(timer);
  }, []);

  const v = prefs.latestVersion;
  if (!isBenchApp() || !prefs.updateCheck || !v || !current || !isNewerVersion(v, current) || prefs.dismissedVersion === v) return null;
  const url = prefs.latestUrl?.startsWith('https://github.com/') ? prefs.latestUrl : 'https://github.com/0xROBEE/RARVON/releases';

  return (
    <div role="status" className="update-notice border-b border-line" data-testid="update-notice">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2 text-sm sm:px-6">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-workshop text-white" aria-hidden="true">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 20h14" /></svg>
        </span>
        <span className="font-medium">{tr('Rarvon {v} is available.', { v })}</span>
        <span className="text-ink-2">{tr('You have {v}.', { v: current })}</span>
        <a href={url} target="_blank" rel="noreferrer" className="rounded-full bg-workshop px-3 py-1 text-xs font-semibold text-white hover:brightness-110">{tr('Download the update')}</a>
        <Link to="/privacy#updates" className="text-xs text-ink-3 hover:text-ink hover:underline">{tr('Update settings')}</Link>
        <button type="button" onClick={() => updateAppPrefs({ dismissedVersion: v })} aria-label={tr('Hide this notice')} className="ms-auto grid h-7 w-7 place-items-center rounded-full text-ink-3 hover:bg-paper-dim hover:text-ink">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>
    </div>
  );
}
