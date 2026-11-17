import type { Engine } from './types';
import { canEncodeVideoCodec, probeVideo, runVideoConversion, videoToGif } from '../lib/videoEngine';
import { convertAudio, encodableAudioTargets, probeAudio } from '../lib/audioEngine';
import { extractAudioFromVideo } from '../lib/videoAudioCapture';
import { exportProject } from '../lib/videoEditor/exporter';

/** Largest video the browser engine accepts: the whole file has to fit in one tab's memory. */
export const BROWSER_MAX_VIDEO_BYTES = 250 * 1024 * 1024;

const canCapture =
  typeof HTMLVideoElement !== 'undefined' &&
  ('captureStream' in HTMLVideoElement.prototype || 'mozCaptureStream' in HTMLVideoElement.prototype);

/**
 * The engine the website uses: WebCodecs (through Mediabunny) for video and
 * audio, Web Audio for decoding, everything inside the browser tab.
 */
export const browserEngine: Engine = {
  kind: 'browser',
  maxVideoBytes: BROWSER_MAX_VIDEO_BYTES,
  showsBrowserWarnings: true,
  video: {
    probe: probeVideo,
    convert: runVideoConversion,
    toGif: videoToGif,
    canEncode: canEncodeVideoCodec,
    exportProject,
  },
  audio: {
    probe: probeAudio,
    convert: convertAudio,
    encodableTargets: encodableAudioTargets,
    captureFromVideo: canCapture ? extractAudioFromVideo : null,
  },
};
