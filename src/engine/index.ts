/**
 * The one place that decides which engine Bench runs on. Tools import
 * `engine` and the helpers below from here, never from `src/lib` directly.
 */
import type { Engine } from './types';
import { browserEngine } from './browser';
import { CancelledError } from '../lib/audioEngine';
import { VideoCancelledError } from '../lib/videoEngine';
import { ExportCancelled } from '../lib/videoEditor/exporter';
import { tr } from '../lib/i18n';

export type { Engine, EngineKind, VideoEngine, AudioEngine } from './types';

/** True inside the Bench desktop app (Tauri puts this object on the page). */
export function isBenchApp(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * The engine for this session. The app's native engine plugs in here when it
 * exists; until then the app also uses the browser engine.
 */
export const engine: Engine = browserEngine;

/** True when a job ended because the person pressed Cancel (in any engine). */
export function isCancelled(e: unknown): boolean {
  return e instanceof CancelledError || e instanceof VideoCancelledError || e instanceof ExportCancelled;
}

/** A friendly message when a video is too big for this engine, or null when it's fine. */
export function videoTooBig(file: File): string | null {
  const max = engine.maxVideoBytes;
  if (max === null || file.size <= max) return null;
  const mb = (n: number) => Math.round(n / (1024 * 1024));
  return tr('This file is {size} MB, above the {max} MB limit for video in the browser. The whole file has to fit in the tab’s memory, so very large files can crash it. Try a shorter clip or a lower resolution first.', { size: mb(file.size), max: mb(max) });
}

// Shared lists, types and pure helpers the tools use alongside the engine.
export { AUDIO_TARGETS } from '../lib/audioEngine';
export type { AudioInfo, AudioTarget, AudioTargetInfo, AudioJobOptions } from '../lib/audioEngine';
export { compressionBitrates } from '../lib/videoEngine';
export type { VideoInfo, OutputContainer, WriteContainer, RunConversionOptions, GifOptions } from '../lib/videoEngine';
