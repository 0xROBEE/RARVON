/**
 * The engine: everything a tool asks to have done to a file, separated from
 * the tool's screen. The website runs the browser engine (WebCodecs, Web
 * Audio, WebAssembly). The Bench app will run a native engine with the same
 * shape (FFmpeg and friends on the user's own hardware), so every tool page
 * works unchanged in both.
 *
 * Tools import from `src/engine`, never from the engine's internals in
 * `src/lib`, so swapping engines touches no tool code.
 */
import type { AudioInfo, AudioJobOptions, AudioTarget } from '../lib/audioEngine';
import type { GifOptions, RunConversionOptions, VideoInfo } from '../lib/videoEngine';
import type { ExportOptions } from '../lib/videoEditor/exporter';
import type { Project } from '../lib/videoEditor/types';
import type { VideoCodec } from 'mediabunny';

export type EngineKind = 'browser' | 'native';

export interface VideoEngine {
  /** Reads a video's size, length, codecs and container. */
  probe(file: File): Promise<VideoInfo>;
  /** Converts, trims, resizes or compresses a video in one pass. */
  convert(file: File, options: RunConversionOptions): Promise<Blob>;
  /** Turns part of a video into an animated GIF. */
  toGif(file: File, options: GifOptions): Promise<Blob>;
  /** Whether this engine can encode a video codec on this device. */
  canEncode(codec: VideoCodec): Promise<boolean>;
  /** Renders a Video Editor project to a file. */
  exportProject(project: Project, files: Map<string, File>, options: ExportOptions): Promise<Blob>;
}

export interface AudioEngine {
  probe(file: File): Promise<AudioInfo>;
  /** Converts or compresses audio (also pulls the sound out of a video). */
  convert(file: File, options: AudioJobOptions): Promise<{ blob: Blob; extension: string; mime: string; copied: boolean }>;
  /** Which audio formats this engine can write on this device. */
  encodableTargets(): Promise<Set<AudioTarget>>;
  /**
   * Fallback for videos whose container can't be read directly: records the
   * sound while the video plays (browser only; null when not available).
   */
  captureFromVideo: ((file: File, onProgress: (fraction: number) => void) => Promise<Blob>) | null;
}

export interface Engine {
  kind: EngineKind;
  /**
   * Largest video file this engine accepts, in bytes (null = no limit). The
   * browser has to hold the whole file in a tab's memory; the app doesn't.
   */
  maxVideoBytes: number | null;
  /**
   * Whether tools marked "experimental" should show their warning. The
   * warning is about browser limits, so the native engine turns it off.
   */
  showsBrowserWarnings: boolean;
  video: VideoEngine;
  audio: AudioEngine;
}
