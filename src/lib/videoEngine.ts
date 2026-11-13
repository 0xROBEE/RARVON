import {
  Input, Output, Conversion, BlobSource, BufferTarget,
  MP4, WEBM, Mp4OutputFormat, WebMOutputFormat,
  canEncodeVideo, canEncode,
  QUALITY_HIGH, QUALITY_MEDIUM, QUALITY_LOW,
} from 'mediabunny';
import type { VideoCodec } from 'mediabunny';

export type OutputContainer = 'mp4' | 'webm';

const FILE_SIZE_CEILING = 250 * 1024 * 1024; // 250MB — see VIDEO_ARCHITECTURE.md §7 for why

export function checkFileSize(file: File): string | null {
  if (file.size > FILE_SIZE_CEILING) {
    return `This file is ${(file.size / (1024 * 1024)).toFixed(0)}MB, above the ${FILE_SIZE_CEILING / (1024 * 1024)}MB limit for in-browser video processing. Very large files risk crashing the tab, since the whole file has to fit in memory. Try a shorter clip or a lower-resolution export first.`;
  }
  return null;
}

export interface VideoCapabilities {
  mp4H264: boolean;
  webmVp9: boolean;
}

let cachedCapabilities: VideoCapabilities | null = null;

/** Tests actual encode support on this browser/device — never assumed. */
export async function detectVideoCapabilities(): Promise<VideoCapabilities> {
  if (cachedCapabilities) return cachedCapabilities;
  const [mp4H264, webmVp9] = await Promise.all([
    canEncodeVideo('avc').catch(() => false),
    canEncodeVideo('vp9').catch(() => false),
  ]);
  cachedCapabilities = { mp4H264, webmVp9 };
  return cachedCapabilities;
}

export async function canEncodeAac(): Promise<boolean> {
  try {
    return await canEncode('aac');
  } catch {
    return false;
  }
}

export interface VideoInfo {
  durationSec: number;
  width: number;
  height: number;
  hasAudio: boolean;
  container: OutputContainer | null;
}

function makeInput(file: File): Input {
  return new Input({ source: new BlobSource(file), formats: [MP4, WEBM] });
}

export async function probeVideo(file: File): Promise<VideoInfo> {
  const input = makeInput(file);
  const canRead = await input.canRead();
  if (!canRead) {
    throw new Error("This browser couldn't read this file as MP4 or WebM. Other video containers aren't supported yet — see the tool's FAQ for why.");
  }
  const format = await input.getFormat();
  const container: OutputContainer | null = format === MP4 ? 'mp4' : format === WEBM ? 'webm' : null;
  const [videoTracks, audioTracks, duration] = await Promise.all([
    input.getVideoTracks(),
    input.getAudioTracks(),
    input.computeDuration(),
  ]);
  const track = videoTracks[0];
  if (!track) throw new Error("This file doesn't have a video track.");
  const [width, height] = await Promise.all([track.getCodedWidth(), track.getCodedHeight()]);
  return { durationSec: duration, width, height, hasAudio: audioTracks.length > 0, container };
}

function outputFormatFor(container: OutputContainer) {
  return container === 'mp4' ? new Mp4OutputFormat() : new WebMOutputFormat();
}
export function videoCodecFor(container: OutputContainer): VideoCodec {
  return container === 'mp4' ? 'avc' : 'vp9';
}

export interface RunConversionOptions {
  container: OutputContainer;
  /** Only set this when the tool's whole purpose is a codec/container change
   * (the Convert tool). Leaving it unset for Trim/Resize/Compress lets
   * Mediabunny copy the existing encoded stream directly whenever it can,
   * instead of forcing an unnecessary re-encode. */
  forceVideoCodec?: VideoCodec;
  trim?: { start?: number; end?: number };
  resize?: { width: number; height: number };
  quality?: 'high' | 'medium' | 'low';
  onProgress?: (fraction: number) => void;
}

const QUALITY_MAP = { high: QUALITY_HIGH, medium: QUALITY_MEDIUM, low: QUALITY_LOW };

export async function runVideoConversion(file: File, options: RunConversionOptions): Promise<Blob> {
  const input = makeInput(file);
  const canRead = await input.canRead();
  if (!canRead) {
    throw new Error("This browser couldn't read this file as MP4 or WebM.");
  }

  const target = new BufferTarget();
  const output = new Output({ format: outputFormatFor(options.container), target });

  const needsVideoOptions = Boolean(options.forceVideoCodec || options.resize || options.quality);
  const needsAudioOptions = Boolean(options.quality);

  const conversion = await Conversion.init({
    input,
    output,
    video: needsVideoOptions ? {
      codec: options.forceVideoCodec,
      width: options.resize?.width,
      height: options.resize?.height,
      fit: options.resize ? 'contain' : undefined,
      quality: options.quality ? QUALITY_MAP[options.quality] : undefined,
    } : undefined,
    audio: needsAudioOptions ? {
      quality: options.quality ? QUALITY_MAP[options.quality] : undefined,
    } : undefined,
    trim: options.trim,
  });

  if (!conversion.isValid) {
    throw new Error("This video couldn't be converted with the current settings — it may use a codec this browser can't decode.");
  }

  conversion.onProgress = (fraction) => options.onProgress?.(fraction);
  await conversion.execute();

  if (!target.buffer) throw new Error('Conversion finished but produced no output.');
  return new Blob([target.buffer], { type: options.container === 'mp4' ? 'video/mp4' : 'video/webm' });
}
