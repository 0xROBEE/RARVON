let sharedContext: AudioContext | null = null;
function getAudioContext(): AudioContext {
  if (!sharedContext) sharedContext = new AudioContext();
  return sharedContext;
}

export async function decodeAudioFile(file: File): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer();
  const ctx = getAudioContext();
  // decodeAudioData detaches the buffer in some browsers, so this can only be called once per ArrayBuffer.
  return ctx.decodeAudioData(arrayBuffer.slice(0));
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Encode an AudioBuffer as a 16-bit PCM WAV file. No external library needed. */
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numFrames = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = numFrames * blockAlign;

  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const channelData: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) channelData.push(buffer.getChannelData(ch));

  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channelData[ch][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

/** Return a new AudioBuffer containing only the [startSec, endSec) window of the input. */
export function trimAudioBuffer(buffer: AudioBuffer, startSec: number, endSec: number): AudioBuffer {
  const ctx = getAudioContext();
  const start = Math.max(0, Math.floor(startSec * buffer.sampleRate));
  const end = Math.min(buffer.length, Math.ceil(endSec * buffer.sampleRate));
  const frameCount = Math.max(1, end - start);
  const out = ctx.createBuffer(buffer.numberOfChannels, frameCount, buffer.sampleRate);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    out.getChannelData(ch).set(buffer.getChannelData(ch).subarray(start, end));
  }
  return out;
}

export function pickCompressedMimeType(): string | null {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg'];
  for (const type of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) return type;
  }
  return null;
}

/**
 * Play an AudioBuffer through a MediaStreamDestination and record it with
 * MediaRecorder to produce a compressed (Opus) file. Browsers don't expose
 * an offline/non-realtime lossy audio encoder, so this necessarily takes
 * about as long as the buffer's own duration to run.
 */
export function encodeBufferCompressed(
  buffer: AudioBuffer,
  options: { bitrate?: number; mimeType?: string; onProgress?: (fraction: number) => void } = {},
): Promise<Blob> {
  const mimeType = options.mimeType ?? pickCompressedMimeType();
  if (!mimeType) return Promise.reject(new Error('This browser doesn\u2019t support compressed audio recording.'));

  return new Promise((resolve, reject) => {
    const ctx = getAudioContext();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const dest = ctx.createMediaStreamDestination();
    source.connect(dest);

    const recorder = new MediaRecorder(dest.stream, {
      mimeType,
      audioBitsPerSecond: options.bitrate,
    });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onerror = () => reject(new Error('Recording failed.'));
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));

    const startTime = ctx.currentTime;
    const duration = buffer.duration;
    let raf = 0;
    function tick() {
      const elapsed = ctx.currentTime - startTime;
      options.onProgress?.(Math.min(1, elapsed / duration));
      if (elapsed < duration) raf = requestAnimationFrame(tick);
    }
    if (options.onProgress) raf = requestAnimationFrame(tick);

    source.onended = () => {
      cancelAnimationFrame(raf);
      options.onProgress?.(1);
      recorder.stop();
    };

    recorder.start();
    source.start();
  });
}

export function extensionForMime(mime: string) {
  if (mime.includes('ogg')) return 'ogg';
  return 'webm';
}
