import { useSyncExternalStore } from 'react';
import { isBenchApp } from '../engine/info';

/**
 * Settings that only the Rarvon app keeps: favourite tools and the update
 * check. The app's engine saves them in a small file in Rarvon's own data
 * folder on this computer, so they survive updates and clearing the browser.
 * Nothing here is ever sent anywhere. On the website these features are off.
 */
export interface AppPrefs {
  /** Tool keys ("category/slug"), in the order they were starred. */
  favorites: string[];
  /** Ask GitHub (when Rarvon opens and every few hours) whether a newer Rarvon exists. On unless turned off. */
  updateCheck: boolean;
  /** When the last check ran (ms since 1970), and what it found. */
  lastUpdateCheck?: number;
  latestVersion?: string;
  latestUrl?: string;
  /** A version whose notice the user closed, so it isn't shown again. */
  dismissedVersion?: string;
}

const DEFAULTS: AppPrefs = { favorites: [], updateCheck: true };
export const MAX_FAVORITES = 12;

let prefs: AppPrefs = DEFAULTS;
/** The one read of the settings file; everyone who asks waits for the same answer. */
let loading: Promise<AppPrefs> | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

const key = () => window.__BENCH_APP__?.key ?? '';

/** Loads the saved settings once (only inside the app). */
export function loadAppPrefs(): Promise<AppPrefs> {
  if (!isBenchApp()) return Promise.resolve(prefs);
  loading ??= fetch('/__bench/prefs', { headers: { 'X-Rarvon-Key': key() } })
    .then((r) => (r.ok ? r.json() : {}))
    .then((saved: Partial<AppPrefs>) => {
      prefs = {
        ...DEFAULTS,
        ...saved,
        favorites: Array.isArray(saved.favorites) ? saved.favorites.filter((x) => typeof x === 'string').slice(0, MAX_FAVORITES) : [],
        updateCheck: saved.updateCheck !== false,
      };
      notify();
      return prefs;
    })
    .catch(() => prefs);
  return loading;
}

let saving: ReturnType<typeof setTimeout> | undefined;
/** Saves run one after another, so two saves never read the file before the other has written it. */
let queue: Promise<void> = Promise.resolve();
/** Changes made in this window and not saved yet: settings, and stars added (true) or removed (false). */
let pending: Partial<Omit<AppPrefs, 'favorites'>> = {};
const starOps = new Map<string, boolean>();

/**
 * Saves a change: settings straight away, stars a moment later (so quick
 * clicks save once). Each save reads the file first and applies only this
 * window's changes, so two open Rarvon windows never undo each other's
 * favourites or settings.
 */
function scheduleSave(delay: number) {
  if (!isBenchApp()) return;
  clearTimeout(saving);
  saving = setTimeout(() => {
    queue = queue.then(save);
  }, delay);
}

/** Applies stars added or removed to a list of favourites. */
function applyStars(list: string[], ops: Map<string, boolean>) {
  let favorites = list;
  for (const [tool, on] of ops) {
    favorites = favorites.filter((k) => k !== tool);
    if (on) favorites.push(tool);
  }
  return favorites.slice(-MAX_FAVORITES);
}

async function save() {
  const change = pending;
  const ops = new Map(starOps);
  pending = {};
  starOps.clear();
  try {
    const res = await fetch('/__bench/prefs', { headers: { 'X-Rarvon-Key': key() } });
    const base: Partial<AppPrefs> = res.ok ? await res.json() : {};
    const saved = Array.isArray(base.favorites) ? base.favorites.filter((x) => typeof x === 'string') : [];
    const next: AppPrefs = { ...DEFAULTS, ...base, ...change, favorites: applyStars(saved, ops) };
    await fetch('/__bench/prefs', {
      method: 'PUT',
      headers: { 'X-Rarvon-Key': key(), 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    });
    // Show what was saved (including other windows' changes), plus anything clicked meanwhile.
    prefs = { ...next, ...pending, favorites: applyStars(next.favorites, starOps) };
    notify();
  } catch {
    // The engine is closing or busy: the change still shows in this window.
  }
}

/** Changes some settings and saves them. */
export function updateAppPrefs(change: Partial<Omit<AppPrefs, 'favorites'>>) {
  prefs = { ...prefs, ...change };
  pending = { ...pending, ...change };
  notify();
  scheduleSave(0);
}

/** The current settings, re-rendering when they change. */
export function useAppPrefs(): AppPrefs {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      void loadAppPrefs();
      return () => listeners.delete(l);
    },
    () => prefs,
    () => DEFAULTS,
  );
}

export function toggleFavorite(toolKey: string) {
  const on = !prefs.favorites.includes(toolKey);
  prefs = { ...prefs, favorites: on ? [...prefs.favorites, toolKey].slice(-MAX_FAVORITES) : prefs.favorites.filter((k) => k !== toolKey) };
  starOps.set(toolKey, on);
  notify();
  scheduleSave(250);
}

/** True when a version like "0.4.0" is newer than "0.3.0" (numbers compared part by part). */
export function isNewerVersion(candidate: string, current: string): boolean {
  const parts = (v: string) => v.replace(/^v/i, '').split(/[.-]/).slice(0, 3).map((n) => parseInt(n, 10) || 0);
  const a = parts(candidate);
  const b = parts(current);
  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
  }
  return false;
}

/** How often the app asks GitHub: when it opens (if the last check is older than this), and this often while open. */
export const UPDATE_CHECK_EVERY = 3 * 60 * 60 * 1000;

/** Whether it's time to ask GitHub again. */
export function shouldCheckForUpdate(p: Pick<AppPrefs, 'updateCheck' | 'lastUpdateCheck'>, now: number): boolean {
  return p.updateCheck && (!p.lastUpdateCheck || now - p.lastUpdateCheck >= UPDATE_CHECK_EVERY);
}

export interface Release { tag_name?: string; html_url?: string; draft?: boolean; prerelease?: boolean }

/** The published, non-test release with the highest version number, whatever order the list is in. */
export function newestRelease(releases: Release[]): Release | undefined {
  return releases
    .filter((r) => !r.draft && !r.prerelease && r.tag_name)
    .reduce<Release | undefined>((best, r) => (!best || isNewerVersion(r.tag_name!, best.tag_name!) ? r : best), undefined);
}
