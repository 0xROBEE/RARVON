import { useState } from 'react';
import FileDropzone from '../../../components/FileDropzone';
import Button from '../../../components/Button';
import DownloadButton from '../../../components/DownloadButton';
import ErrorMessage from '../../../components/ErrorMessage';
import ProgressBar from '../../../components/ProgressBar';
import { formatBytes } from '../../../lib/imageUtils';
import {
  decodeAudioFile,
  encodeBufferCompressed,
  extensionForMime,
  formatDuration,
  pickCompressedMimeType,
} from '../../../lib/audioUtils';

const PRESETS = [
  { bitrate: 64_000, label: 'Small (64 kbps) — voice, podcasts' },
  { bitrate: 128_000, label: 'Balanced (128 kbps) — general music' },
  { bitrate: 192_000, label: 'High (192 kbps) — closer to source quality' },
];

export default function AudioCompressTool() {
  const [file, setFile] = useState<File | null>(null);
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [bitrate, setBitrate] = useState(128_000);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; name: string; size: number } | null>(null);

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

  async function compress() {
    if (!file || !buffer) return;
    if (!compressedSupported) {
      setError('This browser doesn\u2019t support compressed audio recording.');
      return;
    }
    setBusy(true);
    setError(null);
    setProgress(0);
    try {
      const mimeType = pickCompressedMimeType()!;
      const blob = await encodeBufferCompressed(buffer, { bitrate, onProgress: setProgress });
      const base = file.name.replace(/\.[^.]+$/, '');
      setResult({ url: URL.createObjectURL(blob), name: `${base}-compressed.${extensionForMime(mimeType)}`, size: blob.size });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not compress this audio file.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {!file ? (
        <FileDropzone accept="audio/*" onFiles={handleFile} hint="WAV, MP3, OGG or M4A" />
      ) : (
        <div className="flex items-center justify-between rounded-md border border-line bg-paper-dim p-3 text-sm">
          <span className="truncate">{file.name} · {formatBytes(file.size)}{buffer && ` · ${formatDuration(buffer.duration)}`}</span>
          <button onClick={() => { setFile(null); setBuffer(null); setResult(null); }} className="text-xs font-medium text-workshop hover:underline">Remove</button>
        </div>
      )}

      {buffer && (
        <>
          <div className="space-y-1.5">
            {PRESETS.map((p) => (
              <label key={p.bitrate} className="flex items-center gap-2 text-xs text-ink/60">
                <input type="radio" name="bitrate" checked={bitrate === p.bitrate} onChange={() => setBitrate(p.bitrate)} />
                {p.label}
              </label>
            ))}
          </div>
          {!compressedSupported && (
            <p className="text-xs text-warn">This browser doesn't support the compressed-audio recording this tool relies on.</p>
          )}
          <p className="text-xs text-ink/50">Runs in real time — about {formatDuration(buffer.duration)} to finish.</p>
          <Button onClick={compress} disabled={busy || !compressedSupported}>{busy ? 'Compressing…' : 'Compress'}</Button>
          {busy && <ProgressBar value={progress * 100} label="Encoding" />}
        </>
      )}
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {result && file && (
        <div className="flex items-center justify-between rounded-md border border-line bg-paper-dim p-3">
          <span className="text-sm">
            {result.name} · {formatBytes(result.size)}
            <span className="ml-1 text-ink/40">
              ({result.size < file.size ? `-${Math.round((1 - result.size / file.size) * 100)}%` : 'no smaller'})
            </span>
          </span>
          <DownloadButton url={result.url} filename={result.name} />
        </div>
      )}
    </div>
  );
}
