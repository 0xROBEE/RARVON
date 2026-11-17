/**
 * The few engine facts every page needs (tool cards, search, the tool page
 * header), kept apart from the engine itself so the home page loads nothing
 * else. Tools that do work import the full engine from `src/engine`.
 */
import type { EngineKind } from './types';

/** True inside the Bench desktop app (Tauri puts this object on the page). */
export function isBenchApp(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
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
