import { useState } from 'react';
import FileDropzone from '../../../components/FileDropzone';
import Button from '../../../components/Button';
import DownloadButton from '../../../components/DownloadButton';
import ErrorMessage from '../../../components/ErrorMessage';
import ProgressBar from '../../../components/ProgressBar';
import FormatBadge from '../../../components/FormatBadge';
import {
  decodeAudioFile,
  audioBufferToWavBlob,
  encodeBufferCompressed,
  extensionForMime,
  formatDuration,
  pickCompressedMimeType,
} from '../../../lib/audioUtils';

const INPUT_LABELS: Record<string, string> = {
  'audio/wav': 'WAV', 'audio/x-wav': 'WAV', 'audio/mpeg': 'MP3', 'audio/mp3': 'MP3',
  'audio/ogg': 'OGG', 'audio/webm': 'WebM', 'audio/mp4': 'M4A/AAC', 'audio/aac': 'AAC',
  'audio/flac': 'FLAC', 'audio/x-flac': 'FLAC',
};
function detectAudioLabel(file: File): string {
  if (INPUT_LABELS[file.type]) return INPUT_LABELS[file.type];
  const ext = file.name.split('.').pop()?.toUpperCase();
  return ext || file.type || 'Unknown';
}

export default function AudioConvertTool() {
  const [file, setFile] = useState<File | null>(null);
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [format, setFormat] = useState<'wav' | 'compressed'>('wav');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; name: string } | null>(null);

  const compressedSupported = Boolean(pickCompressedMimeType());

  async function handleFile(files: File[]) {
    const f = files[0];
    setFile(f);
    setResult(null);
    setError(null);
    setBuffer(null);
    try {
      setBuffer(await decodeAudioFile(f));
    } catch {
      setError('Could not decode this audio file. Try a WAV, MP3 or OGG file.');
    }
  }

  async function convert() {
    if (!file || !buffer) return;
    setBusy(true);
    setError(null);
    setProgress(0);
    try {
      const base = file.name.replace(/\.[^.]+$/, '');
      if (format === 'wav') {
        const blob = audioBufferToWavBlob(buffer);
        setResult({ url: URL.createObjectURL(blob), name: `${base}.wav` });
      } else {
        const mimeType = pickCompressedMimeType();
        if (!mimeType) throw new Error('This browser doesn\u2019t support compressed audio export.');
        const blob = await encodeBufferCompressed(buffer, { onProgress: setProgress });
        setResult({ url: URL.createObjectURL(blob), name: `${base}.${extensionForMime(mimeType)}` });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not convert this audio file.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {!file ? (
        <FileDropzone accept="audio/*" onFiles={handleFile} hint="WAV, MP3, OGG or M4A" />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-paper-dim p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate">{file.name}{buffer && ` · ${formatDuration(buffer.duration)}`}</span>
            <FormatBadge label={detectAudioLabel(file)} />
          </div>
          <button onClick={() => { setFile(null); setBuffer(null); setResult(null); }} className="text-xs font-medium text-workshop hover:underline">Remove</button>
        </div>
      )}

      {buffer && (
        <>
          <div className="flex gap-1 rounded-md border border-line bg-paper-dim p-1 text-xs font-medium">
            <button onClick={() => setFormat('wav')} className={`flex-1 rounded px-3 py-1.5 ${format === 'wav' ? 'bg-ink text-paper' : 'text-ink/60'}`}>
              WAV (lossless, instant)
            </button>
            <button
              onClick={() => setFormat('compressed')}
              disabled={!compressedSupported}
              className={`flex-1 rounded px-3 py-1.5 disabled:opacity-40 ${format === 'compressed' ? 'bg-ink text-paper' : 'text-ink/60'}`}
            >
              WebM / Opus (smaller)
            </button>
          </div>
          {format === 'compressed' && (
            <p className="text-xs text-ink/50">
              This plays the audio through the browser's built-in encoder in real time, so it takes about
              {' '}{formatDuration(buffer.duration)} to finish.
            </p>
          )}
          {!compressedSupported && (
            <p className="text-xs text-warn">This browser doesn't support compressed audio recording, so only WAV is available.</p>
          )}
          <Button onClick={convert} disabled={busy}>{busy ? 'Converting…' : 'Convert'}</Button>
          {busy && format === 'compressed' && <ProgressBar value={progress * 100} label="Encoding" />}
        </>
      )}
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {result && (
        <div className="flex items-center justify-between rounded-md border border-line bg-paper-dim p-3">
          <span className="text-sm">{result.name}</span>
          <DownloadButton url={result.url} filename={result.name} />
        </div>
      )}
    </div>
  );
}
