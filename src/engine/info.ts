/**
 * The few engine facts every page needs (tool cards, search, the tool page
 * header), kept apart from the engine itself so the home page loads nothing
 * else. Tools that do work import the full engine from `src/engine`.
 */
import type { EngineKind } from './types';

declare global {
  interface Window {
    /** Set by Bench for desktop (the Bench Engine) on the page it serves. */
    __BENCH_APP__?: { version: string; key: string };
  }
}

/** True inside Bench for desktop: the Bench Engine marks the page it serves. */
export function isBenchApp(): boolean {
  return typeof window !== 'undefined' && Boolean(window.__BENCH_APP__);
}

export interface EngineInfo {
  kind: EngineKind;
  /** Largest video file accepted, in bytes (null = no limit). */
  maxVideoBytes: number | null;
  /** Whether tools marked "experimental" show their browser-limits warning. */
  showsBrowserWarnings: boolean;
}

/** The browser engine's facts. (The app's native engine will report its own.) */
export const BROWSER_INFO: EngineInfo = {
  kind: 'browser',
  maxVideoBytes: 250 * 1024 * 1024,
  showsBrowserWarnings: true,
};

export const engineInfo: EngineInfo = BROWSER_INFO;
