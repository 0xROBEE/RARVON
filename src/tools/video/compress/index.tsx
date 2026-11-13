import { useState } from 'react';
import FileDropzone from '../../../components/FileDropzone';
import Button from '../../../components/Button';
import DownloadButton from '../../../components/DownloadButton';
import ErrorMessage from '../../../components/ErrorMessage';
import ProgressBar from '../../../components/ProgressBar';
import { formatDuration } from '../../../lib/audioUtils';
import { formatBytes } from '../../../lib/imageUtils';
import { probeVideo, runVideoConversion, checkFileSize } from '../../../lib/videoEngine';
import type { VideoInfo } from '../../../lib/videoEngine';

const LEVELS = [
  { value: 'high' as const, label: 'High quality — smaller savings' },
  { value: 'medium' as const, label: 'Balanced' },
  { value: 'low' as const, label: 'Smallest file — visible quality loss' },
];

export default function VideoCompressTool() {
  const [file, setFile] = useState<File | null>(null);
  const [info, setInfo] = useState<VideoInfo | null>(null);
  const [level, setLevel] = useState<'high' | 'medium' | 'low'>('medium');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ url: string; name: string; size: number } | null>(null);

  async function handleFile(files: File[]) {
    const f = files[0];
    setResult(null);
    setError(null);
    setInfo(null);
    const sizeError = checkFileSize(f);
    if (sizeError) {
      setError(sizeError);
      return;
    }
    try {
      const probed = await probeVideo(f);
      setFile(f);
      setInfo(probed);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open this video.');
    }
  }

  async function compress() {
    if (!file || !info || !info.container) return;
    setBusy(true);
    setError(null);
    setProgress(0);
    try {
      const blob = await runVideoConversion(file, {
        container: info.container,
        quality: level,
        onProgress: setProgress,
      });
      const base = file.name.replace(/\.[^.]+$/, '');
      setResult({ url: URL.createObjectURL(blob), name: `${base}-compressed.${info.container}`, size: blob.size });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not compress this video.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {!file ? (
        <FileDropzone accept="video/mp4,video/webm" onFiles={handleFile} hint="MP4 or WebM, up to 250MB" />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-paper-dim p-3 text-sm">
          <span className="truncate">
            {file.name} · {formatBytes(file.size)}
            {info && ` · ${info.width}×${info.height} · ${formatDuration(info.durationSec)}`}
          </span>
          <button onClick={() => { setFile(null); setInfo(null); setResult(null); }} className="text-xs font-medium text-workshop hover:underline">Remove</button>
        </div>
      )}

      {info && (
        <>
          <div className="space-y-1.5">
            {LEVELS.map((l) => (
              <label key={l.value} className="flex items-center gap-2 text-xs text-ink/60">
                <input type="radio" name="video-quality" checked={level === l.value} onChange={() => setLevel(l.value)} />
                {l.label}
              </label>
            ))}
          </div>
          <Button onClick={compress} disabled={busy}>{busy ? 'Compressing…' : 'Compress video'}</Button>
          {busy && <ProgressBar value={progress * 100} label="Re-encoding" />}
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
